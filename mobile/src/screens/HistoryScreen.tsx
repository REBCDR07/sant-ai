import React, { useMemo, useState } from 'react';
import {
  Alert as RNAlert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { Case, MalnutritionCheck } from '../types';
import { Fonts } from '../theme/typography';

type HistoryItem =
  | { type: 'case'; timestamp: number; data: Case }
  | { type: 'malnutrition'; timestamp: number; data: MalnutritionCheck };

export default function HistoryScreen() {
  const {
    cases,
    malnutritionChecks,
    toggleFollowUpCompleted,
    clearHistory,
    refreshSessionData,
  } = useAppContext();

  const [refreshing, setRefreshing] = useState(false);

  const items = useMemo<HistoryItem[]>(() => {
    const mappedCases: HistoryItem[] = cases.map((entry) => ({
      type: 'case',
      timestamp: new Date(entry.timestamp).getTime(),
      data: entry,
    }));

    const mappedChecks: HistoryItem[] = malnutritionChecks.map((entry) => ({
      type: 'malnutrition',
      timestamp: new Date(entry.timestamp).getTime(),
      data: entry,
    }));

    return [...mappedCases, ...mappedChecks].sort((a, b) => b.timestamp - a.timestamp);
  }, [cases, malnutritionChecks]);

  const pendingFollowUps = useMemo(
    () =>
      items.filter((item) => item.data.followUpDate && !item.data.followUpCompleted)
        .length,
    [items],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSessionData();
    } finally {
      setRefreshing(false);
    }
  };

  const confirmClearHistory = () => {
    RNAlert.alert('Effacer historique', 'Supprimer tous les enregistrements ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: () => clearHistory(),
      },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, items.length === 0 && styles.containerEmpty]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#0f766e"
          colors={['#0f766e']}
        />
      }
    >
      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Historique vide</Text>
          <Text style={styles.emptyText}>Aucun patient enregistre pour cette session.</Text>
        </View>
      ) : (
        <>
          {pendingFollowUps > 0 ? (
            <View style={styles.followUpBanner}>
              <View style={styles.bannerTitleRow}>
                <MaterialCommunityIcons
                  name="clock-alert-outline"
                  size={16}
                  color="#92400e"
                />
                <Text style={styles.followUpBannerTitle}>Rappels de suivi</Text>
              </View>
              <Text style={styles.followUpBannerText}>{pendingFollowUps} patient(s) a revoir</Text>
            </View>
          ) : null}

          <View style={styles.topRow}>
            <View style={styles.bannerTitleRow}>
              <MaterialCommunityIcons name="history" size={16} color="#0f172a" />
              <Text style={styles.topTitle}>Historique de session</Text>
            </View>
            <TouchableOpacity onPress={confirmClearHistory}>
              <Text style={styles.clearAction}>Effacer</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => {
            const date = new Date(item.timestamp);
            const time = `${date.getHours().toString().padStart(2, '0')}:${date
              .getMinutes()
              .toString()
              .padStart(2, '0')}`;

            const isCase = item.type === 'case';
            const title = isCase
              ? `Patient ${item.data.age} ans - ${item.data.sex === 'M' ? 'M' : 'F'}`
              : 'Scan nutritionnel';

            const detail = isCase
              ? item.data.diagnosis
              : item.data.overallSummary || item.data.analysis;
            const level = isCase ? item.data.severity : item.data.riskLevel;
            const peopleDetected = !isCase ? item.data.peopleDetected : undefined;
            const subjectCount = !isCase ? (item.data.subjects?.length ?? 0) : 0;
            const scanNotes = !isCase
              ? item.data.scanNotes || item.data.imageQuality || ''
              : '';

            const hasFollowUp = Boolean(item.data.followUpDate);
            const isDone = Boolean(item.data.followUpCompleted);

            return (
              <View key={`${item.type}-${item.data.id}-${index}`} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.timeText}>{time}</Text>
                  <Text style={[styles.levelPill, isDone && styles.levelPillDone]}>{level}</Text>
                </View>

                <Text style={[styles.cardTitle, isDone && styles.doneText]}>{title}</Text>
                <Text style={styles.cardDetail} numberOfLines={2}>
                  {detail}
                </Text>

                {!isCase && typeof peopleDetected === 'number' ? (
                  <Text style={styles.cardMeta}>
                    {peopleDetected > 1
                      ? `${peopleDetected} personnes visibles`
                      : peopleDetected === 1
                        ? '1 personne visible'
                        : 'Aucune personne clairement visible'}
                    {subjectCount > 0 ? ` - ${subjectCount} sujet(s) détaillé(s)` : ''}
                  </Text>
                ) : null}

                {!isCase && scanNotes ? (
                  <Text style={styles.cardMeta}>{scanNotes}</Text>
                ) : null}

                {hasFollowUp ? (
                  <TouchableOpacity
                    style={[styles.followUpToggle, isDone && styles.followUpToggleDone]}
                    onPress={() => toggleFollowUpCompleted(item.data.id, item.type)}
                  >
                    <Text
                      style={[styles.followUpToggleText, isDone && styles.followUpToggleTextDone]}
                    >
                      {isDone ? 'Suivi effectue' : 'Marquer suivi effectue'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
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
    textAlign: 'center',
  },
  followUpBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fef3c7',
    padding: 12,
  },
  followUpBannerTitle: {
    fontSize: 12,
    fontFamily: Fonts.display,
    color: '#92400e',
  },
  followUpBannerText: {
    marginTop: 2,
    fontSize: 12,
    color: '#92400e',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 2,
  },
  topTitle: {
    fontSize: 14,
    fontFamily: Fonts.display,
    color: '#0f172a',
  },
  clearAction: {
    fontSize: 12,
    fontFamily: Fonts.display,
    color: '#be123c',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  levelPill: {
    fontSize: 10,
    color: '#0f172a',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontFamily: Fonts.heading,
  },
  levelPillDone: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  cardTitle: {
    fontSize: 14,
    color: '#0f172a',
    fontFamily: Fonts.heading,
  },
  cardDetail: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  doneText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  followUpToggle: {
    marginTop: 2,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  followUpToggleDone: {
    borderColor: '#86efac',
    backgroundColor: '#dcfce7',
  },
  followUpToggleText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
    color: '#92400e',
  },
  followUpToggleTextDone: {
    color: '#166534',
  },
});
