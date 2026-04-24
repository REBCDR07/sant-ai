import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { analyzeSymptoms, transcribeAudio } from '../services/aiService';
import { Severity } from '../types';
import { Fonts } from '../theme/typography';

type FormErrors = {
  age?: string;
  weight?: string;
  symptoms?: string;
  global?: string;
};

type TriageResult = Awaited<ReturnType<typeof analyzeSymptoms>>;

function getSeverityColors(severity: Severity) {
  switch (severity) {
    case 'Critique':
      return {
        softBg: '#ffe4e6',
        title: '#9f1239',
        badgeBg: '#e11d48',
      };
    case 'Urgent':
      return {
        softBg: '#fef3c7',
        title: '#92400e',
        badgeBg: '#d97706',
      };
    case 'Modéré':
      return {
        softBg: '#dbeafe',
        title: '#1e3a8a',
        badgeBg: '#2563eb',
      };
    default:
      return {
        softBg: '#dcfce7',
        title: '#14532d',
        badgeBg: '#16a34a',
      };
  }
}

export default function TriageScreen() {
  const { addCase, setFollowUp } = useAppContext();

  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [symptoms, setSymptoms] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [followUpSet, setFollowUpSet] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const resetForm = () => {
    setAge('');
    setWeight('');
    setSex('M');
    setSymptoms('');
    setErrors({});
    setResult(null);
    setCurrentCaseId(null);
    setFollowUpSet(false);
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    const parsedAge = Number(age);
    const parsedWeight = Number(weight);

    if (!age.trim()) {
      nextErrors.age = 'Age requis';
    } else if (!Number.isFinite(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
      nextErrors.age = 'Age invalide';
    }

    if (!weight.trim()) {
      nextErrors.weight = 'Poids requis';
    } else if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 200) {
      nextErrors.weight = 'Poids invalide';
    }

    if (!symptoms.trim()) {
      nextErrors.symptoms = 'Symptomes requis';
    } else if (symptoms.trim().length < 5) {
      nextErrors.symptoms = 'Description trop courte';
    }

    return nextErrors;
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) {
      setIsRecording(false);
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (!uri) return;

      setIsTranscribing(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const text = await transcribeAudio(base64, 'audio/m4a');
      setSymptoms((prev) => (prev ? `${prev}\n${text}` : text));
      setErrors((prev) => ({ ...prev, global: undefined, symptoms: undefined }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        global: 'Echec transcription vocale',
      }));
    } finally {
      setIsTranscribing(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setErrors((prev) => ({
          ...prev,
          global: 'Autorisation micro requise',
        }));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setErrors((prev) => ({ ...prev, global: undefined }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        global: 'Impossible de demarrer le micro',
      }));
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const triage = await analyzeSymptoms(
        symptoms.trim(),
        Number(age),
        Number(weight),
        sex,
      );

      setResult(triage);

      const caseId = addCase({
        age: Number(age),
        weight: Number(weight),
        sex,
        symptoms: symptoms.trim(),
        ...triage,
      });

      setCurrentCaseId(caseId);
    } catch (error: any) {
      setErrors({
        global: error?.message || 'Erreur pendant l analyse',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanFollowUp = () => {
    if (!currentCaseId) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setFollowUp(currentCaseId, 'case', tomorrow.toISOString());
    setFollowUpSet(true);
  };

  if (result) {
    const colors = getSeverityColors(result.severity);

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Analyse terminee</Text>
        <Text style={styles.pageSubTitle}>Diagnostic IA et recommandations</Text>

        <View style={[styles.resultCard, { backgroundColor: colors.softBg }]}> 
          <View style={[styles.badge, { backgroundColor: colors.badgeBg }]}>
            <Text style={styles.badgeText}>{result.severity}</Text>
          </View>

          <Text style={[styles.resultDiagnosis, { color: colors.title }]}>
            {result.diagnosis}
          </Text>

          <View style={styles.resultPanel}>
            <Text style={styles.panelTitle}>Conduite a tenir</Text>
            <Text style={styles.panelText}>{result.instructions}</Text>
          </View>

          <View style={styles.resultPanel}>
            <Text style={styles.panelTitle}>Medicaments suggeres</Text>
            <Text style={styles.panelText}>{result.medications}</Text>
          </View>

          {(result.severity === 'Critique' || result.severity === 'Urgent') && !followUpSet ? (
            <TouchableOpacity style={styles.followUpButton} onPress={handlePlanFollowUp}>
              <Text style={styles.followUpButtonText}>Programmer suivi 24h</Text>
            </TouchableOpacity>
          ) : null}

          {followUpSet ? (
            <View style={styles.followUpDone}>
              <Text style={styles.followUpDoneText}>Suivi programme</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={resetForm}>
          <Text style={styles.primaryButtonText}>Nouveau patient</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Nouveau triage patient</Text>
      <Text style={styles.pageSubTitle}>Saisir les informations du patient</Text>

      {errors.global ? <Text style={styles.errorText}>{errors.global}</Text> : null}

      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            keyboardType="numeric"
            value={age}
            onChangeText={(text) => {
              setAge(text);
              setErrors((prev) => ({ ...prev, age: undefined }));
            }}
            style={styles.input}
            placeholder="Ex: 5"
          />
          {errors.age ? <Text style={styles.fieldError}>{errors.age}</Text> : null}
        </View>

        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Poids (kg)</Text>
          <TextInput
            keyboardType="numeric"
            value={weight}
            onChangeText={(text) => {
              setWeight(text);
              setErrors((prev) => ({ ...prev, weight: undefined }));
            }}
            style={styles.input}
            placeholder="Ex: 14"
          />
          {errors.weight ? <Text style={styles.fieldError}>{errors.weight}</Text> : null}
        </View>
      </View>

      <Text style={styles.label}>Sexe</Text>
      <View style={styles.sexRow}>
        <TouchableOpacity
          style={[styles.sexButton, sex === 'M' && styles.sexButtonActive]}
          onPress={() => setSex('M')}
        >
          <Text style={[styles.sexButtonText, sex === 'M' && styles.sexButtonTextActive]}>
            Garcon
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sexButton, sex === 'F' && styles.sexButtonActive]}
          onPress={() => setSex('F')}
        >
          <Text style={[styles.sexButtonText, sex === 'F' && styles.sexButtonTextActive]}>
            Fille
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.symptomsHeader}>
        <Text style={styles.label}>Symptomes observes</Text>
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonRecording]}
          onPress={toggleRecording}
          disabled={isTranscribing || loading}
        >
          {isTranscribing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <View style={styles.iconButtonInner}>
              <MaterialCommunityIcons
                name={isRecording ? 'stop-circle-outline' : 'microphone-outline'}
                size={16}
                color="#ffffff"
              />
              <Text style={styles.micButtonText}>{isRecording ? 'Stop' : 'Dictee'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TextInput
        multiline
        value={symptoms}
        onChangeText={(text) => {
          setSymptoms(text);
          setErrors((prev) => ({ ...prev, symptoms: undefined }));
        }}
        style={styles.textArea}
        placeholder="Fievre, toux, fatigue depuis 2 jours..."
        editable={!isTranscribing && !loading}
      />

      {errors.symptoms ? <Text style={styles.fieldError}>{errors.symptoms}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading || isTranscribing}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Obtenir triage</Text>
        )}
      </TouchableOpacity>
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
    marginBottom: 8,
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 6,
    fontFamily: Fonts.heading,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
  },
  fieldError: {
    color: '#dc2626',
    fontSize: 11,
    marginTop: 4,
  },
  sexRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sexButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  sexButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  sexButtonText: {
    color: '#334155',
    fontFamily: Fonts.heading,
  },
  sexButtonTextActive: {
    color: '#ffffff',
  },
  symptomsHeader: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  micButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 68,
    alignItems: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#be123c',
  },
  micButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  iconButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    minHeight: 120,
    textAlignVertical: 'top',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontFamily: Fonts.display,
    fontSize: 14,
  },
  resultCard: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
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
  resultDiagnosis: {
    fontSize: 20,
    fontFamily: Fonts.display,
  },
  resultPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
});
