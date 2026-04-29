import dotenv from "dotenv";
import express from "express";
import { buildRelevantDiseaseReference } from "./data/probable-causes";

dotenv.config();

const BUILD_API_BASE_URL = "https://build.lewisnote.com/v1";

const AFRI_CHAT_API_KEY = process.env.AFRI_CHAT_API_KEY;
const AFRI_TTS_API_KEY = process.env.AFRI_TTS_API_KEY;
const AFRI_ASR_API_KEY = process.env.AFRI_ASR_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

type MalnutritionRiskLevel = "Faible" | "Modéré" | "Élevé";

type MalnutritionSubject = {
  subjectIndex?: number;
  label?: string;
  location?: string;
  visibleSigns?: string[] | string;
  suspectedCondition?: string;
  riskScore?: number;
  riskLevel?: string;
  analysis?: string;
  recommendations?: string;
  urgentSigns?: string[] | string;
  confidence?: number;
};

type RawMalnutritionAnalysis = {
  riskScore?: number;
  riskLevel?: string;
  peopleDetected?: number;
  overallSummary?: string;
  analysis?: string;
  recommendations?: string;
  imageQuality?: string;
  scanNotes?: string;
  subjects?: MalnutritionSubject[];
};

export const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

function requireApiKey(key: string | undefined, envName: string): string {
  if (!key) {
    throw new Error(`Cle API ${envName} manquante`);
  }
  return key;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clampScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function scoreToRiskLevel(score: number): MalnutritionRiskLevel {
  if (score >= 70) {
    return "Élevé";
  }
  if (score >= 40) {
    return "Modéré";
  }
  return "Faible";
}

function looksLikeMedicalRefusal(text: unknown) {
  const content = normalizeText(text).toLowerCase();
  if (!content) return false;

  return /je ne peux pas|je ne dois pas|je ne parviens pas|je ne peux pas realiser|je ne peux pas conclure|sans examen clinique|diagnostic medical fiable|ne parviens pas a exploiter|ne peux pas exploiter|refus/i.test(
    content,
  );
}

function hasSpecificMalnutritionEvidence(text: unknown) {
  const content = normalizeText(text).toLowerCase();
  if (!content) return false;

  return /marasme|kwashiorkor|oedeme|oedemes|edeme|malnutrition|sous-nutrition|maigr(e|eur)|cachexie|fonte musculaire|peau plissee|os visibles|cheveux.*(clairsem|fins|decolor|cassant|terne)|decoloration des cheveux|perte de cheveux|lesion cutanee|dermat|dehydrat|muac|pb\/?muac|refus de boire|ne mange pas|anorexie|visage de vieillard|pieds gonfles|mains gonflees/i.test(
    content,
  );
}

function normalizeRiskLevel(value: unknown): MalnutritionRiskLevel {
  switch (normalizeText(value).toLowerCase()) {
    case "faible":
      return "Faible";
    case "élevé":
    case "eleve":
      return "Élevé";
    case "modéré":
    case "modere":
    default:
      return "Modéré";
  }
}

function riskScoreForLevel(value: unknown) {
  switch (normalizeRiskLevel(value)) {
    case "Élevé":
      return 84;
    case "Faible":
      return 24;
    default:
      return 56;
  }
}

function deriveRiskScoreFromText(text: unknown) {
  const content = normalizeText(text).toLowerCase();
  if (!content) return 0;

  let score = 0;

  if (/(kwashiorkor|oedeme|oedemes|edeme|edemes|bilateral)/.test(content)) {
    score += 32;
  }
  if (/(marasme|fonte musculaire|maigr(e|eur)|cache|cachexie|peau plissee|ribs?|os visibles)/.test(content)) {
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

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }

  const text = normalizeText(value);
  return text ? [text] : [];
}

function haversineDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

function formatDistanceMeters(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters)) return 'distance inconnue';
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function parsePlaceTextAddress(result: any) {
  return normalizeText(result?.vicinity) || normalizeText(result?.formatted_address) || '';
}

function buildGoogleMapsUrl(placeName: string, placeId: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}&query_place_id=${encodeURIComponent(placeId)}`;
}

function buildGoogleDirectionsUrl(placeName: string, placeId: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeName)}&destination_place_id=${encodeURIComponent(placeId)}&travelmode=driving`;
}

