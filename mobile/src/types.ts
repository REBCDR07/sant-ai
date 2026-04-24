export type Severity = 'Critique' | 'Urgent' | 'Modéré' | 'Stable';

export interface Case {
  id: string;
  symptoms: string;
  age: number;
  weight: number;
  sex: 'M' | 'F';
  diseaseCategory: string;
  diagnosis: string;
  severity: Severity;
  instructions: string;
  medications: string;
  timestamp: string;
  followUpDate?: string;
  followUpCompleted?: boolean;
}

export interface MalnutritionCheck {
  id: string;
  imageUrl: string;
  riskScore: number;
  riskLevel: 'Faible' | 'Modéré' | 'Élevé';
  analysis: string;
  recommendations: string;
  timestamp: string;
  followUpDate?: string;
  followUpCompleted?: boolean;
}

export interface Alert {
  id: string;
  disease: string;
  count: number;
  location: string;
  recommendations: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
