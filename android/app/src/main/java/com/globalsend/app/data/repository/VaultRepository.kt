package com.globalsend.app.data.repository

import com.globalsend.app.data.api.ApiClient
import com.globalsend.app.data.local.dao.ItemDao
import com.globalsend.app.data.local.entity.ItemEntity
import com.globalsend.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

class VaultRepository(
    private val apiClient: ApiClient,
    private val itemDao: ItemDao
) {
    val activeItems: Flow<List<ItemDto>> = itemDao.getAllActiveItems().map { list ->
        list.map { it.toDto() }
    }

    val favouriteItems: Flow<List<ItemDto>> = itemDao.getFavouriteItems().map { list ->
        list.map { it.toDto() }
    }

    val trashItems: Flow<List<ItemDto>> = itemDao.getTrashItems().map { list ->
        list.map { it.toDto() }
    }

    fun getItemsByType(type: String): Flow<List<ItemDto>> {
        return itemDao.getItemsByType(type).map { list ->
            list.map { it.toDto() }
        }
    }

    suspend fun refreshItems(inTrash: Boolean = false): Result<List<ItemDto>> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().getItems(inTrash = inTrash)
            if (response.isSuccessful && response.body() != null) {
                val items = response.body()!!.items
                val entities = items.map { ItemEntity.fromDto(it) }
                itemDao.insertItems(entities)
                Result.success(items)
            } else {
                val err = response.errorBody()?.string() ?: "Failed to refresh items"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createTextItem(
        title: String?,
        textContent: String,
        isQuestion: Boolean = false,
        tags: List<String> = emptyList(),
        expirationSeconds: Long = 86400L
    ): Result<ItemDto> = withContext(Dispatchers.IO) {
        try {
            val finalTags = if (isQuestion && !tags.contains("question")) {
                tags + "question"
            } else tags

            val response = apiClient.getService().createTextItem(
                CreateTextItemRequest(
                    type = "text",
                    title = title,
                    textContent = textContent,
                    tags = finalTags,
                    expirationSeconds = expirationSeconds
                )
            )
            if (response.isSuccessful && response.body()?.item != null) {
                val item = response.body()!!.item!!
                itemDao.insertItem(ItemEntity.fromDto(item))
                Result.success(item)
            } else {
                val err = response.errorBody()?.string() ?: "Failed to create text note"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createLinkItem(
        url: String,
        title: String? = null,
        tags: List<String> = emptyList(),
        expirationSeconds: Long = 86400L
    ): Result<ItemDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().createLinkItem(
                CreateLinkItemRequest(
                    url = url,
                    title = title,
                    tags = tags,
                    expirationSeconds = expirationSeconds
                )
            )
            if (response.isSuccessful && response.body()?.item != null) {
                val item = response.body()!!.item!!
                itemDao.insertItem(ItemEntity.fromDto(item))
                Result.success(item)
            } else {
                val err = response.errorBody()?.string() ?: "Failed to save link"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadFile(
        file: File,
        mimeType: String,
        title: String? = null,
        tags: List<String> = emptyList(),
        expirationSeconds: Long = 86400L,
        onProgress: ((progressPercent: Int, uploadedBytes: Long, totalBytes: Long, speedBytesPerSec: Long, etaSeconds: Long) -> Unit)? = null
    ): Result<ItemDto> = withContext(Dispatchers.IO) {
        try {
            val totalFileSize = file.length()
            val startTimeMs = System.currentTimeMillis()
            var accumulatedPreviousPartsBytes = 0L

            fun report(currentPartBytes: Long, partTotalBytes: Long) {
                val totalUploadedSoFar = (accumulatedPreviousPartsBytes + currentPartBytes).coerceAtMost(totalFileSize)
                val percent = if (totalFileSize > 0) ((totalUploadedSoFar * 100) / totalFileSize).toInt().coerceIn(1, 99) else 0
                val elapsedSec = (System.currentTimeMillis() - startTimeMs) / 1000.0
                val speedBps = if (elapsedSec > 0.1) (totalUploadedSoFar / elapsedSec).toLong() else 0L
                val remainingBytes = (totalFileSize - totalUploadedSoFar).coerceAtLeast(0L)
                val etaSec = if (speedBps > 0) remainingBytes / speedBps else 0L
                onProgress?.invoke(percent, totalUploadedSoFar, totalFileSize, speedBps, etaSec)
            }

            // 1. High-Speed Direct Telegram Bot API Upload (Sliced into 45MB chunks to stay within bot limits)
            // Bypasses Vercel serverless payload limits & timeouts completely.
            try {
                val directConfigRes = apiClient.getService().getDirectConfig()
                if (directConfigRes.isSuccessful && directConfigRes.body()?.success == true) {
                    val config = directConfigRes.body()!!
                    if (config.provider == "telegram" && config.telegram != null) {
                        val tg = config.telegram
                        val itemId = java.util.UUID.randomUUID().toString()
                        val filename = file.name

                        val directClient = okhttp3.OkHttpClient.Builder()
                            .connectTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                            .readTimeout(300, java.util.concurrent.TimeUnit.SECONDS)
                            .writeTimeout(300, java.util.concurrent.TimeUnit.SECONDS)
                            .build()

                        val sliceSize = 45L * 1024 * 1024 // 45 MB per slice
                        val numParts = if (totalFileSize <= sliceSize) 1 else ((totalFileSize + sliceSize - 1) / sliceSize).toInt()
                        val manifestParts = mutableListOf<String>()

                        val raf = java.io.RandomAccessFile(file, "r")
                        try {
                            for (partIdx in 0 until numParts) {
                                val offset = partIdx * sliceSize
                                val partLength = Math.min(sliceSize, totalFileSize - offset)
                                val buffer = ByteArray(partLength.toInt())
                                raf.seek(offset)
                                raf.readFully(buffer)

                                val partFileName = if (numParts == 1) filename else "$filename.part${partIdx + 1}"
                                val rawBody = buffer.toRequestBody(mimeType.toMediaTypeOrNull())
                                val progressBody = com.globalsend.app.data.api.ProgressRequestBody(rawBody) { written, total ->
                                    report(written, total)
                                }

                                val requestBody = MultipartBody.Builder()
                                    .setType(MultipartBody.FORM)
                                    .addFormDataPart("chat_id", tg.channelId)
                                    .addFormDataPart("document", partFileName, progressBody)
                                    .addFormDataPart(
                                        "caption",
                                        "[Global Send Vault] $filename (part ${partIdx + 1}/$numParts) [Item: $itemId]"
                                    )
                                    .build()

                                val request = okhttp3.Request.Builder()
                                    .url("https://api.telegram.org/bot${tg.botToken}/sendDocument")
                                    .post(requestBody)
                                    .build()

                                val tgResponse = directClient.newCall(request).execute()
                                val responseBodyString = tgResponse.body?.string().orEmpty()
                                if (!tgResponse.isSuccessful) {
                                    throw Exception("Telegram bot error: $responseBodyString")
                                }

                                val json = com.google.gson.JsonParser.parseString(responseBodyString).asJsonObject
                                val resultObj = json.getAsJsonObject("result")
                                val messageId = resultObj?.get("message_id")?.asLong ?: throw Exception("Missing message_id from Telegram response")
                                manifestParts.add("$messageId:$partLength")

                                accumulatedPreviousPartsBytes += partLength
                            }
                        } finally {
                            raf.close()
                        }

                        val encodedName = java.net.URLEncoder.encode(filename, "UTF-8")
                        val encodedMime = java.net.URLEncoder.encode(mimeType, "UTF-8")
                        val partsParam = manifestParts.joinToString(",")
                        val storageKey = "telegram://manifest?channel=${java.net.URLEncoder.encode(tg.channelId, "UTF-8")}&parts=$partsParam&total=$totalFileSize&name=$encodedName&mime=$encodedMime"

                        val confirmRes = apiClient.getService().confirmUpload(
                            ConfirmUploadRequest(
                                itemId = itemId,
                                storageKey = storageKey,
                                originalFilename = filename,
                                mimeType = mimeType,
                                fileSize = totalFileSize,
                                title = title ?: filename,
                                tags = tags,
                                isPermanent = expirationSeconds == 0L,
                                expirationSeconds = expirationSeconds
                            )
                        )

                        if (confirmRes.isSuccessful && confirmRes.body()?.item != null) {
                            val item = confirmRes.body()!!.item!!
                            itemDao.insertItem(ItemEntity.fromDto(item))
                            onProgress?.invoke(100, totalFileSize, totalFileSize, 0L, 0L)
                            return@withContext Result.success(item)
                        }
                    }
                }
            } catch (directErr: Exception) {
                // Fall back to server endpoint if direct telegram call fails
            }

            // 2. Standard server multipart upload fallback
            val rawRequestFile = file.asRequestBody(mimeType.toMediaTypeOrNull())
            val progressFile = com.globalsend.app.data.api.ProgressRequestBody(rawRequestFile) { written, total ->
                report(written, total)
            }
            val filePart = MultipartBody.Part.createFormData("file", file.name, progressFile)
            val titlePart = (title ?: file.name).toRequestBody("text/plain".toMediaTypeOrNull())
            val tagsPart = tags.joinToString(",").toRequestBody("text/plain".toMediaTypeOrNull())
            val expPart = expirationSeconds.toString().toRequestBody("text/plain".toMediaTypeOrNull())

            val response = apiClient.getService().uploadFile(
                file = filePart,
                title = titlePart,
                tags = tagsPart,
                expirationSeconds = expPart
            )

            if (response.isSuccessful && response.body()?.item != null) {
                val item = response.body()!!.item!!
                itemDao.insertItem(ItemEntity.fromDto(item))
                onProgress?.invoke(100, totalFileSize, totalFileSize, 0L, 0L)
                Result.success(item)
            } else {
                val err = response.errorBody()?.string() ?: "Upload failed"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun toggleFavourite(id: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().toggleFavourite(id)
            if (response.isSuccessful) {
                val existing = itemDao.getItemById(id)
                if (existing != null) {
                    itemDao.insertItem(existing.copy(isFavourite = !existing.isFavourite))
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to toggle favourite"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteItem(id: String, permanent: Boolean = false): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().deleteItem(id, permanent = permanent)
            if (response.isSuccessful) {
                if (permanent) {
                    itemDao.deleteItemById(id)
                } else {
                    val existing = itemDao.getItemById(id)
                    if (existing != null) {
                        itemDao.insertItem(existing.copy(deletionStatus = "deleted"))
                    }
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete item"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun restoreItem(id: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().restoreItem(id)
            if (response.isSuccessful) {
                val existing = itemDao.getItemById(id)
                if (existing != null) {
                    itemDao.insertItem(existing.copy(deletionStatus = null))
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to restore item"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun emptyTrash(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().emptyTrash()
            if (response.isSuccessful) {
                itemDao.clearTrash()
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to empty trash"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getStorageUsage(): Result<StorageUsageDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().getStorageUsage()
            if (response.isSuccessful && response.body()?.storage != null) {
                Result.success(response.body()!!.storage!!)
            } else {
                Result.failure(Exception("Failed to get storage quota"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun exportVault(): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().exportVault()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.string())
            } else {
                Result.failure(Exception("Failed to export vault"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