function parseNearbyHealthCenters(
  results: any[],
  userLatitude: number,
  userLongitude: number,
) {
  const centers = new Map<string, any>();

  for (const result of results || []) {
    const placeId = normalizeText(result?.place_id);
    const latitude = Number(result?.geometry?.location?.lat);
    const longitude = Number(result?.geometry?.location?.lng);

    if (!placeId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const distanceMeters = haversineDistanceMeters(userLatitude, userLongitude, latitude, longitude);

    centers.set(placeId, {
      placeId,
      name: normalizeText(result?.name) || 'Centre de sante',
      address: parsePlaceTextAddress(result),
      distanceMeters,
      distanceText: formatDistanceMeters(distanceMeters),
      rating: typeof result?.rating === 'number' ? result.rating : undefined,
      openNow:
        typeof result?.opening_hours?.open_now === 'boolean'
          ? result.opening_hours.open_now
          : undefined,
      latitude,
      longitude,
      types: Array.isArray(result?.types)
        ? result.types.map((entry: unknown) => normalizeText(entry)).filter(Boolean)
        : [],
      mapsUrl: buildGoogleMapsUrl(normalizeText(result?.name) || 'Centre de sante', placeId),
      directionsUrl: buildGoogleDirectionsUrl(
        normalizeText(result?.name) || 'Centre de sante',
        placeId,
      ),
    });
  }

  return [...centers.values()].sort((a, b) => a.distanceMeters - b.distanceMeters);
}

function parseNearbySearchResponse(payload: any, userLatitude: number, userLongitude: number) {
  if (!payload || payload.status !== 'OK') {
    return [];
  }

  return parseNearbyHealthCenters(payload.results || [], userLatitude, userLongitude);
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error(`JSON invalide renvoye par le modele: ${text}`);
  }
}

function normalizeSubject(subject: MalnutritionSubject, index: number) {
  const visibleSigns = normalizeStringArray(subject?.visibleSigns);
  const urgentSigns = normalizeStringArray(subject?.urgentSigns);
  const fallbackText = [
    subject?.label,
    subject?.location,
    subject?.suspectedCondition,
    subject?.analysis,
    subject?.recommendations,
    visibleSigns.join(" "),
    urgentSigns.join(" "),
  ].join(" ");
  const riskScore = Math.max(
    clampScore(subject?.riskScore),
    riskScoreForLevel(subject?.riskLevel),
    deriveRiskScoreFromText(fallbackText),
  );
  const riskLevel = scoreToRiskLevel(riskScore);

  return {
    subjectIndex:
      Number.isFinite(Number(subject?.subjectIndex)) && Number(subject?.subjectIndex) > 0
        ? Math.round(Number(subject?.subjectIndex))
        : index + 1,
    label: normalizeText(subject?.label) || `Personne ${index + 1}`,
    location: normalizeText(subject?.location) || undefined,
    visibleSigns,
    suspectedCondition: normalizeText(subject?.suspectedCondition) || "Non precise",
    riskScore,
    riskLevel,
    analysis:
      normalizeText(subject?.analysis) || normalizeText(subject?.suspectedCondition) || "",
    recommendations: normalizeText(subject?.recommendations) || "",
    urgentSigns,
    confidence:
      typeof subject?.confidence === "number" && Number.isFinite(subject.confidence)
        ? subject.confidence
        : undefined,
  };
}

function buildFallbackSummary(subjects: ReturnType<typeof normalizeSubject>[]) {
  if (subjects.length === 0) return "";

  return [...subjects]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 2)
    .map((subject) => `${subject.label} : ${subject.suspectedCondition}`)
    .join(" / ");
}

function buildFallbackRecommendations(subjects: ReturnType<typeof normalizeSubject>[]) {
  if (subjects.length === 0) return "";

  return [...subjects]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 2)
    .map((subject) => subject.recommendations)
    .filter(Boolean)
    .join(" ");
}

