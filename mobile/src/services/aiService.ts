import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AnalysisOrigin,
  Case,
  MalnutritionAnalysis,
  MalnutritionRiskLevel,
  MalnutritionSubjectFinding,
  Severity,
} from '../types';
import { postJson } from './api';

const AI_CACHE_STORAGE_KEY = 'santeai_ai_cache_v3';
const AI_CACHE_LIMIT = 40;

type CacheKind = 'symptoms' | 'malnutrition';

type CacheEntry<T> = {
  kind: CacheKind;
  key: string;
  value: T;
  timestamp: string;
};

type MalnutritionAnalysisInput = {
  imageNotes?: string;
  patientNotes?: string;
};

function normalizeSeverity(value: string | undefined): Severity {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'critique':
      return 'Critique';
    case 'urgent':
      return 'Urgent';
    case 'stable':
      return 'Stable';
    case 'modéré':
    case 'modere':
    default:
      return 'Modéré';
  }
}

function normalizeRiskLevel(value: string | undefined): MalnutritionRiskLevel {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'faible':
      return 'Faible';
    case 'élevé':
    case 'eleve':
      return 'Élevé';
    case 'modéré':
    case 'modere':
    default:
      return 'Modéré';
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function looksLikeMedicalRefusal(text: unknown) {
  const content = normalizeText(text).toLowerCase();
  if (!content) return false;

  return /je ne peux pas|je ne dois pas|je ne parviens pas|je ne parviens pas a|je ne peux pas realiser|je ne peux pas conclure|sans examen clinique|diagnostic medical fiable|ne parviens pas a exploiter|ne peux pas exploiter|refus/i.test(
    content,
  );
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeText(entry)).filter((entry) => entry.length > 0);
}

function clampScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function scoreToRiskLevel(score: number): MalnutritionRiskLevel {
  if (score >= 70) {
    return 'Élevé';
  }
  if (score >= 40) {
    return 'Modéré';
  }
  return 'Faible';
}

function hasSpecificMalnutritionEvidence(text: unknown) {
  const content = normalizeText(text).toLowerCase();
  if (!content) return false;

  return /marasme|kwashiorkor|oedeme|oedemes|edeme|malnutrition|sous-nutrition|maigr(e|eur)|cachexie|fonte musculaire|peau plissee|os visibles|cheveux.*(clairsem|fins|decolor|cassant|terne)|decoloration des cheveux|perte de cheveux|lesion cutanee|dermat|dehydrat|muac|pb\/?muac|refus de boire|ne mange pas|anorexie|visage de vieillard|pieds gonfles|mains gonflees/i.test(
    content,
  );
}

function riskScoreForLevel(value: unknown) {
  switch (normalizeRiskLevel(typeof value === 'string' ? value : '')) {
    case 'Élevé':
      return 84;
    case 'Faible':
      return 24;
    default:
      return 56;
  }
}

