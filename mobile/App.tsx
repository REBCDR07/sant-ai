import { BlackOpsOne_400Regular } from '@expo-google-fonts/black-ops-one';
import {
  Syne_400Regular,
  Syne_500Medium,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from './src/components/AppIcon';
import ChatAssistant from './src/components/ChatAssistant';
import { AppProvider, useAppContext } from './src/context/AppContext';
import AlertsScreen from './src/screens/AlertsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import HealthCentersScreen from './src/screens/HealthCentersScreen';
import MalnutritionScreen from './src/screens/MalnutritionScreen';
import TriageScreen from './src/screens/TriageScreen';
import { Fonts } from './src/theme/typography';

type TabKey = 'home' | 'triage' | 'malnutrition' | 'centers' | 'history' | 'alerts';

const TAB_LABELS: Record<TabKey, string> = {
  home: 'Accueil',
  triage: 'Triage',
  malnutrition: 'Visuel',
  centers: 'Centres',
  history: 'Registre',
  alerts: 'Alertes',
};

const TAB_ICONS: Record<TabKey, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  home: 'home-heart',
  triage: 'stethoscope',
  malnutrition: 'food-apple-outline',
  centers: 'crosshairs-gps',
  history: 'clipboard-text-clock-outline',
  alerts: 'alert-decagram-outline',
};

const textDefaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps = {
  ...textDefaultProps,
  style: [{ fontFamily: Fonts.body }, textDefaultProps.style].filter(Boolean),
};

const textInputDefaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps = {
  ...textInputDefaultProps,
  style: [{ fontFamily: Fonts.body }, textInputDefaultProps.style].filter(Boolean),
};

function StartupScreen({ message }: { message: string }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.startupSafeArea}>
      <StatusBar style="dark" backgroundColor="#f1f5f9" translucent={false} />
      <View style={styles.startupWrap}>
        <View style={styles.startupLogoRing}>
          <AppIcon size={88} />
        </View>
        <Text style={styles.startupBrand}>SanteAI Mobile</Text>
        <Text style={styles.startupMessage}>{message}</Text>
        <ActivityIndicator color="#0f766e" size="large" style={styles.startupSpinner} />
      </View>
    </SafeAreaView>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const { ready, alerts } = useAppContext();

  const currentTitle = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return 'Assistant de triage communautaire';
      case 'triage':
        return 'Nouveau Triage';
      case 'malnutrition':
        return 'Depistage Nutritionnel';
      case 'centers':
        return 'Centres de sante proches';
      case 'history':
        return 'Historique';
      case 'alerts':
        return 'Alertes Epidemiques';
      default:
        return 'SanteAI';
    }
  }, [activeTab]);

  if (!ready) {
    return <StartupScreen message="Initialisation des donnees locales..." />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onStart={() => setActiveTab('triage')} />;
      case 'triage':
        return <TriageScreen />;
      case 'malnutrition':
        return <MalnutritionScreen />;
      case 'centers':
        return <HealthCentersScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'alerts':
        return <AlertsScreen />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />

      <View style={styles.header}>
        <View style={styles.logoBox}>
          <AppIcon size={34} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.brand}>SanteAI Mobile</Text>
          <Text style={styles.subtitle}>{currentTitle}</Text>
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>

      <View style={styles.tabBar}>
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tabKey) => {
          const isActive = activeTab === tabKey;
          const showBadge = tabKey === 'alerts' && alerts.length > 0;

          return (
            <TouchableOpacity
              key={tabKey}
              onPress={() => setActiveTab(tabKey)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            >
              <MaterialCommunityIcons
                name={TAB_ICONS[tabKey]}
                size={18}
                color={isActive ? '#0f172a' : '#64748b'}
              />
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                {TAB_LABELS[tabKey]}
              </Text>
              {showBadge ? <View style={styles.alertBadge} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <ChatAssistant />
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BlackOpsOne_400Regular,
    Syne_400Regular,
    Syne_500Medium,
    Syne_700Bold,
    Syne_800ExtraBold,
  });
  const [showStartup, setShowStartup] = useState(true);

  useEffect(() => {
    if (!fontsLoaded) return;

    const timer = setTimeout(() => {
      setShowStartup(false);
    }, 1300);

    return () => {
      clearTimeout(timer);
    };
  }, [fontsLoaded]);

  const renderApp = () => {
    if (!fontsLoaded || showStartup) {
      return (
        <StartupScreen
          message={!fontsLoaded ? 'Chargement des polices...' : 'Demarrage de SanteAI...'}
        />
      );
    }

    return (
      <AppProvider>
        <AppShell />
      </AppProvider>
    );
  };

  return <SafeAreaProvider>{renderApp()}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  startupSafeArea: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  startupWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  startupLogoRing: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  startupBrand: {
    marginTop: 14,
    color: '#0f172a',
    fontSize: 26,
    fontFamily: Fonts.brand,
  },
  startupMessage: {
    marginTop: 6,
    color: '#475569',
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
  },
  startupSpinner: {
    marginTop: 16,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
  },
  brand: {
    color: '#0f172a',
    fontSize: 19,
    fontFamily: Fonts.brand,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#334155',
    fontSize: 12,
    marginTop: 2,
    fontFamily: Fonts.bodyMedium,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
    backgroundColor: '#ffffff',
    paddingHorizontal: 3,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 4,
    marginHorizontal: 2,
    borderRadius: 12,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#e2e8f0',
  },
  tabButtonText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  tabButtonTextActive: {
    color: '#0f172a',
  },
  alertBadge: {
    position: 'absolute',
    top: 8,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
});