function normalizeMalnutritionAnalysis(rawData: RawMalnutritionAnalysis) {
  const subjects = Array.isArray(rawData.subjects)
    ? rawData.subjects.map((subject, index) => normalizeSubject(subject, index)).filter(Boolean)
    : [];

  const sourceNarrative = [
    rawData.overallSummary,
    rawData.analysis,
    rawData.recommendations,
    rawData.scanNotes,
    rawData.imageQuality,
    ...subjects.flatMap((subject) => [
      subject.analysis,
      subject.recommendations,
      subject.suspectedCondition,
      subject.visibleSigns.join(" "),
      subject.urgentSigns.join(" "),
    ]),
  ].join(" ");

  const hasSpecificEvidence = hasSpecificMalnutritionEvidence(sourceNarrative);
  const topSubject = [...subjects].sort((a, b) => b.riskScore - a.riskScore)[0];
  const parsedPeopleDetected = Number(rawData.peopleDetected);
  const peopleDetected = Number.isFinite(parsedPeopleDetected)
    ? Math.max(0, Math.round(parsedPeopleDetected))
    : subjects.length;

  const rawSummary =
    normalizeText(rawData.overallSummary) ||
    normalizeText(rawData.analysis) ||
    normalizeText(topSubject?.analysis);

  const rawRecommendations =
    normalizeText(rawData.recommendations) ||
    normalizeText(topSubject?.recommendations);

  let overallSummary = rawSummary || buildFallbackSummary(subjects);
  let recommendations = rawRecommendations || buildFallbackRecommendations(subjects);
  let scanNotes = normalizeText(rawData.scanNotes) || undefined;
  let imageQuality = normalizeText(rawData.imageQuality) || undefined;

  let riskScore = Math.max(
    clampScore(rawData.riskScore),
    topSubject?.riskScore ?? 0,
    riskScoreForLevel(rawData.riskLevel),
    topSubject ? riskScoreForLevel(topSubject.riskLevel) : 0,
    deriveRiskScoreFromText(sourceNarrative),
  );

  if (!hasSpecificEvidence) {
    riskScore = Math.min(riskScore || 18, 18);
    overallSummary =
      'Image insuffisamment exploitable pour un triage visuel fiable. Reprendre une photo plus nette avec visage et corps visibles.';
    recommendations =
      'Reprendre la photo avec bonne lumière, visage et corps visibles, puis ajouter une description vocale si possible.';
    scanNotes = 'Analyse prudente: la réponse du modele ne montre pas de signe visuel exploitable.';
    imageQuality = 'Image insuffisamment exploitable.';
  }

  const riskLevel = scoreToRiskLevel(riskScore);

  return {
    riskScore: riskScore || riskScoreForLevel(riskLevel),
    riskLevel,
    peopleDetected: hasSpecificEvidence ? Math.max(peopleDetected, subjects.length) : 0,
    overallSummary,
    analysis: overallSummary,
    recommendations,
    subjects: hasSpecificEvidence ? subjects : [],
    imageQuality,
    scanNotes,
  };
}

