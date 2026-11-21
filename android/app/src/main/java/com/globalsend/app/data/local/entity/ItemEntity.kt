package com.globalsend.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.globalsend.app.data.model.ItemDto

@Entity(tableName = "items")
data class ItemEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val type: String,
    val title: String?,
    val textContent: String?,
    val url: String?,
    val note: String?,
    val isFavourite: Boolean,
    val expiresAt: String?,
    val expirationDurationSec: Long,
    val isExpired: Boolean,
    val isPermanent: Boolean,
    val parentFolderId: String?,
    val isFolder: Boolean,
    val deletionStatus: String?,
    val deletedAt: String?,
    val createdAt: String?,
    val updatedAt: String?,
    val tagsCsv: String,
    val fileId: String?,
    val filename: String?,
    val mimeType: String?,
    val fileSize: Long?,
    val downloadUrl: String?
) {
    fun toDto(): ItemDto {
        return ItemDto(
            id = id,
            userId = userId,
            type = type,
            title = if (!title.isNullOrBlank()) title else (filename ?: "Untitled"),
            textContent = textContent,
            url = url,
            note = note,
            isFavourite = isFavourite,
            expiresAt = expiresAt,
            expirationDurationSec = expirationDurationSec,
            isExpired = isExpired,
            isPermanent = isPermanent || (expiresAt == null),
            parentFolderId = parentFolderId,
            isFolder = isFolder,
            deletionStatus = deletionStatus,
            deletedAt = deletedAt,
            createdAt = createdAt ?: "",
            updatedAt = updatedAt,
            tags = if (tagsCsv.isBlank()) emptyList() else tagsCsv.split(",").map { it.trim() },
            file = if (fileId != null && filename != null) {
                com.globalsend.app.data.model.FileMetadataDto(
                    id = fileId,
                    itemId = id,
                    originalFilename = filename,
                    mimeType = mimeType ?: "application/octet-stream",
                    fileSize = fileSize ?: 0L,
                    downloadUrl = downloadUrl
                )
            } else null
        )
    }

    companion object {
        fun fromDto(dto: ItemDto): ItemEntity {
            return ItemEntity(
                id = dto.id,
                userId = dto.userId,
                type = dto.type,
                title = dto.title ?: dto.file?.originalFilename ?: "",
                textContent = dto.textContent,
                url = dto.url,
                note = dto.note,
                isFavourite = dto.isFavourite,
                expiresAt = dto.expiresAt,
                expirationDurationSec = dto.expirationDurationSec,
                isExpired = dto.isExpired,
                isPermanent = dto.isPermanent || (dto.expiresAt == null),
                parentFolderId = dto.parentFolderId,
                isFolder = dto.isFolder,
                deletionStatus = dto.deletionStatus,
                deletedAt = dto.deletedAt,
                createdAt = dto.createdAt ?: "",
                updatedAt = dto.updatedAt,
                tagsCsv = dto.tags?.joinToString(",") ?: "",
                fileId = dto.file?.id,
                filename = dto.file?.originalFilename ?: dto.file?.sanitizedFilename,
                mimeType = dto.file?.mimeType,
                fileSize = dto.file?.fileSize,
                downloadUrl = dto.file?.downloadUrl
            )
        }
    }
}
