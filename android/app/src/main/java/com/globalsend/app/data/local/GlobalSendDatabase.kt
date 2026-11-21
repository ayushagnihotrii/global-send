package com.globalsend.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.globalsend.app.data.local.dao.ChatDao
import com.globalsend.app.data.local.dao.ItemDao
import com.globalsend.app.data.local.entity.ChatMessageEntity
import com.globalsend.app.data.local.entity.ConversationEntity
import com.globalsend.app.data.local.entity.ItemEntity

@Database(
    entities = [
        ItemEntity::class,
        ConversationEntity::class,
        ChatMessageEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class GlobalSendDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao
    abstract fun chatDao(): ChatDao

    companion object {
        @Volatile
        private var INSTANCE: GlobalSendDatabase? = null

        fun getDatabase(context: Context): GlobalSendDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    GlobalSendDatabase::class.java,
                    "globalsend_db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