async function callAfriChat(messages: any[], expectJson = false) {
  const apiKey = requireApiKey(AFRI_CHAT_API_KEY, "AFRI_CHAT_API_KEY");

  const payload: any = {
    model: "gpt-5.4",
    messages,
    extra_body: { reasoning_effort: "high" },
  };

  if (expectJson) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(`${BUILD_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API Chat (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

app.get("/healthz", (_req, res) => {
  return res.status(200).json({ status: "ok" });
});

app.post("/api/analyze-symptoms", async (req, res) => {
  const { symptoms, age, weight, sex } = req.body;

  if (!symptoms) {
    return res.status(400).json({ error: "Les symptomes sont requis" });
  }

  const prompt = `Tu es un medecin specialiste de la sante publique en Afrique rurale.
Un Agent de Sante Communautaire (ASC) consulte avec un patient.
Analyse les informations suivantes et fournis un diagnostic et une recommandation de triage.
Age: ${age} ans
Poids: ${weight} kg
Sexe: ${sex === "M" ? "Garcon/Homme" : "Fille/Femme"}
Symptomes observes: ${symptoms}

Base de reference des maladies et causes probables:
${buildRelevantDiseaseReference(symptoms, 6)}

Consignes de raisonnement:
- Compare les symptomes observes avec la base de reference ci-dessus.
- Choisis la maladie la plus probable, ou la plus urgente si plusieurs tableaux sont possibles.
- Utilise un diseaseCategory normalise et court, en lien avec la base.
- Si aucun tableau ne correspond parfaitement, donne le diagnostic le plus coherent et signale l incertitude dans les instructions.

Utilise des mots simples, pas de jargon complique.
Adapte les traitements aux realites des centres de soins primaires ou dispensaires de village.
Renvoie la reponse UNIQUEMENT au format JSON avec ces proprietes:
- diseaseCategory (chaine normalisee de la maladie pour clustering)
- diagnosis (diagnostic probable, explique simplement)
- severity (exactement: 'Critique', 'Urgent', 'Modere', ou 'Stable')
- instructions (conduite a tenir pour l ASC)
- medications (medicaments de premiere ligne pertinents)`;

  try {
    const text = await callAfriChat([{ role: "user", content: prompt }], true);
    const data = parseJsonObject(text);

    const validSeverities = ["Critique", "Urgent", "Modéré", "Stable"];
    if (data.severity === "Modere") data.severity = "Modéré";
    if (!validSeverities.includes(data.severity)) {
      data.severity = "Modéré";
    }

    return res.json(data);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Erreur interne du serveur" });
  }
});

app.post("/api/analyze-malnutrition", async (req, res) => {
  const { base64Images, imageNotes = "", patientNotes = "" } = req.body ?? {};

  if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
    return res.status(400).json({ error: "Au moins une image est requise" });
  }

  const systemPrompt = `Tu es un assistant de triage visuel pour des agents de sante communautaire en zone rurale.
Tu ne fournis pas de diagnostic definitif. Tu fais un pre-triage visuel exploitable.
Tu dois toujours retourner du JSON valide.
Si l image est floue, incomplète ou partiellement cachee, tu donnes quand meme le meilleur effort a partir des signes visibles et tu notes la limite dans scanNotes.
N ecris jamais de refus general, de rappel sur l examen clinique, ni d avertissement abstrait. Donne une sortie utile, concise et actionnable.`;

  const prompt = `Analyse visuelle de triage pour la malnutrition infantile.
Notes fournies par l ASC: ${imageNotes || 'aucune'}
Contexte additionnel: ${patientNotes || 'aucun'}
Analyse chaque image de facon detaillee et, si plusieurs personnes sont visibles sur une meme image, traite chaque personne ou chaque sujet visible separement.

A observer avec priorite:
1. Marasme (fonte musculaire extreme, visage de vieillard, peau plissee).
2. Kwashiorkor (presence d oedemes bilateraux, lesions cutanees).
3. Signes capillaires (cheveux fins, clairsemes, decoloration, perte facile).
4. Qualite du cadrage, flou, occlusions et incertitudes visibles.

Regles importantes:
- N invente jamais de signe si la personne est trop floue, cachee ou hors cadre.
- Si plusieurs personnes sont visibles, donne un resultat par sujet visible.
- Si un sujet n est pas clairement visible, signale-le dans scanNotes au lieu de sur-interpreter.
- Le risque global doit refleter le sujet le plus inquietant visible.
- Utilise les notes de l ASC pour affiner la lecture quand l image est partiellement cachee.
- Si aucun sujet n est exploitable, retourne une evaluation prudente avec riskScore bas, riskLevel Faible ou Modere selon le contexte, et explique simplement quoi refaire.

Renvoie la reponse UNIQUEMENT au format JSON valide avec cette structure:
{
  "riskScore": 0,
  "riskLevel": "Faible|Modere|Eleve",
  "peopleDetected": 1,
  "overallSummary": "Synthese courte de l image et du ou des sujets visibles",
  "analysis": "Meme synthese, en langage simple et actionnable",
  "recommendations": "Actions immediates pour l ASC",
  "imageQuality": "Note courte sur le flou, l occlusion ou la qualite du cadrage",
  "scanNotes": "Note de prudence si besoin",
  "subjects": [
    {
      "subjectIndex": 1,
      "label": "Enfant au centre",
      "location": "centre gauche",
      "visibleSigns": ["...", "..."],
      "suspectedCondition": "Marasme suspecte",
      "riskScore": 82,
      "riskLevel": "Eleve",
      "analysis": "Analyse precise pour ce sujet",
      "recommendations": "Conduite a tenir pour ce sujet",
      "urgentSigns": ["...", "..."],
      "confidence": 78
    }
  ]
}

Utilise des mots simples, concis et tres concrets pour un ASC sur le terrain.`;

  const content: any[] = [{ type: "text", text: prompt }];
  for (const image of base64Images) {
    content.push({
      type: "image_url",
      image_url: { url: image },
    });
  }

  try {
    const text = await callAfriChat([{ role: "user", content }], true);
    const parsed = parseJsonObject(text) as RawMalnutritionAnalysis;
    const data = normalizeMalnutritionAnalysis(parsed);

    return res.json(data);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Erreur interne du serveur" });
  }
});

app.post("/api/health-centers-nearby", async (req, res) => {
  const { latitude, longitude, radiusMeters = 15000 } = req.body ?? {};

  const userLatitude = Number(latitude);
  const userLongitude = Number(longitude);
  const resolvedRadius = Math.min(50000, Math.max(1000, Number(radiusMeters) || 15000));

  if (!Number.isFinite(userLatitude) || !Number.isFinite(userLongitude)) {
    return res.status(400).json({ error: "Latitude et longitude requises" });
  }

  const apiKey = GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Cle API GOOGLE_MAPS_API_KEY manquante" });
  }

  const queryTerms = ["health center", "clinic", "hospital", "centre de sante"];

  try {
    const resultSets = await Promise.all(
      queryTerms.map(async (term) => {
        try {
          const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
          url.searchParams.set("location", `${userLatitude},${userLongitude}`);
          url.searchParams.set("radius", String(resolvedRadius));
          url.searchParams.set("keyword", term);
          url.searchParams.set("key", apiKey);

          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error(`Google Places error (${response.status})`);
          }

          const payload = await response.json();
          return parseNearbySearchResponse(payload, userLatitude, userLongitude);
        } catch (error) {
          console.error(`Health center query failed for ${term}:`, error);
          return [];
        }
      }),
    );

    const dedupedCenters = new Map<string, any>();
    for (const center of resultSets.flat()) {
      if (!dedupedCenters.has(center.placeId)) {
        dedupedCenters.set(center.placeId, center);
      }
    }

    const centers = [...dedupedCenters.values()].sort(
      (a, b) => a.distanceMeters - b.distanceMeters,
    );

    return res.json({
      userLatitude,
      userLongitude,
      radiusMeters: resolvedRadius,
      nearestCenter: centers[0] || null,
      centers: centers.slice(0, 12),
      queryTerms,
      source: "google_places",
    });
  } catch (error: any) {
    console.error("Nearby centers error:", error);
    return res.status(500).json({ error: error.message || "Erreur lors de la recherche des centres" });
  }
});

app.post("/api/transcribe", async (req, res) => {
  const { base64Audio, mimeType, url, language } = req.body ?? {};

  const apiKey = AFRI_ASR_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Cle API AFRI_ASR_API_KEY manquante" });
  }

  const source = url || base64Audio;
  if (!source) {
    return res.status(400).json({ error: "L audio est requis" });
  }

  let resolvedUrl = source;
  if (
    typeof resolvedUrl === "string" &&
    !resolvedUrl.startsWith("http://") &&
    !resolvedUrl.startsWith("https://") &&
    !resolvedUrl.startsWith("data:")
  ) {
    const resolvedMimeType = mimeType || "audio/webm";
    resolvedUrl = `data:${resolvedMimeType};base64,${resolvedUrl}`;
  }

  const payload: Record<string, unknown> = {
    url: resolvedUrl,
    detect_language: !language,
  };

  if (language) {
    payload.language = language;
  }

  try {
    const response = await fetch(`${BUILD_API_BASE_URL}/audio/transcribe/realtime`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ASR API Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return res.json({
      text: result.text || "",
      confidence: result.confidence,
      language: result.language,
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return res.status(500).json({ error: error.message || "Erreur lors de la transcription" });
  }
});

app.post("/api/tts", async (req, res) => {
  const { text, voice = "nova", responseFormat = "mp3" } = req.body ?? {};

  if (!text) {
    return res.status(400).json({ error: "Texte requis" });
  }

  const apiKey = AFRI_TTS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Cle API AFRI_TTS_API_KEY manquante" });
  }

  try {
    const response = await fetch(`${BUILD_API_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        voice,
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API Error (${response.status}): ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const mimeType =
      responseFormat === "mp3"
        ? "audio/mpeg"
        : responseFormat === "wav"
          ? "audio/wav"
          : responseFormat === "opus"
            ? "audio/ogg"
            : responseFormat === "aac"
              ? "audio/aac"
              : "application/octet-stream";

    return res.json({
      audioBase64: audioBuffer.toString("base64"),
      mimeType,
      format: responseFormat,
      voice,
    });
  } catch (error: any) {
    console.error("TTS error:", error);
    return res.status(500).json({ error: error.message || "Erreur lors de la synthese vocale" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body ?? {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Historique des messages requis" });
  }

  const openAIMessages = messages.map((message: any) => {
    const textContent = Array.isArray(message.parts)
      ? message.parts.map((part: any) => part.text).join(" ")
      : "";

    return {
      role: message.role === "model" ? "assistant" : message.role,
      content: textContent,
    };
  });

  const systemPromptMessage = {
    role: "system",
    content:
      "Tu es l assistant IA medical integre a SanteAI. Tu aides les Agents de Sante Communautaires (ASC) en zones rurales. Donne des explications courtes, claires et actionnables. Oriente vers un medecin pour les cas graves. N utilise pas de Markdown.",
  };

  try {
    const text = await callAfriChat([systemPromptMessage, ...openAIMessages]);
    return res.json({ reply: text });
  } catch (error: any) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: error.message || "Erreur du chatbot" });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