function deriveRiskScoreFromText(text: unknown) {
  const content = normalizeText(text).toLowerCase();
  if (!content || looksLikeMedicalRefusal(content)) return 0;

  let score = 0;

  if (/(kwashiorkor|oedeme|oedemes|edeme|edemes|bilateral)/.test(content)) {
    score += 32;
  }
  if (/(marasme|fonte musculaire|maigr(e|eur)|cache|cachexie|peau plissee|os visibles)/.test(content)) {
    score += 30;
  }
  if (/(cheveux.*(clairsem|fins|decolor|cassant|terne)|decoloration des cheveux|perte de cheveux)/.test(content)) {
    score += 12;
  }
  if (/(diarrhee|vomissement|dehydrat|refus de boire|ne mange pas|anorexie)/.test(content)) {
    score += 10;
  }
  if (/(flou|cache|occlus|hors cadre|incertain|difficile a voir|peu visible)/.test(content)) {
    score -= 12;
  }
  if (/(plusieurs personnes|deux personnes|trois personnes|groupe|multiple)/.test(content)) {
    score += 4;
  }

  return clampScore(score);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function buildCacheKey(kind: CacheKind, ...parts: Array<string | number | boolean | undefined>) {
  const normalized = parts.map((part) => String(part ?? '')).join('||');
  return `${kind}:${hashString(normalized)}`;
}

async function readCache<T>(kind: CacheKind, key: string): Promise<T | null> {
  try {
    const rawValue = await AsyncStorage.getItem(AI_CACHE_STORAGE_KEY);
    if (!rawValue) return null;

    const entries = JSON.parse(rawValue) as Array<CacheEntry<T>>;
    const match = entries.find((entry) => entry.kind === kind && entry.key === key);
    return match ? match.value : null;
  } catch {
    return null;
  }
}

async function writeCache<T>(kind: CacheKind, key: string, value: T) {
  try {
    const rawValue = await AsyncStorage.getItem(AI_CACHE_STORAGE_KEY);
    const existing = rawValue ? (JSON.parse(rawValue) as Array<CacheEntry<T>>) : [];
    const withoutSameKey = existing.filter((entry) => !(entry.kind === kind && entry.key === key));

    const nextEntries: Array<CacheEntry<T>> = [
      {
        kind,
        key,
        value,
        timestamp: new Date().toISOString(),
      },
      ...withoutSameKey,
    ].slice(0, AI_CACHE_LIMIT);

    await AsyncStorage.setItem(AI_CACHE_STORAGE_KEY, JSON.stringify(nextEntries));
  } catch {
    // no-op
  }
}

function isOfflineLikeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /fetch|network|connexion|timeout|enotfound|econnrefused|failed to fetch/i.test(message);
}

function normalizeAnalysisOrigin(origin: AnalysisOrigin): AnalysisOrigin {
  return origin;
}

function normalizeSymptomsResult(data: any): Omit<Case, 'id' | 'timestamp' | 'symptoms' | 'age' | 'weight' | 'sex'> {
  return {
    diseaseCategory: normalizeText(data?.diseaseCategory) || 'indetermine',
    diagnosis: normalizeText(data?.diagnosis) || 'Analyse indisponible',
    severity: normalizeSeverity(data?.severity),
    instructions:
      normalizeText(data?.instructions) ||
      'Reevaluer l etat du patient, surveiller les signes de danger et orienter si besoin.',
    medications:
      normalizeText(data?.medications) ||
      'Traitement symptomatique selon le protocole local et l avis du superviseur.',
    analysisOrigin: normalizeAnalysisOrigin('online'),
  };
}

