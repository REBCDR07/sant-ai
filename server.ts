import dotenv from "dotenv";
import express from "express";

dotenv.config();

const BUILD_API_BASE_URL = "https://build.lewisnote.com/v1";

const AFRI_CHAT_API_KEY = process.env.AFRI_CHAT_API_KEY;
const AFRI_TTS_API_KEY = process.env.AFRI_TTS_API_KEY;
const AFRI_ASR_API_KEY = process.env.AFRI_ASR_API_KEY;

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
    const data = JSON.parse(text);

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
  const { base64Images } = req.body;

  if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
    return res.status(400).json({ error: "Au moins une image est requise" });
  }

  const prompt = `Tu es un expert medical (pediatrie et nutrition) au sein d une organisation humanitaire.
Ta mission est d effectuer un diagnostic visuel de la malnutrition infantile severe a partir de ces photos du patient.
Analyse minutieusement pour y deceler:
1. Marasme (fonte musculaire extreme, visage de vieillard, peau plissee).
2. Kwashiorkor (presence d oedemes bilateraux, lesions cutanees).
3. Signes capillaires (cheveux fins, clairsemes, decoloration, perte facile).

Renvoie la reponse UNIQUEMENT au format JSON avec ces proprietes:
- riskScore (entier de 0 a 100)
- riskLevel (exactement 'Faible', 'Modere', ou 'Eleve')
- analysis (analyse detaillee expliquee simplement)
- recommendations (actions recommandees pour l ASC)`;

  const content: any[] = [{ type: "text", text: prompt }];
  for (const image of base64Images) {
    content.push({
      type: "image_url",
      image_url: { url: image },
    });
  }

  try {
    const text = await callAfriChat([{ role: "user", content }], true);
    const data = JSON.parse(text);

    const validLevels = ["Faible", "Modéré", "Élevé"];
    if (data.riskLevel === "Modere") data.riskLevel = "Modéré";
    if (data.riskLevel === "Eleve") data.riskLevel = "Élevé";
    if (!validLevels.includes(data.riskLevel)) {
      data.riskLevel = "Modéré";
    }

    return res.json(data);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Erreur interne du serveur" });
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
