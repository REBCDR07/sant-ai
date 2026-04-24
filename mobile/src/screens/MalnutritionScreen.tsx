import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { analyzeMalnutritionImages } from '../services/aiService';
import { Fonts } from '../theme/typography';

type SelectedImage = {
  uri: string;
  base64Uri: string;
};

type MalnutritionResult = Awaited<ReturnType<typeof analyzeMalnutritionImages>>;

type ImageDiagnosis = {
  imageUri: string;
  result?: MalnutritionResult;
  checkId?: string;
  followUpSet: boolean;
  error?: string;
};

function getRiskColors(level: MalnutritionResult['riskLevel']) {
  switch (level) {
    case 'Élevé':
      return {
        softBg: '#ffe4e6',
        badgeBg: '#e11d48',
        title: '#9f1239',
      };
    case 'Modéré':
      return {
        softBg: '#fef3c7',
        badgeBg: '#d97706',
        title: '#92400e',
      };
    default:
      return {
        softBg: '#dcfce7',
        badgeBg: '#16a34a',
        title: '#14532d',
      };
  }
}

async function toSelectedImage(
  asset: ImagePicker.ImagePickerAsset,
): Promise<SelectedImage> {
  const mimeType = asset.mimeType || 'image/jpeg';
  const base64 =
    asset.base64 ||
    (await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    }));

  return {
    uri: asset.uri,
    base64Uri: `data:${mimeType};base64,${base64}`,
  };
}

function compactForSpeech(text: string, maxLength = 130) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function buildDiagnosisSpeech(index: number, result: MalnutritionResult) {
  const briefRecommendation = compactForSpeech(
    result.recommendations || result.analysis || '',
  );

  const header = `Image ${index + 1}. Risque ${result.riskLevel}. Score ${result.riskScore} sur 100.`;
  return briefRecommendation ? `${header} ${briefRecommendation}` : header;
}

async function speakImageDiagnosis(index: number, result: MalnutritionResult) {
  const message = buildDiagnosisSpeech(index, result);

  await new Promise<void>((resolve) => {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    const timeout = setTimeout(finish, 9000);

    try {
      Speech.speak(message, {
        language: 'fr-FR',
        rate: 0.96,
        onDone: () => {
          clearTimeout(timeout);
          finish();
        },
        onStopped: () => {
          clearTimeout(timeout);
          finish();
        },
        onError: () => {
          clearTimeout(timeout);
          finish();
        },
      });
    } catch {
      clearTimeout(timeout);
      finish();
    }
  });
}

