package com.globalsend.app.ui.screens.vault

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.globalsend.app.GlobalSendApp
import com.globalsend.app.data.model.ItemDto
import com.globalsend.app.data.repository.VaultRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

data class DateGroup(
    val title: String,
    val items: List<ItemDto>
)

class VaultViewModel(
    private val vaultRepository: VaultRepository = GlobalSendApp.instance.vaultRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategory = MutableStateFlow("all")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    val filteredGroupedItems: StateFlow<List<DateGroup>> = combine(
        vaultRepository.activeItems,
        _searchQuery,
        _selectedCategory
    ) { items, query, category ->
        val filtered = items.filter { item ->
            val matchesCategory = when (category) {
                "all" -> true
                "favourite" -> item.isFavourite
                "question" -> item.tags?.contains("question") == true || item.title.contains("question", ignoreCase = true)
                else -> item.type.equals(category, ignoreCase = true)
            }

            val matchesQuery = if (query.isBlank()) true else {
                item.title.contains(query, ignoreCase = true) ||
                        (item.textContent?.contains(query, ignoreCase = true) == true) ||
                        (item.url?.contains(query, ignoreCase = true) == true) ||
                        (item.tags?.any { it.contains(query, ignoreCase = true) } == true)
            }

            matchesCategory && matchesQuery
        }

        groupItemsByDate(filtered)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        refresh()
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setCategory(category: String) {
        _selectedCategory.value = category
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            vaultRepository.refreshItems()
            _isRefreshing.value = false
        }
    }

    fun createTextItem(
        title: String?,
        textContent: String,
        isQuestion: Boolean = false,
        tags: List<String> = emptyList(),
        expirationSeconds: Long = 86400L,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            val result = vaultRepository.createTextItem(title, textContent, isQuestion, tags, expirationSeconds)
            result.onSuccess {
                _toastMessage.value = if (isQuestion) "Saved question to vault" else "Saved note to vault"
                onSuccess()
            }.onFailure {
                _toastMessage.value = it.localizedMessage ?: "Failed to save"
            }
        }
    }

    fun createLinkItem(
        url: String,
        title: String? = null,
        tags: List<String> = emptyList(),
        expirationSeconds: Long = 86400L,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            val result = vaultRepository.createLinkItem(url, title, tags, expirationSeconds)
            result.onSuccess {
                _toastMessage.value = "Saved link to vault"
                onSuccess()
            }.onFailure {
                _toastMessage.value = it.localizedMessage ?: "Failed to save link"
            }
        }
    }

    fun uploadFile(
        file: File,
        mimeType: String,
        title: String? = null,
        tags: List<String> = emptyList(),
        expirationSeconds: Long = 86400L,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            val result = vaultRepository.uploadFile(file, mimeType, title, tags, expirationSeconds)
            result.onSuccess {
                _toastMessage.value = "Uploaded file to vault"
                onSuccess()
            }.onFailure {
                _toastMessage.value = it.localizedMessage ?: "Failed to upload file"
            }
        }
    }

    fun toggleFavourite(id: String) {
        viewModelScope.launch {
            vaultRepository.toggleFavourite(id)
        }
    }

    fun deleteItem(id: String) {
        viewModelScope.launch {
            val result = vaultRepository.deleteItem(id, permanent = false)
            if (result.isSuccess) {
                _toastMessage.value = "Item moved to trash"
            }
        }
    }

    fun copyToClipboard(context: Context, text: String, label: String = "Global Send Item") {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText(label, text)
        clipboard.setPrimaryClip(clip)
        _toastMessage.value = "Copied to clipboard"
    }

    fun clearToast() {
        _toastMessage.value = null
    }

    private fun groupItemsByDate(items: List<ItemDto>): List<DateGroup> {
        val cal = Calendar.getInstance()
        val todayStart = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis

        val yesterdayStart = todayStart - 86400000L
        val weekStart = todayStart - 6 * 86400000L
        val monthStart = todayStart - 30 * 86400000L

        val todayItems = mutableListOf<ItemDto>()
        val yesterdayItems = mutableListOf<ItemDto>()
        val weekItems = mutableListOf<ItemDto>()
        val monthItems = mutableListOf<ItemDto>()
        val olderItems = mutableListOf<ItemDto>()

        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)

        for (item in items) {
            val itemTime = try {
                isoFormat.parse(item.createdAt.take(19))?.time ?: 0L
            } catch (e: Exception) {
                0L
            }

            when {
                itemTime >= todayStart -> todayItems.add(item)
                itemTime >= yesterdayStart -> yesterdayItems.add(item)
                itemTime >= weekStart -> weekItems.add(item)
                itemTime >= monthStart -> monthItems.add(item)
                else -> olderItems.add(item)
            }
        }

        val groups = mutableListOf<DateGroup>()
        if (todayItems.isNotEmpty()) groups.add(DateGroup("Today", todayItems))
        if (yesterdayItems.isNotEmpty()) groups.add(DateGroup("Yesterday", yesterdayItems))
        if (weekItems.isNotEmpty()) groups.add(DateGroup("Earlier This Week", weekItems))
        if (monthItems.isNotEmpty()) groups.add(DateGroup("Earlier This Month", monthItems))
        if (olderItems.isNotEmpty()) groups.add(DateGroup("Older", olderItems))

        return groups
    }
}