function buildOfflineSymptomsAnalysis(
  symptoms: string,
  age: number,
  weight: number,
  sex: 'M' | 'F',
): Omit<Case, 'id' | 'timestamp' | 'symptoms' | 'age' | 'weight' | 'sex'> {
  const text = normalizeText(symptoms).toLowerCase();
  const isChild = age > 0 && age <= 12;
  const patientLabel = isChild ? 'enfant' : sex === 'M' ? 'homme' : 'femme';

  const hasSevereDanger = /(convuls|inconscient|coma|respir.*difficile|detresse respiratoire|bleu|hemorrag|saignement abondant|ne boit pas|refuse de boire|vomit.*sans arret|mouvements anormaux)/.test(
    text,
  );
  const hasPneumonia = /(toux|respir).*?(difficile|rapide|sifflement|tirage)|douleur thoracique|fievre.*toux|toux.*fievre/.test(
    text,
  );
  const hasMalaria = /(fievre|frissons|maux de tete|sueurs|vomissement).*?(palud|malaria)|paludisme|fievre.*frissons/.test(
    text,
  );
  const hasDiarrhea = /(diarrhee|selles liquides|selles.*sang|dehydrat|vomissements?)/.test(text);
  const hasMalnutrition = /(maigre|amaigri|perte de poids|manque d appetit|oedeme|oedemes|cheveux.*(jaunes|decolor|clairsem)|marasme|kwashiorkor)/.test(
    text,
  );

  let severity: Severity = 'Modéré';
  let diseaseCategory = 'infection non precise';
  let diagnosis = `Suspicion d infection ou de probleme aigu chez ${patientLabel}.`;
  let instructions =
    'Verifier les signes vitaux, hydrater si possible, surveiller la respiration et reevaluer rapidement.';
  let medications =
    'Paracetamol selon le poids si fievre, hydratation orale, et orientation selon le protocole local.';

  if (hasSevereDanger) {
    severity = 'Critique';
    diseaseCategory = 'urgence_vitale';
    diagnosis = 'Signes de danger vitaux detectes en mode hors ligne.';
    instructions =
      'Transferer immediatement vers un centre de reference. Position laterale de securite si necessaire. Surveiller respiration et conscience.';
    medications = 'Aucun traitement lourd a domicile. Stabilisation, surveillance et transfert immediat.';
  } else if (hasPneumonia) {
    severity = 'Urgent';
    diseaseCategory = 'pneumonie_probable';
    diagnosis = 'Pneumonie ou infection respiratoire basse probable.';
    instructions =
      'Evaluer la respiration, la temperature et la saturation si disponible. Referer rapidement si tirage, polypnee ou lethargie.';
    medications = 'Antipyretique selon le poids, hydratation, et antibiotherapie selon protocole local.';
  } else if (hasMalaria) {
    severity = 'Urgent';
    diseaseCategory = 'paludisme_probable';
    diagnosis = 'Paludisme probable en mode hors ligne.';
    instructions =
      'Faire un test rapide si disponible. Surveiller vomissements, somnolence et incapacité a boire. Referer si signe de gravite.';
    medications = 'Antipiretique selon le poids, hydratation orale, traitement antipaludique selon protocole local.';
  } else if (hasDiarrhea) {
    severity = 'Urgent';
    diseaseCategory = 'diarrhee_aigue';
    diagnosis = 'Diarrhee aiguë avec risque de dehydratation.';
    instructions =
      'Donner solution de rehydratation orale, surveiller la dehydratation et referer si sang, vomissements repetes ou faiblesse.';
    medications = 'SRO, zinc selon l age et protocole local, antipyrétique si besoin.';
  } else if (hasMalnutrition) {
    severity = 'Urgent';
    diseaseCategory = 'malnutrition_suspectee';
    diagnosis = 'Malnutrition suspectee en mode hors ligne.';
    instructions =
      'Evaluer poids, oedemes, appetit et capacite a boire. Referer si oedemes, amaigrissement severe ou lethargie.';
    medications = 'Suivi nutritionnel, hydratation, alimentation therapeutique selon protocole local et avis medical.';
  }

  return {
    diseaseCategory,
    diagnosis,
    severity,
    instructions,
    medications,
    analysisOrigin: normalizeAnalysisOrigin('offline'),
  };
}

function normalizeMalnutritionSubject(subject: any, index: number): MalnutritionSubjectFinding {
  const visibleSigns = normalizeStringArray(subject?.visibleSigns);
  const urgentSigns = normalizeStringArray(subject?.urgentSigns);
  const fallbackText = [
    subject?.label,
    subject?.location,
    subject?.suspectedCondition,
    subject?.analysis,
    subject?.recommendations,
    visibleSigns.join(' '),
    urgentSigns.join(' '),
  ].join(' ');
  const riskScore = Math.max(
    clampScore(subject?.riskScore),
    riskScoreForLevel(subject?.riskLevel),
    deriveRiskScoreFromText(fallbackText),
  );
  const riskLevel = scoreToRiskLevel(riskScore);

  return {
    subjectIndex: Number.isFinite(Number(subject?.subjectIndex))
      ? Number(subject.subjectIndex)
      : index + 1,
    label: normalizeText(subject?.label) || `Personne ${index + 1}`,
    location: normalizeText(subject?.location) || undefined,
    visibleSigns,
    suspectedCondition: normalizeText(subject?.suspectedCondition) || 'Non précisé',
    riskScore,
    riskLevel,
    analysis:
      normalizeText(subject?.analysis) || normalizeText(subject?.summary) || '',
    recommendations:
      normalizeText(subject?.recommendations) || normalizeText(subject?.action) || '',
    urgentSigns,
    confidence:
      typeof subject?.confidence === 'number' && Number.isFinite(subject.confidence)
        ? subject.confidence
        : undefined,
  };
}

