import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../services/api';
import { LockerItem } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Colors, Spacing, Typography } from '../components/Theme';

interface HomeScreenProps {
  onSelectItem: (item: LockerItem) => void;
  onOpenComposer: () => void;
  onOpenQuickSave: () => void;
  onOpenSearch: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectItem,
  onOpenComposer,
  onOpenQuickSave,
  onOpenSearch,
}) => {
  const [items, setItems] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.getItems({
        type: activeCategory === 'all' ? undefined : activeCategory,
      });
      setItems(res.items || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [fetchItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleToggleFavourite = async (item: LockerItem) => {
    try {
      const res = await api.toggleFavourite(item.id);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isFavourite: res.isFavourite } : it))
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update favourite status');
    }
  };

  const handleDelete = (item: LockerItem) => {
    Alert.alert('Delete Item', 'Are you sure you want to move this item to trash?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteItem(item.id);
            setItems((prev) => prev.filter((it) => it.id !== item.id));
            showToast('Item moved to trash');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const categories = [
    { key: 'all', label: 'All Items' },
    { key: 'text', label: 'Texts & Notes' },
    { key: 'image', label: 'Photos' },
    { key: 'video', label: 'Videos' },
    { key: 'file', label: 'Documents' },
    { key: 'link', label: 'Links' },
  ];

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toastMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* Header bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appTitle}>Global Send</Text>
          <Text style={styles.appSubtitle}>Universal Cloud Locker</Text>
        </View>
        <TouchableOpacity style={styles.searchIconBtn} onPress={onOpenSearch}>
          <Text style={styles.searchIconText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeCategory === c.key && styles.filterChipActive]}
              onPress={() => setActiveCategory(c.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeCategory === c.key && styles.filterChipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Syncing from cloud...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => onSelectItem(item)}
              onToggleFavourite={() => handleToggleFavourite(item)}
              onDelete={() => handleDelete(item)}
              onCopyNotice={showToast}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>☁️</Text>
              <Text style={styles.emptyTitle}>No saved items</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to save your first text, link, photo, or document.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={onOpenQuickSave} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  toast: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
    elevation: 8,
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  appTitle: {
    ...Typography.titleLarge,
  },
  appSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  searchIconText: {
    fontSize: 18,
  },
  filterBar: {
    paddingVertical: Spacing.sm,
  },
  filterList: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 90,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 34,
    fontWeight: '300',
  },
});
