import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { api } from '../services/api';
import { LockerItem } from '../types';
import { Colors, Spacing, Typography } from '../components/Theme';

interface LinksScreenProps {
  onSelectItem: (item: LockerItem) => void;
}

export const LinksScreen: React.FC<LinksScreenProps> = ({ onSelectItem }) => {
  const [links, setLinks] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');

  const fetchLinks = async () => {
    try {
      const res = await api.getItems({ type: 'link' });
      setLinks(res.items || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleOpenLink = async (url?: string) => {
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open URL', `Unable to open: ${url}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to launch URL in browser');
    }
  };

  const handleCopyUrl = async (url?: string) => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied', 'Link copied to clipboard!');
  };

  const handleSaveLink = async () => {
    if (!urlInput.trim()) return;
    try {
      await api.createLinkItem(urlInput.trim(), titleInput.trim() || undefined, ['link']);
      setShowAddModal(false);
      setUrlInput('');
      setTitleInput('');
      fetchLinks();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save link');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Saved Links</Text>
          <Text style={styles.subtitle}>{links.length} links saved</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>+ Save Link</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={links}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.linkCard}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => onSelectItem(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.linkTitle} numberOfLines={2}>
                  {item.title || item.content}
                </Text>
                <Text style={styles.linkUrl} numberOfLines={1}>
                  🔗 {item.content}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => handleCopyUrl(item.content)}
                >
                  <Text style={styles.actionPillText}>📋 Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, styles.openPill]}
                  onPress={() => handleOpenLink(item.content)}
                >
                  <Text style={styles.openPillText}>↗ Open</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔗</Text>
              <Text style={styles.emptyTitle}>No Saved Links</Text>
              <Text style={styles.emptySub}>
                Save articles, websites, and reference URLs to quickly access them on your desktop.
              </Text>
            </View>
          }
        />
      )}

      {/* Add Link Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save New Web Link</Text>
            <Text style={styles.inputLabel}>URL</Text>
            <TextInput
              style={styles.modalInput}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://example.com/article"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Title (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="Descriptive title"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddModal(false)}
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
  list: {
    padding: Spacing.md,
  },
  linkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardMain: {
    marginBottom: 10,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 13,
    color: Colors.primaryLight,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 8,
  },
  actionPill: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  openPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  openPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryLight,
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
