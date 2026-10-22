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
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { LockerItem } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Colors, Spacing, Typography } from '../components/Theme';

interface PhotosScreenProps {
  onSelectItem: (item: LockerItem) => void;
}

export const PhotosScreen: React.FC<PhotosScreenProps> = ({ onSelectItem }) => {
  const [photos, setPhotos] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchPhotos = async () => {
    try {
      const res = await api.getItems({ type: 'image' });
      setPhotos(res.items || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please enable photo library access.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.9,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const filename = asset.fileName || `photo_${Date.now()}.jpg`;
        setUploading(true);
        setProgress(0);

        await api.uploadFile(asset.uri, filename, asset.mimeType || 'image/jpeg', {
          title: filename,
          tags: ['photo'],
          onProgress: (p) => setProgress(p),
        });

        Alert.alert('Success', 'Photo uploaded to cloud locker!');
        fetchPhotos();
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Photos & Screenshots</Text>
          <Text style={styles.subtitle}>{photos.length} photos saved</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handlePickPhoto} disabled={uploading}>
          <Text style={styles.addBtnText}>+ Upload Photo</Text>
        </TouchableOpacity>
      </View>

      {uploading ? (
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>Uploading photo... {Math.round(progress * 100)}%</Text>
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
          data={photos}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => onSelectItem(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🖼️</Text>
              <Text style={styles.emptyTitle}>No Photos Yet</Text>
              <Text style={styles.emptySub}>
                Upload screenshots, photos, and images from your phone to retrieve them on your other devices.
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
