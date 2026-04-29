export type Severity = 'Critique' | 'Urgent' | 'Modéré' | 'Stable';
export type MalnutritionRiskLevel = 'Faible' | 'Modéré' | 'Élevé';
export type AnalysisOrigin = 'online' | 'cache' | 'offline';

export interface MalnutritionSubjectFinding {
  subjectIndex: number;
  label: string;
  location?: string;
  visibleSigns: string[];
  suspectedCondition: string;
  riskScore: number;
  riskLevel: MalnutritionRiskLevel;
  analysis: string;
  recommendations: string;
  urgentSigns?: string[];
  confidence?: number;
}

export interface MalnutritionAnalysis {
  riskScore: number;
  riskLevel: MalnutritionRiskLevel;
  analysis: string;
  recommendations: string;
  peopleDetected: number;
  overallSummary: string;
  subjects: MalnutritionSubjectFinding[];
  imageQuality?: string;
  scanNotes?: string;
  imageNotes?: string;
  analysisOrigin?: AnalysisOrigin;
  offlineReason?: string;
}

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
  analysisOrigin?: AnalysisOrigin;
}

export interface MalnutritionCheck extends MalnutritionAnalysis {
  id: string;
  imageUrl: string;
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

export interface HealthCenter {
  placeId: string;
  name: string;
  address: string;
  distanceMeters: number;
  distanceText: string;
  rating?: number;
  openNow?: boolean;
  latitude: number;
  longitude: number;
  types: string[];
  mapsUrl: string;
  directionsUrl: string;
}

export interface HealthCenterSearchResponse {
  userLatitude: number;
  userLongitude: number;
  radiusMeters: number;
  nearestCenter: HealthCenter | null;
  centers: HealthCenter[];
  queryTerms: string[];
  source: 'google_places';
}