function buildFallbackSummary(subjects: MalnutritionSubjectFinding[]) {
  if (subjects.length === 0) return '';
  const topSubjects = [...subjects]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 2)
    .map((subject) => `${subject.label} : ${subject.suspectedCondition}`);
  return topSubjects.join(' / ');
}

function buildFallbackRecommendations(subjects: MalnutritionSubjectFinding[]) {
  const topSubjects = [...subjects]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 2)
    .map((subject) => subject.recommendations)
    .filter(Boolean);

  return topSubjects.join(' ');
}

function estimatePeopleCount(notes: string, imageCount: number) {
  const content = notes.toLowerCase();
  const numberMatch = content.match(/\b([2-9])\b/);
  if (numberMatch) return Math.max(2, Number(numberMatch[1]));

  if (/(plusieurs|groupe|multiple|deux personnes|trois personnes|deux enfants|trois enfants)/.test(content)) {
    return Math.max(2, imageCount);
  }

  return Math.max(1, Math.min(3, imageCount || 1));
}

function extractVisibleSigns(notes: string) {
  const content = notes.toLowerCase();
  const signs: string[] = [];

  if (/(oedeme|oedemes|pieds gonfl|visage gonfl|mains gonfl)/.test(content)) signs.push('oedemes visibles');
  if (/(maigre|amaigri|fonte musculaire|os visibles|peau plissee)/.test(content)) signs.push('maigreur severe');
  if (/(cheveux.*(clairs|decolor|fins|cassants)|perte de cheveux)/.test(content)) signs.push('cheveux alters');
  if (/(peau|plaies|lesions|dermatite)/.test(content)) signs.push('atteinte cutanee');
  if (/(fatigue|somnolence|faible)/.test(content)) signs.push('etat general altere');

  return signs;
}

function buildOfflineMalnutritionAnalysis(
  base64Images: string[],
  imageNotes?: string,
): MalnutritionAnalysis {
  const notes = normalizeText(imageNotes);
  const peopleDetected = estimatePeopleCount(notes, base64Images.length);
  const extractedSigns = extractVisibleSigns(notes);
  const narrative = [notes, extractedSigns.join(' ')].join(' ').trim();
  const derivedScore = Math.max(
    deriveRiskScoreFromText(narrative),
    notes ? 0 : 36,
    peopleDetected >= 2 ? 8 : 0,
  );
  const riskScore = derivedScore || 36;
  const riskLevel = scoreToRiskLevel(riskScore);
  const subjects: MalnutritionSubjectFinding[] = Array.from({ length: peopleDetected }, (_, index) => {
    const subjectScore = Math.max(riskScore - index * 4, 12);
    const subjectLevel = subjectScore >= 70 ? 'Élevé' : subjectScore >= 40 ? 'Modéré' : 'Faible';

    return {
      subjectIndex: index + 1,
      label: peopleDetected > 1 ? `Personne ${index + 1}` : 'Enfant observe',
      location: peopleDetected > 1 ? `Sujet ${index + 1}` : undefined,
      visibleSigns: extractedSigns,
      suspectedCondition:
        subjectLevel === 'Élevé'
          ? 'Malnutrition severe suspectee'
          : subjectLevel === 'Modéré'
            ? 'Malnutrition possible'
            : 'Aucun signe grave clair',
      riskScore: subjectScore,
      riskLevel: subjectLevel,
      analysis: notes
        ? `Analyse hors ligne basee sur la description: ${notes}`
        : 'Analyse hors ligne limitee. Connectez-vous pour une analyse visuelle plus precise.',
      recommendations:
        subjectLevel === 'Élevé'
          ? 'Transferer rapidement vers un centre de reference et surveiller les signes de gravite.'
          : subjectLevel === 'Modéré'
            ? 'Reevaluer l etat nutritionnel, verifier le poids et planifier un suivi rapide.'
            : 'Continuer la surveillance et refaire une analyse avec connexion si possible.',
      urgentSigns:
        subjectLevel === 'Élevé'
          ? ['oedemes', 'amaigrissement severe', 'letargie']
          : subjectLevel === 'Modéré'
            ? ['surveillance rapprochee']
            : [],
      confidence: notes ? 48 : 24,
    };
  });

  const overallSummary = notes
    ? `Mode hors ligne: ${peopleDetected} sujet(s) estime(s) a partir de la description fournie.`
    : 'Mode hors ligne: analyse visuelle limitee, connexion requise pour une lecture plus precise.';

  const recommendations =
    riskLevel === 'Élevé'
      ? 'Transferer rapidement si oedemes, amaigrissement severes ou lethargie. Reevaluer l hydratation et la prise alimentaire.'
      : riskLevel === 'Modéré'
        ? 'Organiser un suivi rapproché, peser l enfant et rechercher les signes de danger.'
        : 'Continuer la surveillance et refaire une analyse des que la connexion revient.';

  return {
    riskScore,
    riskLevel,
    analysis: overallSummary,
    recommendations,
    peopleDetected,
    overallSummary,
    subjects,
    imageQuality: notes ? 'Analyse hors ligne basee sur la description vocale ou texte.' : 'Analyse hors ligne limitee.',
    scanNotes: notes || 'Mode hors ligne active.',
    imageNotes: notes || undefined,
    analysisOrigin: normalizeAnalysisOrigin('offline'),
    offlineReason: 'Connexion indisponible ou API distante injoignable.',
  };
}

