import { Case, MalnutritionCheck, Severity } from "../types";

export async function analyzeSymptoms(
  symptoms: string,
  age: number,
  weight: number,
  sex: 'M' | 'F'
): Promise<Omit<Case, 'id' | 'timestamp' | 'symptoms' | 'age' | 'weight' | 'sex'>> {
  
  const response = await fetch('/api/analyze-symptoms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms, age, weight, sex })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
  }

  const data = await response.json();
  return {
    diseaseCategory: data.diseaseCategory,
    diagnosis: data.diagnosis,
    severity: data.severity as Severity,
    instructions: data.instructions,
    medications: data.medications
  };
}

export async function analyzeMalnutritionImages(base64Images: string[]): Promise<Omit<MalnutritionCheck, 'id' | 'imageUrl' | 'timestamp'>> {
  const response = await fetch('/api/analyze-malnutrition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Images })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
  }

  const data = await response.json();
  return {
    riskScore: data.riskScore,
    riskLevel: data.riskLevel as 'Faible' | 'Modéré' | 'Élevé',
    analysis: data.analysis,
    recommendations: data.recommendations
  };
}

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Audio, mimeType })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

export async function generateTTSUrl(text: string): Promise<string> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
  }

  const data = await response.json();
  return data.url;
}

export async function chatWithAI(messages: Array<{ role: 'user'|'model', parts: Array<{ text: string }> }>): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}
