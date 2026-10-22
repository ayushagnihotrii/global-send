import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LockerItem } from '../types';
import { Colors } from '../components/Theme';

// Screens
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { QuickSaveScreen } from '../screens/QuickSaveScreen';
import { ComposerScreen } from '../screens/ComposerScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { PhotosScreen } from '../screens/PhotosScreen';
import { VideosScreen } from '../screens/VideosScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { LinksScreen } from '../screens/LinksScreen';
import { FavouritesScreen } from '../screens/FavouritesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

type TabType = 'home' | 'photos' | 'videos' | 'docs' | 'links' | 'favs' | 'settings';

export const RootNavigator: React.FC = () => {
  const { token, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedItem, setSelectedItem] = useState<LockerItem | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showQuickSave, setShowQuickSave] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Android hardware back handler
  useEffect(() => {
    const onBackPress = () => {
      if (selectedItem) {
        setSelectedItem(null);
        return true;
      }
      if (showComposer) {
        setShowComposer(false);
        return true;
      }
      if (showSearch) {
        setShowSearch(false);
        return true;
      }
      if (showQuickSave) {
        setShowQuickSave(false);
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedItem, showComposer, showSearch, showQuickSave, activeTab]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Text style={styles.loadingLogo}>Global Send</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <AuthScreen />
      </SafeAreaView>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            key={refreshKey}
            onSelectItem={(it) => setSelectedItem(it)}
            onOpenComposer={() => setShowComposer(true)}
            onOpenQuickSave={() => setShowQuickSave(true)}
            onOpenSearch={() => setShowSearch(true)}
          />
        );
      case 'photos':
        return (
          <PhotosScreen
            key={refreshKey}
            onSelectItem={(it) => setSelectedItem(it)}
          />
        );
      case 'videos':
        return (
          <VideosScreen
            key={refreshKey}
            onSelectItem={(it) => setSelectedItem(it)}
          />
        );
      case 'docs':
        return (
          <DocumentsScreen
            key={refreshKey}
            onSelectItem={(it) => setSelectedItem(it)}
          />
        );
      case 'links':
        return (
          <LinksScreen
            key={refreshKey}
            onSelectItem={(it) => setSelectedItem(it)}
          />
        );
      case 'favs':
        return (
          <FavouritesScreen
            key={refreshKey}
            onSelectItem={(it) => setSelectedItem(it)}
          />
        );
      case 'settings':
        return <SettingsScreen />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Main Screen Body */}
      <View style={styles.content}>{renderActiveTab()}</View>

      {/* Android Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.navIcon, activeTab === 'home' && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'photos' && styles.navItemActive]}
          onPress={() => setActiveTab('photos')}
        >
          <Text style={[styles.navIcon, activeTab === 'photos' && styles.navIconActive]}>🖼️</Text>
          <Text style={[styles.navLabel, activeTab === 'photos' && styles.navLabelActive]}>Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'docs' && styles.navItemActive]}
          onPress={() => setActiveTab('docs')}
        >
          <Text style={[styles.navIcon, activeTab === 'docs' && styles.navIconActive]}>📄</Text>
          <Text style={[styles.navLabel, activeTab === 'docs' && styles.navLabelActive]}>Docs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'links' && styles.navItemActive]}
          onPress={() => setActiveTab('links')}
        >
          <Text style={[styles.navIcon, activeTab === 'links' && styles.navIconActive]}>🔗</Text>
          <Text style={[styles.navLabel, activeTab === 'links' && styles.navLabelActive]}>Links</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'favs' && styles.navItemActive]}
          onPress={() => setActiveTab('favs')}
        >
          <Text style={[styles.navIcon, activeTab === 'favs' && styles.navIconActive]}>⭐</Text>
          <Text style={[styles.navLabel, activeTab === 'favs' && styles.navLabelActive]}>Star</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'settings' && styles.navItemActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.navIcon, activeTab === 'settings' && styles.navIconActive]}>⚙️</Text>
          <Text style={[styles.navLabel, activeTab === 'settings' && styles.navLabelActive]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen Item Detail Modal */}
      {selectedItem ? (
        <Modal visible={true} animationType="slide">
          <SafeAreaView style={styles.safeArea}>
            <DetailScreen
              item={selectedItem}
              onBack={() => setSelectedItem(null)}
              onItemUpdated={() => setRefreshKey((k) => k + 1)}
              onItemDeleted={() => {
                setSelectedItem(null);
                setRefreshKey((k) => k + 1);
              }}
            />
          </SafeAreaView>
        </Modal>
      ) : null}

      {/* Composer Modal */}
      {showComposer ? (
        <Modal visible={true} animationType="slide">
          <SafeAreaView style={styles.safeArea}>
            <ComposerScreen
              onBack={() => setShowComposer(false)}
              onSaved={() => {
                setShowComposer(false);
                setRefreshKey((k) => k + 1);
              }}
            />
          </SafeAreaView>
        </Modal>
      ) : null}

      {/* Search Modal */}
      {showSearch ? (
        <Modal visible={true} animationType="fade">
          <SafeAreaView style={styles.safeArea}>
            <SearchScreen
              onBack={() => setShowSearch(false)}
              onSelectItem={(it) => {
                setShowSearch(false);
                setSelectedItem(it);
              }}
            />
          </SafeAreaView>
        </Modal>
      ) : null}

      {/* Quick Save Modal Sheet */}
      <Modal visible={showQuickSave} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropDismiss}
            onPress={() => setShowQuickSave(false)}
          />
          <QuickSaveScreen
            onClose={() => setShowQuickSave(false)}
            onOpenComposer={() => {
              setShowQuickSave(false);
              setShowComposer(true);
            }}
            onItemCreated={() => setRefreshKey((k) => k + 1)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primaryLight,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    borderRadius: 8,
  },
  navIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  navLabelActive: {
    color: Colors.primaryLight,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
});
