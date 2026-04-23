import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Setup keys from env (for local/API key auth if available)
const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(Boolean) as string[];

let currentKeyIndex = Math.floor(Math.random() * (API_KEYS.length || 1));

async function fetchWithKeyRotation(generateContentFn: (ai: GoogleGenAI) => Promise<any>) {
  let attempts = 0;
  // Make sure we have at least 3 attempts to allow retrying on 503s
  const maxAttempts = Math.max(API_KEYS.length, 3);

  while (attempts < maxAttempts) {
    try {
      // If we have API keys, use them. Otherwise, initialize without an API key
      // which will force the SDK to look for Application Default Credentials (ADC) or Vertex AI bindings.
      const ai = API_KEYS.length > 0 
        ? new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex % API_KEYS.length] })
        : new GoogleGenAI({}); 

      return await generateContentFn(ai);
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("quota");
      const isUnavailable = error?.status === 503 || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("high demand");
      
      attempts++;
      
      if (isRateLimit && API_KEYS.length > 0) {
        console.warn(`Clé API épuisée (Index: ${currentKeyIndex % API_KEYS.length}). Rotation à la clé suivante...`);
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        if (attempts >= maxAttempts) {
          throw new Error("Quotas épuisés sur la totalité des clés API disponibles (429). Veuillez réessayer plus tard.");
        }
        await new Promise(r => setTimeout(r, 600)); // Courte pause avant retry
      } else if (isUnavailable) {
        console.warn(`Serveur IA surchargé (503). Tentative de reconnexion dans 2 secondes...`);
        if (attempts >= maxAttempts) {
          throw new Error("L'IA est actuellement surchargée en raison d'une forte demande globale (503). Veuillez patienter quelques minutes et réessayer.");
        }
        await new Promise(r => setTimeout(r, 2000)); // Pause plus longue pour les 503
      } else {
        throw error;
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware pour parser le JSON avec une limite plus élevée pour les images base64
  app.use(express.json({ limit: '10mb' }));

  // API Route: Triage (Symptômes)
  app.post("/api/analyze-symptoms", async (req, res) => {
    const { symptoms, age, weight, sex } = req.body;
    
    if (!symptoms) {
      return res.status(400).json({ error: "Les symptômes sont requis" });
    }

    const prompt = `Tu es un médecin spécialiste de la santé publique en Afrique rurale. 
Un Agent de Santé Communautaire (ASC) consulte avec un patient.
Analyse les informations suivantes et fournis un diagnostic et une recommandation de triage.
Âge: ${age} ans
Poids: ${weight} kg
Sexe: ${sex === 'M' ? 'Garçon/Homme' : 'Fille/Femme'}
Symptômes observés: ${symptoms}

Utilise des mots simples, pas de jargon compliqué. 
Adapte les traitements aux réalités des centres de soins primaires ou dispensaires de village.`;

    try {
      const response = await fetchWithKeyRotation(async (aiClient) => {
        return aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                diseaseCategory: {
                  type: Type.STRING,
                  description: "Catégorie normalisée de la maladie pour clustering."
                },
                diagnosis: {
                  type: Type.STRING,
                  description: "Diagnostic probable, expliqué simplement."
                },
                severity: {
                  type: Type.STRING,
                  description: "Doit être l'une des valeurs EXACTES : 'Critique', 'Urgent', 'Modéré', 'Stable'.",
                },
                instructions: {
                  type: Type.STRING,
                  description: "Conduite à tenir pour l'ASC (ex: Référer au centre de santé, donner des SRO, etc)."
                },
                medications: {
                  type: Type.STRING,
                  description: "Médicaments de première ligne si disponibles et pertinents."
                }
              },
              required: ["diseaseCategory", "diagnosis", "severity", "instructions", "medications"],
            }
          }
        });
      });

      const text = response.text;
      if (!text) throw new Error("Invalid response from AI");
      const data = JSON.parse(text);
      
      const validSeverities = ['Critique', 'Urgent', 'Modéré', 'Stable'];
      if (!validSeverities.includes(data.severity)) {
        data.severity = 'Modéré'; // fallback
      }

      res.json(data);
    } catch (error: any) {
      console.error(error);
      const isRateLimit = error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED");
      const isUnavailable = error?.status === 503 || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("high demand");
      
      const statusCode = isRateLimit ? 429 : isUnavailable ? 503 : 500;
      const errorMessage = isRateLimit 
          ? "Quota API épuisé (429). Le service est temporairement indisponible."
          : isUnavailable 
          ? "L'IA est actuellement surchargée (503). Veuillez réessayer plus tard." 
          : error.message || "Erreur interne du serveur";

      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // API Route: Malnutrition (Image)
  app.post("/api/analyze-malnutrition", async (req, res) => {
    const { base64Image } = req.body;
    
    if (!base64Image) {
      return res.status(400).json({ error: "L'image est requise" });
    }

    const prompt = `Tu es un expert médical (pédiatrie et nutrition) au sein d'une organisation humanitaire.
Ta mission est d'effectuer un diagnostic visuel de la malnutrition infantile (MAM/MAS) sévère à partir de photos.
Analyse cette image pour détecter des signes de : 
1. Marasme (fonte musculaire extrême, visage de vieillard, peau plissée).
2. Kwashiorkor (œdèmes bilatéraux, abdomen ballonné, lésions cutanées).
Retourne un score de risque, un niveau, l'analyse détaillée et des recommandations.`;

    let mimeType = 'image/jpeg';
    if (base64Image.startsWith('data:image/png')) mimeType = 'image/png';
    else if (base64Image.startsWith('data:image/webp')) mimeType = 'image/webp';
    else if (base64Image.startsWith('data:image/heic')) mimeType = 'image/heic';
    
    const base64Data = base64Image.split(',')[1] || base64Image;

    try {
      const response = await fetchWithKeyRotation(async (aiClient) => {
        return aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            prompt
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                riskScore: { type: Type.INTEGER, description: "Score de risque de malnutrition (0 à 100)." },
                riskLevel: { type: Type.STRING, description: "Doit être l'une des valeurs EXACTES : 'Faible', 'Modéré', 'Élevé'." },
                analysis: { type: Type.STRING, description: "Analyse des signes visibles expliquée simplement." },
                recommendations: { type: Type.STRING, description: "Actions recommandées pour l'ASC." }
              },
              required: ["riskScore", "riskLevel", "analysis", "recommendations"]
            }
          }
        });
      });

      const text = response.text;
      if (!text) throw new Error("Invalid response from AI");
      const data = JSON.parse(text);
      
      const validLevels = ['Faible', 'Modéré', 'Élevé'];
      if (!validLevels.includes(data.riskLevel)) {
        data.riskLevel = 'Modéré'; // fallback
      }

      res.json(data);
    } catch (error: any) {
      console.error(error);
      const isRateLimit = error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED");
      const isUnavailable = error?.status === 503 || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("high demand");
      
      const statusCode = isRateLimit ? 429 : isUnavailable ? 503 : 500;
      const errorMessage = isRateLimit 
          ? "Quota API épuisé (429). Le service est temporairement indisponible."
          : isUnavailable 
          ? "L'IA est actuellement surchargée (503). Veuillez réessayer plus tard." 
          : error.message || "Erreur interne du serveur";

      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // API Route: Transcribe Audio
  app.post("/api/transcribe", async (req, res) => {
    const { base64Audio, mimeType } = req.body;
    
    if (!base64Audio) {
      return res.status(400).json({ error: "L'audio est requis" });
    }

    const base64Data = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
    const resolvedMimeType = mimeType || 'audio/webm';

    try {
      const response = await fetchWithKeyRotation(async (aiClient) => {
        return aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: resolvedMimeType
              }
            },
            "Transcris cet audio médical avec une exactitude absolue de la dictée vocale. Utilise la langue parlée dans l'audio (probablement du français). N'ajoute AUCUN commentaire ni formatage exotique, renvoie strictement la transcription texte brut des symptômes ou du message. Corrige les fautes de frappe ou erreurs linguistiques pour la clarté."
          ]
        });
      });

      const text = response.text;
      if (!text) throw new Error("Invalid response from AI");
      
      res.json({ text: text.trim() });
    } catch (error: any) {
      console.error("Transcription error:", error);
      const isRateLimit = error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED");
      const isUnavailable = error?.status === 503 || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("high demand");
      
      const statusCode = isRateLimit ? 429 : isUnavailable ? 503 : 500;
      const errorMessage = isRateLimit 
          ? "Quota API épuisé (429). Le service est temporairement indisponible."
          : isUnavailable 
          ? "L'IA est actuellement surchargée (503). Veuillez réessayer plus tard." 
          : error.message || "Erreur lors de la transcription";

      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // API Route: ChatBot AI
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body; // Expects an array of { role: 'user' | 'model', parts: [{text: "..."}] }
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Historique des messages requis" });
    }

    const systemPromptMessage = {
      role: 'user',
      parts: [{ text: "Tu es l'assistant IA médical intégré à SantéAI. Ton rôle est de conseiller et d'orienter les Agents de Santé Communautaires (ASC) dans des zones rurales ou des dispensaires. Fournis des explications claires, concises, des rappels de protocoles de santé primaires et réponds à leurs doutes. Reste professionnel, empathique, et n'oublie jamais de conseiller la référence vers un médecin pour les cas graves." }]
    };

    const ackMessage = {
      role: 'model',
      parts: [{ text: "Compris. Je suis l'assistant SantéAI, prêt à aider l'ASC." }]
    };

    try {
      const response = await fetchWithKeyRotation(async (aiClient) => {
        return aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [systemPromptMessage, ackMessage, ...messages]
        });
      });

      const text = response.text;
      if (!text) throw new Error("Invalid response from AI");
      
      res.json({ reply: text });
    } catch (error: any) {
      console.error("Chat error:", error);
      const isRateLimit = error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED");
      const isUnavailable = error?.status === 503 || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("high demand");
      
      const statusCode = isRateLimit ? 429 : isUnavailable ? 503 : 500;
      const errorMessage = isRateLimit 
          ? "Quota API épuisé (429). Le service est temporairement indisponible."
          : isUnavailable 
          ? "L'IA est actuellement surchargée (503). Veuillez réessayer plus tard." 
          : error.message || "Erreur du chatbot";

      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
