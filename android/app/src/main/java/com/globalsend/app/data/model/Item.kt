package com.globalsend.app.data.model

import com.google.gson.annotations.SerializedName

data class FileMetadataDto(
    @SerializedName("id") val id: String,
    @SerializedName("itemId") val itemId: String,
    @SerializedName("storageKey") val storageKey: String? = null,
    @SerializedName("originalFilename") val originalFilename: String,
    @SerializedName("sanitizedFilename") val sanitizedFilename: String? = null,
    @SerializedName("mimeType") val mimeType: String,
    @SerializedName("fileSize") val fileSize: Long,
    @SerializedName("storageProvider") val storageProvider: String? = null,
    @SerializedName("uploadStatus") val uploadStatus: String = "completed",
    @SerializedName("downloadUrl") val downloadUrl: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class ItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("type") val type: String,
    @SerializedName("title") val title: String,
    @SerializedName("textContent") val textContent: String? = null,
    @SerializedName("url") val url: String? = null,
    @SerializedName("note") val note: String? = null,
    @SerializedName("isFavourite") val isFavourite: Boolean = false,
    @SerializedName("expiresAt") val expiresAt: String,
    @SerializedName("expirationDurationSec") val expirationDurationSec: Long = 86400L,
    @SerializedName("isExpired") val isExpired: Boolean = false,
    @SerializedName("deletionStatus") val deletionStatus: String? = null,
    @SerializedName("deletedAt") val deletedAt: String? = null,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String? = null,
    @SerializedName("tags") val tags: List<String>? = emptyList(),
    @SerializedName("file") val file: FileMetadataDto? = null
)

data class ItemsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("items") val items: List<ItemDto> = emptyList(),
    @SerializedName("error") val error: String? = null
)

data class SingleItemResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("item") val item: ItemDto? = null,
    @SerializedName("error") val error: String? = null
)

data class CreateTextItemRequest(
    @SerializedName("type") val type: String = "text",
    @SerializedName("title") val title: String? = null,
    @SerializedName("textContent") val textContent: String,
    @SerializedName("note") val note: String? = null,
    @SerializedName("isFavourite") val isFavourite: Boolean = false,
    @SerializedName("tags") val tags: List<String> = emptyList(),
    @SerializedName("expirationSeconds") val expirationSeconds: Long = 86400L
)

data class CreateLinkItemRequest(
    @SerializedName("type") val type: String = "link",
    @SerializedName("title") val title: String? = null,
    @SerializedName("url") val url: String,
    @SerializedName("note") val note: String? = null,
    @SerializedName("isFavourite") val isFavourite: Boolean = false,
    @SerializedName("tags") val tags: List<String> = emptyList(),
    @SerializedName("expirationSeconds") val expirationSeconds: Long = 86400L
)

data class StorageBreakdown(
    @SerializedName("texts") val texts: Int = 0,
    @SerializedName("photos") val photos: Int = 0,
    @SerializedName("videos") val videos: Int = 0,
    @SerializedName("files") val files: Int = 0,
    @SerializedName("links") val links: Int = 0
)

data class StorageUsageDto(
    @SerializedName("usedBytes") val usedBytes: Long = 0L,
    @SerializedName("reservedBytes") val reservedBytes: Long = 0L,
    @SerializedName("limitBytes") val limitBytes: Long = 2147483648L,
    @SerializedName("itemCount") val itemCount: Int = 0,
    @SerializedName("fileCount") val fileCount: Int = 0,
    @SerializedName("breakdown") val breakdown: StorageBreakdown? = null
)

data class StorageUsageResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("storage") val storage: StorageUsageDto? = null,
    @SerializedName("error") val error: String? = null
)