function normalizeMalnutritionAnalysis(data: any): MalnutritionAnalysis {
  const subjects: MalnutritionSubjectFinding[] = Array.isArray(data?.subjects)
    ? data.subjects.map(normalizeMalnutritionSubject).filter(Boolean)
    : [];

  const sourceNarrative = [
    data?.overallSummary,
    data?.analysis,
    data?.recommendations,
    data?.scanNotes,
    data?.imageQuality,
    ...subjects.flatMap((subject) => [
      subject.analysis,
      subject.recommendations,
      subject.suspectedCondition,
      subject.visibleSigns.join(' '),
      (subject.urgentSigns ?? []).join(' '),
    ]),
  ].join(' ');

  const hasSpecificEvidence = hasSpecificMalnutritionEvidence(sourceNarrative);
  const topSubject = [...subjects].sort((a, b) => b.riskScore - a.riskScore)[0];
  const peopleDetectedRaw = Number(data?.peopleDetected);
  const peopleDetected = hasSpecificEvidence
    ? Number.isFinite(peopleDetectedRaw)
      ? Math.max(0, Math.round(peopleDetectedRaw))
      : subjects.length
    : 0;

  const rawSummary =
    normalizeText(data?.overallSummary) ||
    normalizeText(data?.analysis) ||
    normalizeText(topSubject?.analysis);

  const rawRecommendations =
    normalizeText(data?.recommendations) ||
    normalizeText(topSubject?.recommendations);

  const derivedScore = Math.max(
    clampScore(data?.riskScore),
    topSubject?.riskScore ?? 0,
    data?.riskLevel ? riskScoreForLevel(data.riskLevel) : 0,
    topSubject?.riskLevel ? riskScoreForLevel(topSubject.riskLevel) : 0,
    deriveRiskScoreFromText(sourceNarrative),
  );

  let riskScore = derivedScore;
  if (!hasSpecificEvidence) {
    riskScore = Math.min(riskScore || 18, 18);
  }

  const riskLevel = scoreToRiskLevel(riskScore);

  let overallSummary = rawSummary || buildFallbackSummary(subjects);
  let recommendations = rawRecommendations || buildFallbackRecommendations(subjects);
  let scanNotes = normalizeText(data?.scanNotes) || undefined;
  let imageQuality = normalizeText(data?.imageQuality) || undefined;

  if (!hasSpecificEvidence) {
    overallSummary =
      'Image insuffisamment exploitable pour un triage visuel fiable. Reprendre une photo plus nette avec visage et corps visibles.';
    recommendations =
      'Reprendre la photo avec bonne lumière, visage et corps visibles, puis ajouter une description vocale si possible.';
    scanNotes = 'Analyse prudente: la réponse du modele ne montre pas de signe visuel exploitable.';
    imageQuality = 'Image insuffisamment exploitable.';
  } else if (subjects.length > 0 && !rawSummary) {
    overallSummary = buildFallbackSummary(subjects) || overallSummary;
  }

  return {
    riskScore: riskScore || riskScoreForLevel(riskLevel),
    riskLevel,
    peopleDetected,
    analysis: overallSummary,
    recommendations,
    overallSummary,
    subjects: hasSpecificEvidence ? subjects : [],
    imageQuality,
    scanNotes,
    imageNotes: normalizeText(data?.imageNotes) || undefined,
    analysisOrigin: normalizeAnalysisOrigin('online'),
    offlineReason: normalizeText(data?.offlineReason) || undefined,
  };
}

