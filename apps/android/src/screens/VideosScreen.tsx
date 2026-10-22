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

interface VideosScreenProps {
  onSelectItem: (item: LockerItem) => void;
}

export const VideosScreen: React.FC<VideosScreenProps> = ({ onSelectItem }) => {
  const [videos, setVideos] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchVideos = async () => {
    try {
      const res = await api.getItems({ type: 'video' });
      setVideos(res.items || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handlePickVideo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please enable media library access to pick videos.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const filename = asset.fileName || `video_${Date.now()}.mp4`;
        setUploading(true);
        setProgress(0);

        await api.uploadFile(asset.uri, filename, asset.mimeType || 'video/mp4', {
          title: filename,
          tags: ['video'],
          onProgress: (p) => setProgress(p),
        });

        Alert.alert('Success', 'Video uploaded to cloud locker!');
        fetchVideos();
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Saved Videos</Text>
          <Text style={styles.subtitle}>{videos.length} videos stored</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handlePickVideo} disabled={uploading}>
          <Text style={styles.addBtnText}>+ Upload Video</Text>
        </TouchableOpacity>
      </View>

      {uploading ? (
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>Uploading video... {Math.round(progress * 100)}%</Text>
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
          data={videos}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => onSelectItem(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎥</Text>
              <Text style={styles.emptyTitle}>No Videos Stored</Text>
              <Text style={styles.emptySub}>
                Upload video clips or screen recordings to retrieve or stream on your computer.
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
