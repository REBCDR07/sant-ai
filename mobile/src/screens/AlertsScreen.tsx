import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { Fonts } from '../theme/typography';

export default function AlertsScreen() {
  const { alerts, refreshSessionData } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSessionData();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, alerts.length === 0 && styles.containerEmpty]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#0f766e"
          colors={['#0f766e']}
        />
      }
    >
      {alerts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Aucune alerte</Text>
          <Text style={styles.emptyText}>Situation sanitaire stable dans la zone.</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="alert-decagram" size={16} color="#475569" />
            <Text style={styles.header}>Alertes district</Text>
          </View>

          {alerts.map((alertItem) => (
            <View key={alertItem.id} style={styles.card}>
              <View style={styles.badgeRow}>
                <MaterialCommunityIcons name="biohazard" size={13} color="#be123c" />
                <Text style={styles.badge}>Epidemie suspectee</Text>
              </View>
              <Text style={styles.disease}>{alertItem.disease}</Text>
              <Text style={styles.meta}>
                {alertItem.count} cas signales - {alertItem.location}
              </Text>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Action recommandee</Text>
                <Text style={styles.panelText}>{alertItem.recommendations}</Text>
              </View>

              <Text style={styles.activeState}>Actif</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 10,
    paddingBottom: 24,
  },
  containerEmpty: {
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Fonts.display,
    color: '#0f172a',
  },
  emptyText: {
    marginTop: 8,
    color: '#475569',
  },
  header: {
    fontSize: 14,
    fontFamily: Fonts.display,
    color: '#475569',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    padding: 12,
    gap: 6,
  },
  badge: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: '#be123c',
    textTransform: 'uppercase',
  },
  disease: {
    fontSize: 20,
    fontFamily: Fonts.display,
    color: '#0f172a',
  },
  meta: {
    fontSize: 12,
    color: '#475569',
  },
  panel: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  panelTitle: {
    fontSize: 11,
    fontFamily: Fonts.display,
    color: '#334155',
  },
  panelText: {
    marginTop: 4,
    fontSize: 12,
    color: '#1e293b',
    lineHeight: 18,
  },
  activeState: {
    marginTop: 2,
    alignSelf: 'flex-start',
    fontSize: 11,
    fontFamily: Fonts.display,
    color: '#be123c',
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
