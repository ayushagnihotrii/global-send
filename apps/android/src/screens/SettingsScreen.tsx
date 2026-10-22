import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StorageUsage, GoogleDriveStatus } from '../types';
import { Colors, Spacing, Typography } from '../components/Theme';

export const SettingsScreen: React.FC = () => {
  const { user, logout, serverUrl, updateServerUrl } = useAuth();
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [gdriveStatus, setGdriveStatus] = useState<GoogleDriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(serverUrl);

  const fetchStats = async () => {
    try {
      const [u, g] = await Promise.all([
        api.getStorageUsage().catch(() => null),
        api.getGoogleDriveStatus().catch(() => null),
      ]);
      setUsage(u);
      setGdriveStatus(g);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSaveUrl = async () => {
    if (!urlInput.trim()) return;
    await updateServerUrl(urlInput.trim());
    setEditingUrl(false);
    Alert.alert('Server Updated', `Now connecting to: ${urlInput.trim()}`);
    fetchStats();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from Global Send?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings & Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'GS'}
              </Text>
            </View>
            <View>
              <Text style={styles.username}>@{user?.username || 'user'}</Text>
              <Text style={styles.userMeta}>Active Global Send Account</Text>
            </View>
          </View>
        </View>

        {/* Server Connection Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Backend Connection</Text>
          <Text style={styles.sectionSubtitle}>
            Current API server address used by this Android device
          </Text>

          <View style={styles.serverRow}>
            <Text style={styles.serverUrlText} numberOfLines={1}>
              {serverUrl}
            </Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditingUrl(!editingUrl)}
            >
              <Text style={styles.editBtnText}>{editingUrl ? 'Cancel' : 'Change'}</Text>
            </TouchableOpacity>
          </View>

          {editingUrl ? (
            <View style={styles.editBox}>
              <TextInput
                style={styles.urlInput}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="http://10.0.2.2:3000 or https://gsend.in"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
                <Text style={styles.saveBtnText}>Save Address</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Cloud Storage & Google Drive Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cloud Storage Backend</Text>
          <Text style={styles.sectionSubtitle}>
            Primary storage for uploaded images, videos, and documents
          </Text>

          <View style={styles.storageStatusRow}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: gdriveStatus?.connected ? Colors.accent : Colors.warning },
              ]}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {gdriveStatus?.connected ? 'Google Drive Connected' : 'Local / Dev Storage Active'}
              </Text>
              <Text style={styles.statusDesc}>
                {gdriveStatus?.connected && gdriveStatus.email
                  ? `Owner: ${gdriveStatus.email}`
                  : 'Manage cloud account in the web app settings'}
              </Text>
            </View>
          </View>

          {usage ? (
            <View style={styles.usageBreakdown}>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Cloud Storage Used:</Text>
                <Text style={styles.usageVal}>{formatBytes(usage.usedBytes)}</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{usage.breakdown.texts}</Text>
                  <Text style={styles.statLbl}>Texts</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{usage.breakdown.photos}</Text>
                  <Text style={styles.statLbl}>Photos</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{usage.breakdown.videos}</Text>
                  <Text style={styles.statLbl}>Videos</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{usage.breakdown.files}</Text>
                  <Text style={styles.statLbl}>Docs</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{usage.breakdown.links}</Text>
                  <Text style={styles.statLbl}>Links</Text>
                </View>
              </View>
            </View>
          ) : (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 12 }} />
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out of Global Send</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Global Send Android Client • Version 1.0.0</Text>
      </ScrollView>
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 20,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  userMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  serverUrlText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primaryLight,
    fontFamily: 'monospace',
    marginRight: 10,
  },
  editBtn: {
    backgroundColor: Colors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  editBox: {
    marginTop: 10,
    gap: 8,
  },
  urlInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 13,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  storageStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    padding: 12,
    borderRadius: 10,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statusDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  usageBreakdown: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  usageVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  statLbl: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: Colors.error,
    fontWeight: '700',
    fontSize: 15,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 12,
  },
});
