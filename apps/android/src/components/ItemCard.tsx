import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LockerItem } from '../types';
import { Colors, Spacing, Typography } from './Theme';

interface ItemCardProps {
  item: LockerItem;
  onPress: () => void;
  onToggleFavourite?: () => void;
  onDelete?: () => void;
  onCopyNotice?: (msg: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onPress,
  onToggleFavourite,
  onDelete,
  onCopyNotice,
}) => {
  const handleCopy = async () => {
    const textToCopy = item.content || item.title || (item.file ? item.file.originalFilename : '');
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      if (onCopyNotice) {
        onCopyNotice('Copied complete text to clipboard!');
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeBadge = () => {
    switch (item.type) {
      case 'text':
        return { label: 'TEXT', color: '#38BDF8' };
      case 'link':
        return { label: 'LINK', color: '#A855F7' };
      case 'image':
        return { label: 'PHOTO', color: '#10B981' };
      case 'video':
        return { label: 'VIDEO', color: '#F59E0B' };
      default:
        return { label: 'FILE', color: '#64748B' };
    }
  };

  const badge = getTypeBadge();

  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: `${badge.color}20` }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {item.title ? (
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
      ) : null}

      {item.content ? (
        <Text style={styles.content} numberOfLines={4}>
          {item.content}
        </Text>
      ) : null}

      {item.file ? (
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            📎 {item.file.originalFilename}
          </Text>
          <Text style={styles.fileSize}>{formatFileSize(item.file.fileSize)}</Text>
        </View>
      ) : null}

      {item.tags && item.tags.length > 0 ? (
        <View style={styles.tagsContainer}>
          {item.tags.map((t, i) => (
            <View key={i} style={styles.tagChip}>
              <Text style={styles.tagText}>#{t}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
          <Text style={styles.copyBtnText}>📋 Copy</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          {onToggleFavourite ? (
            <TouchableOpacity style={styles.iconBtn} onPress={onToggleFavourite}>
              <Text style={styles.iconText}>{item.isFavourite ? '★' : '☆'}</Text>
            </TouchableOpacity>
          ) : null}

          {onDelete ? (
            <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
              <Text style={[styles.iconText, { color: Colors.error }]}>🗑</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    marginRight: 8,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagChip: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primaryLight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  iconText: {
    fontSize: 18,
    color: Colors.warning,
  },
});
