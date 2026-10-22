import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { LockerItem } from '../types';
import { api } from '../services/api';
import { Colors, Spacing, Typography } from '../components/Theme';

interface DetailScreenProps {
  item: LockerItem;
  onBack: () => void;
  onItemUpdated: () => void;
  onItemDeleted: () => void;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({
  item,
  onBack,
  onItemUpdated,
  onItemDeleted,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [isFav, setIsFav] = useState(item.isFavourite);
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const textToCopy = item.content || item.title || (item.file ? item.file.originalFilename : '');
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleFav = async () => {
    try {
      const res = await api.toggleFavourite(item.id);
      setIsFav(res.isFavourite);
      onItemUpdated();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update favourite status');
    }
  };

  const handleDelete = () => {
    Alert.alert('Move to Trash', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteItem(item.id);
            onItemDeleted();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleDownloadFile = async () => {
    if (!item.file) return;
    setDownloading(true);
    try {
      const localUri = await api.downloadFile(item.id, item.file.originalFilename);
      Alert.alert('Downloaded', `File saved to device: ${localUri}`);

      // Offer to share/open
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not download file from server');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const textToShare = item.content || item.title || '';
    if (textToShare) {
      await Share.share({ message: textToShare, title: item.title });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleToggleFav}>
            <Text style={[styles.actionIcon, isFav && { color: Colors.warning }]}>
              {isFav ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Text style={styles.actionIcon}>↗</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
            <Text style={[styles.actionIcon, { color: Colors.error }]}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        {item.title ? <Text style={styles.title}>{item.title}</Text> : null}

        {/* Date & Type metadata pill */}
        <View style={styles.metaRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.dateText}>
            Saved on {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        {/* Tags */}
        {item.tags && item.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {item.tags.map((t, i) => (
              <View key={i} style={styles.tagChip}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* File Attachment Card */}
        {item.file ? (
          <View style={styles.fileCard}>
            <View style={styles.fileCardHeader}>
              <Text style={styles.fileIcon}>📎</Text>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName}>{item.file.originalFilename}</Text>
                <Text style={styles.fileMeta}>
                  {formatFileSize(item.file.fileSize)} • {item.file.mimeType}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.downloadBtn, downloading && styles.btnDisabled]}
              onPress={handleDownloadFile}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.downloadBtnText}>⬇ Download File to Device</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Content Box (Preserves newlines and whitespace verbatim) */}
        {item.content ? (
          <View style={styles.contentCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>Content</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAll}>
                <Text style={styles.copyBtnText}>{copied ? '✓ Copied' : '📋 Copy All'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.contentText} selectable>
              {item.content}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 6,
  },
  actionIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 22,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 10,
  },
  typeBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  tagChip: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: Colors.primaryLight,
  },
  fileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  fileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  fileIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  fileMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  downloadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  contentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  copyBtn: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  contentText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 22,
  },
});
