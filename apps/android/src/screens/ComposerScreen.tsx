import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { Colors, Spacing, Typography } from '../components/Theme';

interface ComposerScreenProps {
  onBack: () => void;
  onSaved: () => void;
  initialTitle?: string;
  initialContent?: string;
}

export const ComposerScreen: React.FC<ComposerScreenProps> = ({
  onBack,
  onSaved,
  initialTitle = '',
  initialContent = '',
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Empty Content', 'Please enter some text, a question, or a code snippet.');
      return;
    }

    setSaving(true);
    try {
      await api.createTextItem(title.trim(), content, tags);
      Alert.alert('Saved', 'Your text has been saved to your cloud locker!');
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save text');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Save Text</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Title or summary (optional)"
          placeholderTextColor={Colors.textMuted}
        />

        {/* Content Input (multiline, preserves exact line breaks) */}
        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          placeholder="Type or paste your text, question, code snippet, or notes here..."
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        {/* Tag Input */}
        <View style={styles.tagSection}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add tag (e.g. dsa, work, python)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              onSubmitEditing={handleAddTag}
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={handleAddTag}>
              <Text style={styles.addTagText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {tags.length > 0 ? (
            <View style={styles.tagsContainer}>
              {tags.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.tagChip}
                  onPress={() => handleRemoveTag(t)}
                >
                  <Text style={styles.tagChipText}>#{t} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
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
  topBar: {
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
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  screenTitle: {
    ...Typography.titleMedium,
    fontSize: 17,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
  },
  contentInput: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    minHeight: 220,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tagSection: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  addTagBtn: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  addTagText: {
    color: Colors.primaryLight,
    fontWeight: '600',
    fontSize: 13,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagChip: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagChipText: {
    color: Colors.text,
    fontSize: 12,
  },
});