export default function MalnutritionScreen() {
  const { addMalnutritionCheck, setFollowUp } = useAppContext();

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeScanIndex, setActiveScanIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [diagnoses, setDiagnoses] = useState<ImageDiagnosis[]>([]);

  const scanProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      scanProgress.stopAnimation();
      scanProgress.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(scanProgress, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [loading, scanProgress]);

  const scanTranslateY = useMemo(
    () =>
      scanProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-8, 128],
      }),
    [scanProgress],
  );

  const hasDiagnoses = diagnoses.length > 0;

  const reset = () => {
    setImages([]);
    setLoading(false);
    setActiveScanIndex(null);
    setError('');
    setDiagnoses([]);
  };

  const appendAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    try {
      const normalized = await Promise.all(assets.map((asset) => toSelectedImage(asset)));
      setImages((prev) => [...prev, ...normalized]);
      setDiagnoses([]);
      setError('');
    } catch {
      setError('Impossible de preparer les images');
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Autorisation camera requise');
      return;
    }

    const resultPicker = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true,
      mediaTypes: ['images'],
    });

    if (resultPicker.canceled || !resultPicker.assets.length) return;
    await appendAssets(resultPicker.assets);
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Autorisation galerie requise');
      return;
    }

    const resultPicker = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.8,
      base64: true,
      mediaTypes: ['images'],
    });

    if (resultPicker.canceled || !resultPicker.assets.length) return;
    await appendAssets(resultPicker.assets);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
    setDiagnoses([]);
    setError('');
  };

  const handleAnalyze = async () => {
    if (loading) return;

    if (images.length === 0) {
      setError('Ajoutez au moins une image');
      return;
    }

    setLoading(true);
    setActiveScanIndex(0);
    setError('');
    Speech.stop();

    const nextDiagnoses: ImageDiagnosis[] = images.map((entry) => ({
      imageUri: entry.uri,
      followUpSet: false,
    }));

    try {
      for (let index = 0; index < images.length; index += 1) {
        setActiveScanIndex(index);
        let speechResult: MalnutritionResult | null = null;

        try {
          const analysis = await analyzeMalnutritionImages([images[index].base64Uri]);

          const checkId = addMalnutritionCheck({
            imageUrl: images[index].uri,
            ...analysis,
          });

          nextDiagnoses[index] = {
            imageUri: images[index].uri,
            result: analysis,
            checkId,
            followUpSet: false,
          };

          speechResult = analysis;
        } catch (analysisError: any) {
          nextDiagnoses[index] = {
            imageUri: images[index].uri,
            followUpSet: false,
            error: analysisError?.message || 'Erreur analyse image',
          };
        }

        setDiagnoses([...nextDiagnoses]);

        if (speechResult) {
          await speakImageDiagnosis(index, speechResult);
        }
      }

      const successCount = nextDiagnoses.filter((entry) => entry.result).length;
      if (successCount === 0) {
        setError('Aucun diagnostic n a pu etre produit. Verifiez la connexion et les cles API.');
      }
    } finally {
      setLoading(false);
      setActiveScanIndex(null);
    }
  };


  const handlePlanFollowUp = (index: number) => {
    const entry = diagnoses[index];
    if (!entry?.checkId) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setFollowUp(entry.checkId, 'malnutrition', tomorrow.toISOString());
    setDiagnoses((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, followUpSet: true } : item,
      ),
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Depistage malnutrition</Text>
      <Text style={styles.pageSubTitle}>Photos visage, cheveux et membres</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
          <View style={styles.actionButtonInner}>
            <MaterialCommunityIcons name="camera-outline" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Prendre photo</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButtonAlt} onPress={handlePickFromGallery}>
          <View style={styles.actionButtonInner}>
            <MaterialCommunityIcons name="image-multiple-outline" size={16} color="#1e293b" />
            <Text style={styles.actionButtonAltText}>Ouvrir galerie</Text>
          </View>
        </TouchableOpacity>
      </View>

      {images.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aucune image selectionnee</Text>
          <Text style={styles.emptyText}>
            Prenez plusieurs images bien eclairees pour ameliorer le diagnostic.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesStrip}>
          {images.map((entry, index) => {
            const diagnosis = diagnoses[index];
            const isScanning = loading && activeScanIndex === index;
            const isDone = !!diagnosis?.result;
            const isFailed = !!diagnosis?.error;

            return (
              <View key={`${entry.uri}-${index}`} style={styles.imageCard}>
                <Image source={{ uri: entry.uri }} style={styles.image} />

                {!loading && !hasDiagnoses ? (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#ffffff" />
                  </TouchableOpacity>
                ) : null}

                {isScanning ? (
                  <View style={styles.scanOverlay}>
                    <Animated.View
                      style={[
                        styles.scanLine,
                        { transform: [{ translateY: scanTranslateY }] },
                      ]}
                    />
                    <Text style={styles.scanLabel}>Analyse...</Text>
                  </View>
                ) : null}

                {isDone ? (
                  <View style={[styles.imageStateBadge, styles.imageStateDone]}>
                    <MaterialCommunityIcons name="check" size={12} color="#ffffff" />
                  </View>
                ) : null}

                {isFailed ? (
                  <View style={[styles.imageStateBadge, styles.imageStateError]}>
                    <MaterialCommunityIcons name="alert" size={12} color="#ffffff" />
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      {!hasDiagnoses ? (
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.actionButtonInner}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.primaryButtonText}>
                Analyse image {activeScanIndex !== null ? activeScanIndex + 1 : 1}/{images.length}
              </Text>
            </View>
          ) : (
            <View style={styles.actionButtonInner}>
              <MaterialCommunityIcons name="stethoscope" size={16} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Lancer diagnostic visuel</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.resultsWrap}>
          {diagnoses.map((entry, index) => {
            if (!entry.result) {
              return (
                <View key={`${entry.imageUri}-${index}`} style={styles.resultErrorCard}>
                  <Text style={styles.resultImageTitle}>Image {index + 1}</Text>
                  <Text style={styles.resultErrorText}>
                    {entry.error || 'Erreur pendant le diagnostic'}
                  </Text>
                </View>
              );
            }

            const colors = getRiskColors(entry.result.riskLevel);

            return (
              <View
                key={`${entry.imageUri}-${index}`}
                style={[styles.resultCard, { backgroundColor: colors.softBg }]}
              >
                <View style={styles.resultHeaderRow}>
                  <Image source={{ uri: entry.imageUri }} style={styles.resultThumb} />
                  <View style={styles.resultHeaderTextWrap}>
                    <Text style={styles.resultImageTitle}>Diagnostic image {index + 1}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
                      <Text style={styles.badgeText}>Risque {entry.result.riskLevel}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.scoreText, { color: colors.title }]}>Score IA: {entry.result.riskScore}/100</Text>

                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Analyse detaillee</Text>
                  <Text style={styles.panelText}>{entry.result.analysis}</Text>
                </View>

                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Recommandations</Text>
                  <Text style={styles.panelText}>{entry.result.recommendations}</Text>
                </View>

                {(entry.result.riskLevel === 'Élevé' || entry.result.riskLevel === 'Modéré') &&
                !entry.followUpSet ? (
                  <TouchableOpacity
                    style={styles.followUpButton}
                    onPress={() => handlePlanFollowUp(index)}
                  >
                    <Text style={styles.followUpButtonText}>Programmer suivi 24h</Text>
                  </TouchableOpacity>
                ) : null}

                {entry.followUpSet ? (
                  <View style={styles.followUpDone}>
                    <Text style={styles.followUpDoneText}>Suivi programme</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryButtonText}>Nouveau patient</Text>
          </TouchableOpacity>
        </View>
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
  pageTitle: {
    fontSize: 24,
    fontFamily: Fonts.display,
    color: '#0f172a',
  },
  pageSubTitle: {
    fontSize: 12,
    color: '#475569',
  },
  errorText: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionButtonText: {
    color: '#ffffff',
    fontFamily: Fonts.heading,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonAlt: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: '#ffffff',
  },
  actionButtonAltText: {
    color: '#1e293b',
    fontFamily: Fonts.heading,
  },
  emptyBox: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: '#0f172a',
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  imagesStrip: {
    maxHeight: 120,
  },
  imageCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.35)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#22d3ee',
  },
  scanLabel: {
    alignSelf: 'center',
    marginBottom: 8,
    color: '#e2e8f0',
    fontSize: 11,
    fontFamily: Fonts.heading,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  imageStateBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  imageStateDone: {
    backgroundColor: '#16a34a',
  },
  imageStateError: {
    backgroundColor: '#dc2626',
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontFamily: Fonts.display,
    fontSize: 14,
  },
  resultsWrap: {
    gap: 10,
  },
  resultErrorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    padding: 12,
    gap: 6,
  },
  resultErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    lineHeight: 17,
  },
  resultCard: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  resultHeaderTextWrap: {
    flex: 1,
    gap: 6,
  },
  resultImageTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontFamily: Fonts.display,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: Fonts.display,
  },
  scoreText: {
    fontSize: 18,
    fontFamily: Fonts.display,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  panelTitle: {
    fontSize: 11,
    color: '#475569',
    fontFamily: Fonts.heading,
  },
  panelText: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
  },
  followUpButton: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    paddingVertical: 10,
    alignItems: 'center',
  },
  followUpButtonText: {
    color: '#92400e',
    fontFamily: Fonts.display,
    fontSize: 12,
  },
  followUpDone: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86efac',
    paddingVertical: 10,
    alignItems: 'center',
  },
  followUpDoneText: {
    color: '#166534',
    fontFamily: Fonts.display,
    fontSize: 12,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontFamily: Fonts.heading,
    fontSize: 12,
  },
});
