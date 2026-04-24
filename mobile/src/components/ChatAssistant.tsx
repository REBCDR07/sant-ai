import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatWithAI, transcribeAudio } from '../services/aiService';
import { ChatMessage } from '../types';
import { Fonts } from '../theme/typography';

const START_MESSAGE: ChatMessage = {
  role: 'model',
  text: 'Bonjour. Je suis l assistant IA SanteAI. Comment puis-je vous aider ?',
};

function resolveMimeTypeFromUri(uri: string) {
  const normalized = uri.toLowerCase();
  if (normalized.endsWith('.m4a')) return 'audio/m4a';
  if (normalized.endsWith('.caf')) return 'audio/x-caf';
  if (normalized.endsWith('.3gp')) return 'audio/3gpp';
  if (normalized.endsWith('.aac')) return 'audio/aac';
  if (normalized.endsWith('.wav')) return 'audio/wav';
  if (normalized.endsWith('.mp3')) return 'audio/mpeg';
  return 'audio/mp4';
}

function dataUrlToPayload(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Format audio web non reconnu');
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

async function getAudioPayload(uri: string) {
  if (Platform.OS !== 'web') {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      base64,
      mimeType: resolveMimeTypeFromUri(uri),
    };
  }

  const response = await fetch(uri);
  const blob = await response.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const ReaderCtor = (globalThis as any).FileReader;
    if (!ReaderCtor) {
      reject(new Error('FileReader indisponible sur ce navigateur'));
      return;
    }

    const reader = new ReaderCtor();
    reader.onerror = () => reject(new Error('Lecture du vocal impossible'));
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });

  const { base64, mimeType } = dataUrlToPayload(dataUrl);
  return {
    base64,
    mimeType: mimeType || 'audio/webm',
  };
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([START_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading && !isTranscribing,
    [input, loading, isTranscribing],
  );

  const speakIfEnabled = (text: string) => {
    if (!isSoundEnabled) return;
    Speech.stop();
    Speech.speak(text.replace(/[*#_`]/g, ''), {
      language: 'fr-FR',
      rate: 0.98,
    });
  };

  const handleSend = async (forcedText?: string) => {
    const textToSend = (forcedText ?? input).trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = { role: 'user', text: textToSend };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    if (!forcedText) setInput('');
    setLoading(true);

    try {
      const payload = nextMessages.map((entry) => ({
        role: entry.role,
        parts: [{ text: entry.text }],
      }));

      const answer = await chatWithAI(payload);
      const assistantReply: ChatMessage = { role: 'model', text: answer };
      const finalMessages: ChatMessage[] = [...nextMessages, assistantReply];
      setMessages(finalMessages);
      speakIfEnabled(answer);
    } catch (error: any) {
      const failure = `Erreur assistant: ${error?.message || 'connexion impossible'}`;
      const assistantError: ChatMessage = { role: 'model', text: failure };
      const finalMessages: ChatMessage[] = [...nextMessages, assistantError];
      setMessages(finalMessages);
      speakIfEnabled(failure);
    } finally {
      setLoading(false);
    }
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

      const { base64, mimeType } = await getAudioPayload(uri);
      const text = (await transcribeAudio(base64, mimeType)).trim();

      if (!text) {
        const failure = 'Aucun texte detecte. Reessayez plus pres du micro.';
        setMessages((prev) => [...prev, { role: 'model', text: failure }]);
        speakIfEnabled(failure);
        return;
      }

      setInput(text);
      await handleSend(text);
    } catch (error: any) {
      const failure = `Erreur vocal: ${error?.message || 'transcription impossible'}`;
      setMessages((prev) => [...prev, { role: 'model', text: failure }]);
      speakIfEnabled(failure);
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
        const failure = 'Autorisation micro requise pour dictee';
        setMessages((prev) => [...prev, { role: 'model', text: failure }]);
        speakIfEnabled(failure);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error: any) {
      const failure = error?.message
        ? `Impossible de demarrer le micro: ${error.message}`
        : 'Impossible de demarrer le micro';
      setMessages((prev) => [...prev, { role: 'model', text: failure }]);
      speakIfEnabled(failure);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setIsOpen(true)}>
        <MaterialCommunityIcons name="robot-happy-outline" size={24} color="#ffffff" />
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrap}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assistant SanteAI</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => {
                    if (isSoundEnabled) Speech.stop();
                    setIsSoundEnabled((prev) => !prev);
                  }}
                >
                  <View style={styles.headerButtonInner}>
                    <MaterialCommunityIcons
                      name={isSoundEnabled ? 'volume-high' : 'volume-off'}
                      size={14}
                      color="#ffffff"
                    />
                    <Text style={styles.headerButtonText}>{isSoundEnabled ? 'Voix On' : 'Voix Off'}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={() => setIsOpen(false)}>
                  <View style={styles.headerButtonInner}>
                    <MaterialCommunityIcons name="close" size={14} color="#ffffff" />
                    <Text style={styles.headerButtonText}>Fermer</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.messagesList}>
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                return (
                  <View
                    key={`${message.role}-${index}`}
                    style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}
                  >
                    <Text style={[styles.messageText, isUser && styles.userBubbleText]}>
                      {message.text}
                    </Text>
                  </View>
                );
              })}

              {loading ? (
                <View style={[styles.messageBubble, styles.botBubble, styles.loadingBubble]}>
                  <ActivityIndicator color="#334155" size="small" />
                  <Text style={styles.loadingText}>Assistant en cours...</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={toggleRecording}
                disabled={loading || isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <MaterialCommunityIcons
                    name={isRecording ? 'stop-circle-outline' : 'microphone-outline'}
                    size={18}
                    color="#ffffff"
                  />
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={isRecording ? 'Ecoute en cours...' : 'Posez votre question...'}
                editable={!isRecording && !isTranscribing && !loading}
                multiline
              />

              <TouchableOpacity
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!canSend}
              >
                <View style={styles.sendButtonInner}>
                  <MaterialCommunityIcons name="send-outline" size={14} color="#ffffff" />
                  <Text style={styles.sendButtonText}>Envoyer</Text>
                </View>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalWrap: {
    maxHeight: '92%',
    minHeight: '72%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Fonts.display,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  headerButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#f8fafc',
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0f766e',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#1e293b',
    fontSize: 13,
    lineHeight: 19,
  },
  userBubbleText: {
    color: '#ffffff',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#334155',
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#be123c',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  sendButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: Fonts.display,
  },
  sendButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
