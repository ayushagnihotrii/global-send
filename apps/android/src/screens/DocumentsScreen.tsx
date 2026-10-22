import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../services/api';
import { LockerItem } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Colors, Spacing, Typography } from '../components/Theme';

interface DocumentsScreenProps {
  onSelectItem: (item: LockerItem) => void;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ onSelectItem }) => {
  const [documents, setDocuments] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchDocuments = async () => {
    try {
      const res = await api.getItems({ type: 'file' });
      setDocuments(res.items || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const file = res.assets[0];
        setUploading(true);
        setProgress(0);

        await api.uploadFile(file.uri, file.name, file.mimeType || 'application/octet-stream', {
          title: file.name,
          tags: ['document'],
          onProgress: (p) => setProgress(p),
        });

        Alert.alert('Upload Complete', 'Document saved to your cloud locker!');
        fetchDocuments();
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Documents & Files</Text>
          <Text style={styles.subtitle}>{documents.length} files saved</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handlePickDocument} disabled={uploading}>
          <Text style={styles.addBtnText}>+ Upload File</Text>
        </TouchableOpacity>
      </View>

      {uploading ? (
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>Uploading document... {Math.round(progress * 100)}%</Text>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => onSelectItem(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyTitle}>No Documents Stored</Text>
              <Text style={styles.emptySub}>
                Upload PDFs, archives, office documents, or text files to retrieve on any device.
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  progressBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  track: {
    height: 6,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: Colors.primary,
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
