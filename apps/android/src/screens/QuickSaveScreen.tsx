import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../services/api';
import { Colors, Spacing, Typography } from '../components/Theme';

interface QuickSaveScreenProps {
  onClose: () => void;
  onOpenComposer: () => void;
  onItemCreated: () => void;
}

export const QuickSaveScreen: React.FC<QuickSaveScreenProps> = ({
  onClose,
  onOpenComposer,
  onItemCreated,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Handle Photo Picker
  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to upload photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.fileName || `photo_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        setUploading(true);
        setUploadProgress(0);

        await api.uploadFile(asset.uri, filename, mimeType, {
          title: filename,
          tags: ['photo'],
          onProgress: (p) => setUploadProgress(p),
        });

        Alert.alert('Upload Complete', 'Your photo has been saved to your cloud locker!');
        onItemCreated();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Video Picker
  const handlePickVideo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Media permissions are required to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.fileName || `video_${Date.now()}.mp4`;
        const mimeType = asset.mimeType || 'video/mp4';

        setUploading(true);
        setUploadProgress(0);

        await api.uploadFile(asset.uri, filename, mimeType, {
          title: filename,
          tags: ['video'],
          onProgress: (p) => setUploadProgress(p),
        });

        Alert.alert('Upload Complete', 'Your video has been saved to your cloud locker!');
        onItemCreated();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload video.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Document Picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setUploading(true);
        setUploadProgress(0);

        await api.uploadFile(file.uri, file.name, file.mimeType || 'application/octet-stream', {
          title: file.name,
          tags: ['document'],
          onProgress: (p) => setUploadProgress(p),
        });

        Alert.alert('Upload Complete', 'Your document has been saved to your cloud locker!');
        onItemCreated();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload document.');
    } finally {
      setUploading(false);
    }
  };

  // Save Link
  const handleSaveLink = async () => {
    if (!linkUrl.trim()) return;
    try {
      await api.createLinkItem(linkUrl.trim(), linkTitle.trim() || undefined, ['link']);
      setShowLinkModal(false);
      Alert.alert('Link Saved', 'Web link successfully saved to your cloud locker!');
      onItemCreated();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save link');
    }
  };

  return (
    <View style={styles.sheetContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Save to Cloud</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {uploading ? (
        <View style={styles.progressCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.progressTitle}>Uploading to Global Send...</Text>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{Math.round(uploadProgress * 100)}%</Text>
        </View>
      ) : (
        <View style={styles.optionsGrid}>
          {/* Write Text */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => {
              onClose();
              onOpenComposer();
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#0284C7' }]}>
              <Text style={styles.icon}>✍️</Text>
            </View>
            <Text style={styles.optionLabel}>Text / Question</Text>
            <Text style={styles.optionSub}>Notes, snippets, ideas</Text>
          </TouchableOpacity>

          {/* Save Link */}
          <TouchableOpacity style={styles.optionCard} onPress={() => setShowLinkModal(true)}>
            <View style={[styles.iconCircle, { backgroundColor: '#7C3AED' }]}>
              <Text style={styles.icon}>🔗</Text>
            </View>
            <Text style={styles.optionLabel}>Save Link</Text>
            <Text style={styles.optionSub}>Web links & articles</Text>
          </TouchableOpacity>

          {/* Photo */}
          <TouchableOpacity style={styles.optionCard} onPress={handlePickPhoto}>
            <View style={[styles.iconCircle, { backgroundColor: '#059669' }]}>
              <Text style={styles.icon}>🖼️</Text>
            </View>
            <Text style={styles.optionLabel}>Photo / Screenshot</Text>
            <Text style={styles.optionSub}>From camera roll</Text>
          </TouchableOpacity>

          {/* Video */}
          <TouchableOpacity style={styles.optionCard} onPress={handlePickVideo}>
            <View style={[styles.iconCircle, { backgroundColor: '#D97706' }]}>
              <Text style={styles.icon}>🎥</Text>
            </View>
            <Text style={styles.optionLabel}>Video</Text>
            <Text style={styles.optionSub}>Clips & screen recordings</Text>
          </TouchableOpacity>

          {/* Document */}
          <TouchableOpacity style={styles.optionCard} onPress={handlePickDocument}>
            <View style={[styles.iconCircle, { backgroundColor: '#475569' }]}>
              <Text style={styles.icon}>📄</Text>
            </View>
            <Text style={styles.optionLabel}>Document / File</Text>
            <Text style={styles.optionSub}>PDF, ZIP, DOCX, etc.</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Save Link Modal */}
      <Modal visible={showLinkModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Web Link</Text>
            <Text style={styles.inputLabel}>URL</Text>
            <TextInput
              style={styles.modalInput}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Title (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={linkTitle}
              onChangeText={setLinkTitle}
              placeholder="Descriptive title"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLinkModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveLink}>
                <Text style={styles.modalSaveText}>Save Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.titleMedium,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 20,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  optionSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  progressCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  progressTitle: {
    ...Typography.titleMedium,
    marginTop: 16,
    marginBottom: 16,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressPercent: {
    marginTop: 8,
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalTitle: {
    ...Typography.titleMedium,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: Spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
});
