import { Case, MalnutritionCheck, Severity } from '../types';
import { postJson } from './api';

export async function analyzeSymptoms(
  symptoms: string,
  age: number,
  weight: number,
  sex: 'M' | 'F',
): Promise<Omit<Case, 'id' | 'timestamp' | 'symptoms' | 'age' | 'weight' | 'sex'>> {
  const data = await postJson<{
    diseaseCategory: string;
    diagnosis: string;
    severity: Severity;
    instructions: string;
    medications: string;
  }>('/api/analyze-symptoms', {
    symptoms,
    age,
    weight,
    sex,
  });

  return {
    diseaseCategory: data.diseaseCategory,
    diagnosis: data.diagnosis,
    severity: data.severity,
    instructions: data.instructions,
    medications: data.medications,
  };
}

export async function analyzeMalnutritionImages(
  base64Images: string[],
): Promise<Omit<MalnutritionCheck, 'id' | 'imageUrl' | 'timestamp'>> {
  const data = await postJson<{
    riskScore: number;
    riskLevel: 'Faible' | 'Modéré' | 'Élevé';
    analysis: string;
    recommendations: string;
  }>('/api/analyze-malnutrition', {
    base64Images,
  });

  return {
    riskScore: data.riskScore,
    riskLevel: data.riskLevel,
    analysis: data.analysis,
    recommendations: data.recommendations,
  };
}

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string,
): Promise<string> {
  const data = await postJson<{ text: string }>('/api/transcribe', {
    base64Audio,
    mimeType,
  });

  return data.text;
}

export async function chatWithAI(
  messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
): Promise<string> {
  const data = await postJson<{ reply: string }>('/api/chat', {
    messages,
  });

  return data.reply;
}
