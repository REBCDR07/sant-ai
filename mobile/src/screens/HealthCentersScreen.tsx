import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { findNearbyHealthCenters } from '../services/healthCentersService';
import { HealthCenter } from '../types';
import { Fonts } from '../theme/typography';

function formatLocationLabel(place?: Location.LocationGeocodedAddress | null) {
  if (!place) return '';

  return [place.city, place.region, place.country].filter(Boolean).join(', ');
}

export default function HealthCentersScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [centers, setCenters] = useState<HealthCenter[]>([]);
  const [nearestCenter, setNearestCenter] = useState<HealthCenter | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  const searchNearbyCenters = async () => {
    setLoading(true);
    setError('');
    setCenters([]);
    setNearestCenter(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Autorisation de geolocalisation requise.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;

      setCoordinates({ latitude, longitude });

      try {
        const locationResults = await Location.reverseGeocodeAsync({ latitude, longitude });
        setLocationLabel(formatLocationLabel(locationResults[0] ?? null));
      } catch {
        setLocationLabel('');
      }

      const response = await findNearbyHealthCenters(latitude, longitude, 15000);
      setCenters(response.centers);
      setNearestCenter(response.nearestCenter);

      if (response.centers.length === 0) {
        setError('Aucun centre de sante trouve dans la zone demandee.');
      }
    } catch (searchError: any) {
      setError(searchError?.message || 'Recherche impossible pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await searchNearbyCenters();
    } finally {
      setRefreshing(false);
    }
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setError('Impossible d ouvrir la carte.');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#0f766e"
          colors={['#0f766e']}
        />
      }
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTitleRow}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color="#ffffff" />
          <Text style={styles.heroTitle}>Centres de sante proches</Text>
        </View>
        <Text style={styles.heroText}>
          Autorisez la geolocalisation pour afficher le centre le plus proche autour de vous et
          lancer l itineraire dans Google Maps.
        </Text>

        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={searchNearbyCenters}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.buttonInner}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.searchButtonText}>Recherche en cours...</Text>
            </View>
          ) : (
            <View style={styles.buttonInner}>
              <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#ffffff" />
              <Text style={styles.searchButtonText}>Trouver autour de moi</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {locationLabel ? (
        <View style={styles.locationCard}>
          <MaterialCommunityIcons name="map-marker" size={14} color="#0f766e" />
          <Text style={styles.locationText}>{locationLabel}</Text>
        </View>
      ) : null}

      {nearestCenter ? (
        <View style={styles.nearestCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Le plus proche</Text>
            </View>
            <Text style={styles.distanceText}>{nearestCenter.distanceText}</Text>
          </View>

          <Text style={styles.centerName}>{nearestCenter.name}</Text>
          <Text style={styles.centerAddress}>{nearestCenter.address}</Text>

          <View style={styles.metaRow}>
            {nearestCenter.openNow !== undefined ? (
              <View
                style={[
                  styles.statusPill,
                  nearestCenter.openNow ? styles.statusOpen : styles.statusClosed,
                ]}
              >
                <Text style={styles.statusText}>
                  {nearestCenter.openNow ? 'Ouvert' : 'Ferme'}
                </Text>
              </View>
            ) : null}

            {typeof nearestCenter.rating === 'number' ? (
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>Note {nearestCenter.rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => openUrl(nearestCenter.mapsUrl)}
            >
              <Text style={styles.secondaryButtonText}>Voir carte</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => openUrl(nearestCenter.directionsUrl)}
            >
              <Text style={styles.primaryButtonText}>Itineraire</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {centers.length > 0 ? (
        <View style={styles.listWrap}>
          <Text style={styles.sectionTitle}>Tous les centres trouves</Text>
          {centers.map((center) => (
            <View key={center.placeId} style={styles.centerCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.centerNameSmall}>{center.name}</Text>
                <Text style={styles.distanceText}>{center.distanceText}</Text>
              </View>
              <Text style={styles.centerAddress}>{center.address}</Text>
              <View style={styles.metaRow}>
                {center.openNow !== undefined ? (
                  <View
                    style={[styles.statusPill, center.openNow ? styles.statusOpen : styles.statusClosed]}
                  >
                    <Text style={styles.statusText}>{center.openNow ? 'Ouvert' : 'Ferme'}</Text>
                  </View>
                ) : null}
                {typeof center.rating === 'number' ? (
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>Note {center.rating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => openUrl(center.mapsUrl)}>
                  <Text style={styles.secondaryButtonText}>Carte</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => openUrl(center.directionsUrl)}
                >
                  <Text style={styles.primaryButtonText}>Aller</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="map-search-outline" size={18} color="#475569" />
          <Text style={styles.emptyTitle}>Aucun resultat encore</Text>
          <Text style={styles.emptyText}>
            Lance une recherche pour afficher les centres de sante les plus proches.
          </Text>
        </View>
      )}

      {coordinates ? (
        <Text style={styles.coordsText}>
          Position: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: Fonts.display,
  },
  heroText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.body,
  },
  searchButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  searchButtonDisabled: {
    opacity: 0.72,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: Fonts.display,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfeff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5f3fc',
    padding: 10,
  },
  locationText: {
    color: '#0f766e',
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  nearestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: Fonts.display,
  },
  listWrap: {
    gap: 10,
  },
  centerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: Fonts.display,
  },
  centerName: {
    color: '#0f172a',
    fontSize: 18,
    fontFamily: Fonts.display,
  },
  centerNameSmall: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  centerAddress: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  distanceText: {
    color: '#0f766e',
    fontSize: 12,
    fontFamily: Fonts.display,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e2e8f0',
  },
  statusOpen: {
    backgroundColor: '#dcfce7',
  },
  statusClosed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    color: '#0f172a',
    fontSize: 10,
    fontFamily: Fonts.heading,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: Fonts.display,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontSize: 12,
    fontFamily: Fonts.display,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: Fonts.display,
  },
  emptyText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  coordsText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
});
