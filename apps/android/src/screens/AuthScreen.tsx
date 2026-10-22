import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, Typography } from '../components/Theme';

export const AuthScreen: React.FC = () => {
  const { login, register, serverUrl, updateServerUrl } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingServerUrl, setEditingServerUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both username and password.');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Validation Error', 'Username must be at least 3 characters.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const code = await register(username.trim(), password);
        setRecoveryCode(code);
      } else {
        await login(username.trim(), password);
      }
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServerUrl = async () => {
    if (!urlInput.trim()) return;
    await updateServerUrl(urlInput.trim());
    setEditingServerUrl(false);
    Alert.alert('Server Updated', `Connecting to: ${urlInput.trim()}`);
  };

  if (recoveryCode) {
    return (
      <View style={styles.recoveryContainer}>
        <Text style={styles.recoveryTitle}>Account Created 🎉</Text>
        <Text style={styles.recoverySubtitle}>
          Save your Recovery Code in a safe place. You will need it if you ever forget your password.
        </Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{recoveryCode}</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setRecoveryCode(null)}>
          <Text style={styles.primaryBtnText}>I Saved My Code — Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Server URL Pill */}
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setEditingServerUrl(!editingServerUrl)}
        >
          <Text style={styles.serverPillLabel}>Backend: </Text>
          <Text style={styles.serverPillUrl} numberOfLines={1}>
            {serverUrl}
          </Text>
          <Text style={styles.serverPillEdit}>✎</Text>
        </TouchableOpacity>

        {editingServerUrl ? (
          <View style={styles.serverEditCard}>
            <Text style={styles.inputLabel}>Backend Server URL</Text>
            <TextInput
              style={styles.input}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="http://10.0.2.2:3000 or https://gsend.in"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.saveServerBtn} onPress={handleSaveServerUrl}>
              <Text style={styles.saveServerBtnText}>Save Server URL</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>GS</Text>
          </View>
          <Text style={styles.brandTitle}>Global Send</Text>
          <Text style={styles.brandSubtitle}>Personal Cloud Storage & Universal Clipboard</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, !isRegistering && styles.tabActive]}
            onPress={() => setIsRegistering(false)}
          >
            <Text style={[styles.tabText, !isRegistering && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, isRegistering && styles.tabActive]}
            onPress={() => setIsRegistering(true)}
          >
            <Text style={[styles.tabText, isRegistering && styles.tabTextActive]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. saumya"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isRegistering ? 'Create Global Send Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  serverPillLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  serverPillUrl: {
    fontSize: 11,
    color: Colors.primaryLight,
    maxWidth: 180,
  },
  serverPillEdit: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  serverEditCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  saveServerBtn: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveServerBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  brandTitle: {
    ...Typography.titleLarge,
    marginBottom: 4,
  },
  brandSubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.surfaceVariant,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.text,
  },
  form: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  recoveryContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  recoveryTitle: {
    ...Typography.titleLarge,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  recoverySubtitle: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    color: Colors.textSecondary,
  },
  codeBox: {
    backgroundColor: Colors.surfaceVariant,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.xl,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryLight,
    letterSpacing: 2,
  },
});