function buildMalnutritionAnalysisCacheKey(
  base64Images: string[],
  input: MalnutritionAnalysisInput,
) {
  const imageSignature = base64Images
    .map((image) => `${image.length}:${image.slice(0, 24)}:${image.slice(-24)}`)
    .join('|');

  return buildCacheKey('malnutrition', imageSignature, input.imageNotes, input.patientNotes);
}

function buildSymptomsCacheKey(
  symptoms: string,
  age: number,
  weight: number,
  sex: 'M' | 'F',
) {
  return buildCacheKey('symptoms', symptoms.trim().toLowerCase(), age, weight, sex);
}

function normalizeMalnutritionInput(
  input?: MalnutritionAnalysisInput,
): MalnutritionAnalysisInput {
  return {
    imageNotes: normalizeText(input?.imageNotes),
    patientNotes: normalizeText(input?.patientNotes),
  };
}

function mergeTextNotes(...notes: Array<string | undefined>) {
  return notes.map((entry) => normalizeText(entry)).filter(Boolean).join(' ');
}

function normalizeMalnutritionPayload(data: any, imageNotes?: string): MalnutritionAnalysis {
  const normalized = normalizeMalnutritionAnalysis({
    ...data,
    imageNotes,
  });
  return normalized;
}

export async function analyzeSymptoms(
  symptoms: string,
  age: number,
  weight: number,
  sex: 'M' | 'F',
): Promise<Omit<Case, 'id' | 'timestamp' | 'symptoms' | 'age' | 'weight' | 'sex'>> {
  const cacheKey = buildSymptomsCacheKey(symptoms, age, weight, sex);

  try {
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

    const normalized = normalizeSymptomsResult(data);
    await writeCache('symptoms', cacheKey, normalized);
    return normalized;
  } catch (error) {
    const cached = await readCache<Omit<Case, 'id' | 'timestamp' | 'symptoms' | 'age' | 'weight' | 'sex'>>(
      'symptoms',
      cacheKey,
    );
    if (cached) {
      return { ...cached, analysisOrigin: 'cache' };
    }

    return buildOfflineSymptomsAnalysis(symptoms, age, weight, sex);
  }
}

export async function analyzeMalnutritionImages(
  base64Images: string[],
  input?: MalnutritionAnalysisInput,
): Promise<MalnutritionAnalysis> {
  const normalizedInput = normalizeMalnutritionInput(input);
  const cacheKey = buildMalnutritionAnalysisCacheKey(base64Images, normalizedInput);

  try {
    const data = await postJson<unknown>('/api/analyze-malnutrition', {
      base64Images,
      imageNotes: normalizedInput.imageNotes,
      patientNotes: normalizedInput.patientNotes,
    });

    const normalized = normalizeMalnutritionPayload(data, normalizedInput.imageNotes);
    await writeCache('malnutrition', cacheKey, normalized);
    return normalized;
  } catch (error) {
    const cached = await readCache<MalnutritionAnalysis>('malnutrition', cacheKey);
    if (cached) {
      return {
        ...cached,
        analysisOrigin: 'cache',
        offlineReason: cached.offlineReason || 'Resultat recupere depuis le cache local.',
      };
    }

    return buildOfflineMalnutritionAnalysis(
      base64Images,
      normalizedInput.imageNotes || normalizedInput.patientNotes,
    );
  }
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
