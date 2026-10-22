import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { LockerItem } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Colors, Spacing, Typography } from '../components/Theme';

interface SearchScreenProps {
  onBack: () => void;
  onSelectItem: (item: LockerItem) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onBack, onSelectItem }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.getItems({ search: query.trim() });
        setResults(res.items || []);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <View style={styles.container}>
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {/* Top Search Input */}
      <View style={styles.searchBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search texts, questions, links, files..."
          placeholderTextColor={Colors.textMuted}
          autoFocus
          clearButtonMode="while-editing"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Results Header */}
      {query.trim() ? (
        <View style={styles.resultStats}>
          <Text style={styles.resultCount}>
            {loading ? 'Searching...' : `Found ${results.length} item${results.length === 1 ? '' : 's'}`}
          </Text>
        </View>
      ) : null}

      {/* Results List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => onSelectItem(item)}
              onCopyNotice={showToast}
            />
          )}
          ListEmptyComponent={
            query.trim() ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No matching results</Text>
                <Text style={styles.emptySubtitle}>Try searching with different keywords or tags</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💡</Text>
                <Text style={styles.emptyTitle}>Type to Search</Text>
                <Text style={styles.emptySubtitle}>
                  Searches full text, multiline question bodies, filenames, and tags.
                </Text>
              </View>
            )
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
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: 10,
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  resultStats: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  resultCount: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
