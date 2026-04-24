import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const AFRI_CHAT_API_KEY = process.env.AFRI_CHAT_API_KEY;
const AFRI_TTS_API_KEY = process.env.AFRI_TTS_API_KEY;
const AFRI_ASR_API_KEY = process.env.AFRI_ASR_API_KEY;

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

async function callAfriChat(messages: any[], expectJson: boolean = false) {
  if (!AFRI_CHAT_API_KEY) throw new Error("Clé API AFRI_CHAT_API_KEY manquante");
  
  const payload: any = {
    model: "gpt-5.4",
    messages: messages,
    extra_body: { reasoning_effort: "élevé" }
  };
  
  if (expectJson) {
      payload.response_format = { type: 'json_object' };
  }

  const res = await fetch("https://build.lewisnote.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${AFRI_CHAT_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erreur API Chat (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

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
Adapte les traitements aux réalités des centres de soins primaires ou dispensaires de village.
Renvoie la réponse UNIQUEMENT au format JSON avec ces propriétés:
- diseaseCategory (Chaîne de caractères normalisée de la maladie pour clustering)
- diagnosis (Diagnostic probable, expliqué simplement)
- severity (Doit être exactement: 'Critique', 'Urgent', 'Modéré', ou 'Stable')
- instructions (Conduite à tenir pour l'ASC - ex: Référer au centre, donner SRO)
- medications (Médicaments de première ligne pertinents)`;

    try {
      const text = await callAfriChat([{ role: "user", content: prompt }], true);
      const data = JSON.parse(text);
      
      const validSeverities = ['Critique', 'Urgent', 'Modéré', 'Stable'];
      if (!validSeverities.includes(data.severity)) {
        data.severity = 'Modéré'; // fallback
      }

      res.json(data);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Erreur interne du serveur" });
    }
});

// API Route: Malnutrition (Image)
app.post("/api/analyze-malnutrition", async (req, res) => {
    const { base64Images } = req.body; 
    
    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
      return res.status(400).json({ error: "Au moins une image est requise" });
    }

    const prompt = `Tu es un expert médical (pédiatrie et nutrition) au sein d'une organisation humanitaire.
Ta mission est d'effectuer un diagnostic visuel de la malnutrition infantile (MAM/MAS) sévère à partir de ces photos du patient.
Analyse minutieusement pour y déceler:
1. Marasme (fonte musculaire extrême, visage de vieillard, peau plissée).
2. Kwashiorkor (prête particulièrement attention à la présence d'œdèmes bilatéraux, lésions cutanées dermatoses).
3. Signes capillaires (cheveux fins, clairsemés, décoloration rousse/jaunâtre ou signe du drapeau, perte de cheveux facile).

Renvoie la réponse UNIQUEMENT au format JSON avec ces propriétés:
- riskScore (entier de 0 à 100)
- riskLevel (exactement 'Faible', 'Modéré', ou 'Élevé')
- analysis (Analyse détaillée des signes expliquée simplement)
- recommendations (Actions recommandées pour l'ASC)`;

    const content: any[] = [{ type: "text", text: prompt }];

    base64Images.forEach(base64Uri => {
        content.push({
            type: "image_url",
            image_url: { url: base64Uri }
        });
    });

    try {
      const text = await callAfriChat([{ role: "user", content: content }], true);
      const data = JSON.parse(text);
      
      const validLevels = ['Faible', 'Modéré', 'Élevé'];
      if (!validLevels.includes(data.riskLevel)) {
        data.riskLevel = 'Modéré';
      }

      res.json(data);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Erreur interne du serveur" });
    }
});

// API Route: Transcribe Audio
app.post("/api/transcribe", async (req, res) => {
    const { base64Audio, mimeType } = req.body;
    
    if (!base64Audio) return res.status(400).json({ error: "L'audio est requis" });

    // Ensure it's a full data URI
    let resolvedAudio = base64Audio;
    if (!base64Audio.startsWith('data:')) {
        const resolvedMimeType = mimeType || 'audio/webm';
        resolvedAudio = `data:${resolvedMimeType};base64,${base64Audio}`;
    }

    try {
      if (!AFRI_ASR_API_KEY) throw new Error("Clé API AFRI_ASR_API_KEY manquante");

      const response = await fetch("https://build.lewisnote.com/v1/audio/transcribe/realtime", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${AFRI_ASR_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: resolvedAudio,
            detect_language: true
        })
      });
      
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`ASR API Error: ${err}`);
      }

      const result = await response.json();
      res.json({ text: result.text || "" });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de la transcription" });
    }
});

// API Route: TTS
app.post("/api/tts", async (req, res) => {
    const { text } = req.body;
    
    if (!text) return res.status(400).json({ error: "Texte requis" });

    try {
      if (!AFRI_TTS_API_KEY) throw new Error("Clé API AFRI_TTS_API_KEY manquante");

      const response = await fetch("https://build.lewisnote.com/v1/audio/afri-voice/tts", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${AFRI_TTS_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
            lang: "fr"
        })
      });
      
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`TTS API Error: ${err}`);
      }

      const result = await response.json();
      res.json({ url: result.url });
    } catch (error: any) {
      console.error("TTS error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de la synthèse vocale" });
    }
});

// API Route: ChatBot AI
app.post("/api/chat", async (req, res) => {
    const { messages } = req.body; 
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Historique des messages requis" });
    }

    // Convert from Gemini format ({role: "user", parts: [{text: "..."}]}) to OpenAI format ({role: "user", content: "..."})
    const openAIMessages = messages.map(m => {
        let textContent = m.parts ? m.parts.map((p: any) => p.text).join(" ") : "";
        return {
            role: m.role === 'model' ? 'assistant' : m.role,
            content: textContent
        };
    });

    const systemPromptMessage = {
      role: 'system',
      content: "Tu es l'assistant IA médical intégré à SantéAI. Ton rôle est de conseiller et d'orienter les Agents de Santé Communautaires (ASC) dans des zones rurales ou des dispensaires. Fournis des explications claires, concises, des rappels de protocoles de santé primaires et réponds à leurs doutes. Reste professionnel, empathique, et n'oublie jamais de conseiller la référence vers un médecin pour les cas graves. IMPORTANT: N'utilise JAMAIS de formatage Markdown (pas d'astérisques * ni texte en gras ou italique). Structure tes réponses avec des sauts de ligne ou des tirets simples (-) uniquement, pour que ton texte puisse être lu vocalement."
    };

    try {
      const text = await callAfriChat([systemPromptMessage, ...openAIMessages]);
      res.json({ reply: text });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message || "Erreur du chatbot" });
    }
});

// Vite middleware for development
async function setupVite() {
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
}

if (!process.env.VERCEL) {
  setupVite().then(() => {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
