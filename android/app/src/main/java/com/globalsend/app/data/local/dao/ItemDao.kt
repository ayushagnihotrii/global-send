package com.globalsend.app.data.local.dao

import androidx.room.*
import com.globalsend.app.data.local.entity.ItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ItemDao {
    @Query("SELECT * FROM items WHERE deletionStatus IS NULL OR deletionStatus != 'deleted' ORDER BY createdAt DESC")
    fun getAllActiveItems(): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items WHERE isFavourite = 1 AND (deletionStatus IS NULL OR deletionStatus != 'deleted') ORDER BY createdAt DESC")
    fun getFavouriteItems(): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items WHERE type = :type AND (deletionStatus IS NULL OR deletionStatus != 'deleted') ORDER BY createdAt DESC")
    fun getItemsByType(type: String): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items WHERE deletionStatus = 'deleted' ORDER BY deletedAt DESC")
    fun getTrashItems(): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items WHERE id = :id LIMIT 1")
    suspend fun getItemById(id: String): ItemEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<ItemEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItem(item: ItemEntity)

    @Query("DELETE FROM items WHERE id = :id")
    suspend fun deleteItemById(id: String)

    @Query("DELETE FROM items WHERE deletionStatus = 'deleted'")
    suspend fun clearTrash()

    @Query("DELETE FROM items")
    suspend fun clearAll()
}
