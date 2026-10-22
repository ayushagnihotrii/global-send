import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../services/api';
import { LockerItem } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Colors, Spacing, Typography } from '../components/Theme';

interface FavouritesScreenProps {
  onSelectItem: (item: LockerItem) => void;
}

export const FavouritesScreen: React.FC<FavouritesScreenProps> = ({ onSelectItem }) => {
  const [items, setItems] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = async () => {
    try {
      const res = await api.getItems({ favourite: true });
      setItems(res.items || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, []);

  const handleToggleFavourite = async (item: LockerItem) => {
    try {
      await api.toggleFavourite(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update favourite');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Starred Favourites</Text>
        <Text style={styles.subtitle}>{items.length} starred items</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => onSelectItem(item)}
              onToggleFavourite={() => handleToggleFavourite(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyTitle}>No Favourites Yet</Text>
              <Text style={styles.emptySub}>
                Star any text, link, photo, or document to quickly access it here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  title: {
    ...Typography.titleMedium,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  list: {
    padding: Spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
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
  emptySub: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
