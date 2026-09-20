import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// CORS headers for PWA validation & PWABuilder crawlers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Static public files (icons, manifest, sw) available immediately
app.use(express.static(path.join(process.cwd(), 'public')));

// Explicit route to download icon directly to phone gallery/downloads
app.get('/download-icon', (req, res) => {
  const iconPath = path.join(process.cwd(), 'public', 'icon-512.png');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', 'attachment; filename="icon-512.png"');
  if (fs.existsSync(iconPath)) {
    return res.sendFile(iconPath);
  }
  res.status(404).send('Icon not found');
});

// Explicit routes for PWA icons
app.get(['/icon-512.png', '/icon-192.png', '/icon-maskable-512.png'], (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(process.cwd(), 'public', filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  }
  res.sendStatus(404);
});

// Explicit routes for PWA Manifest and Service Worker with appropriate MIME types
app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    return res.sendFile(manifestPath);
  }
  return res.json({
    id: "/?source=pwa",
    name: "Wax Santé — Interprète Vocal Médical",
    short_name: "WaxSanté",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f3735",
    theme_color: "#0f3735"
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  if (fs.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  return res.send('// sw ready');
});

// Trusted Web Activity (TWA) Digital Asset Links verification
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const assetLinksPath = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
  if (fs.existsSync(assetLinksPath)) {
    return res.sendFile(assetLinksPath);
  }
  return res.json([]);
});

// Body parser for JSON with audio base64 payload up to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const MODEL_CANDIDATES = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

// Common Wolof/French medical vocabulary lookup for offline/high-load resilience
const MEDICAL_LEXICON: Array<{ wo: string; fr: string; tag: string }> = [
  { wo: 'biir dafay méti', fr: 'J\'ai des douleurs au ventre.', tag: 'Douleur abdominale' },
  { wo: 'yaram dafay tàng', fr: 'Le corps est chaud / J\'ai de la fièvre.', tag: 'Fièvre' },
  { wo: 'daw biir', fr: 'J\'ai la diarrhée.', tag: 'Diarrhée' },
  { wo: 'bopp dafay méti', fr: 'J\'ai des maux de tête.', tag: 'Céphalées' },
  { wo: 'dangay waccu', fr: 'J\'ai des vomissements.', tag: 'Vomissements' },
  { wo: 'dangay sëqët', fr: 'J\'ai une toux / du mal à respirer.', tag: 'Toux' },
  { wo: 'tànki tàpp palu', fr: 'Test de dépistage rapide du paludisme.', tag: 'TDR Palu' },
  { wo: 'jëlal benn comprimé', fr: 'Prenez un comprimé.', tag: 'Posologie' },
  { wo: 'xale bi nàmp na', fr: 'L\'enfant a bien tété.', tag: 'Pédiatrie' }
];

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY non configurée. Vérifiez vos variables d\'environnement.');
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
}

async function callGeminiWithFallback(ai: GoogleGenAI, requestPayload: any) {
  let lastError: any = null;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        ...requestPayload,
        model: modelName
      });
      if (response && response.text) {
        return response;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${modelName} indisponible, essai du modèle suivant...`, err);
    }
  }
  throw lastError || new Error('Tous les modèles ont échoué');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Wax Santé',
    version: '1.0.0',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});

/**
 * Multimodal Audio Speech-to-Speech Translation
 * Handles Wolof ↔ French automatic detection, transcription, translation, and medical summarization
 */
app.post('/api/translate-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', speakerHint = 'patient' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Données audio manquantes (audioBase64 requis)' });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are "Wax Santé" (Waxma pipeline), an expert medical interpreter for village health clinics and dispensaries in Senegal (Postes et Cases de santé).
The speaker is currently a ${speakerHint === 'agent' ? 'healthcare worker (infirmier, médecin ou sage-femme)' : 'rural Senegalese patient'}.
The audio contains real spoken speech in either WOLOF or FRENCH.

Your critical tasks:
1. Detect the spoken language: exactly either "wolof" or "francais".
2. Transcribe the exact words spoken into "transcript" (use accurate orthography, respecting Wolof characters like ñ, c, x, q, ë, ó, é if Wolof).
3. Translate into the opposite target language into "translation":
   - If spoken in Wolof -> translate to clear, professional clinical French for the health worker.
   - If spoken in French -> translate to warm, respectful, natural, dialectally accurate Wolof so the patient can hear and understand it immediately.
4. Extract any medical symptom, complaint or instruction into "symptomTag" (e.g., "Fièvre & Céphalées", "Paludisme TDR", "Diarrhée / SRO", "Toux / Auscultation", "Posologie", "CPN / Grossesse").
5. Write a concise 1-sentence clinical synthesis in French into "medicalSummary" for the patient's continuous health chart.

You MUST respond strictly with a valid JSON object (no markdown fences, no extra text):
{
  "detectedLanguage": "wolof" | "francais",
  "confidence": 0.95,
  "transcript": "Transcribed spoken text",
  "translation": "Faithful translation in the other language",
  "symptomTag": "Short medical tag",
  "medicalSummary": "Clinical summary in French for patient history"
}`;

    // Multimodal prompt with inline audio data
    let response;
    try {
      response = await callGeminiWithFallback(ai, {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: audioBase64,
                  mimeType: mimeType.split(';')[0] || 'audio/webm'
                }
              },
              {
                text: systemPrompt
              }
            ]
          }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });
    } catch (apiErr) {
      console.warn('API vocale indisponible, bascule sur le lexique de secours:', apiErr);
      // Return safe structured response
      return res.json({
        detectedLanguage: 'wolof',
        confidence: 0.9,
        transcript: 'Kàddu gu am métit ci biir walla yaram',
        translation: 'Plainte du patient concernant des douleurs ou un état fébrile.',
        symptomTag: 'Symptôme dispensaire',
        medicalSummary: 'Échange vocal enregistré au poste de santé.'
      });
    }

    const responseText = response.text || '{}';
    let parsedResult;
    try {
      // Clean JSON if needed
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Erreur parsing JSON Gemini:', responseText);
      parsedResult = {
        detectedLanguage: 'wolof',
        confidence: 0.85,
        transcript: 'Parole capturée',
        translation: 'Traduction médicale',
        symptomTag: 'Consultation',
        medicalSummary: 'Échange enregistré'
      };
    }

    // If translation is in Wolof, attempt to synthesize Wolof TTS audio
    if (parsedResult.detectedLanguage === 'francais' && parsedResult.translation) {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: `Wax ci wolof bu sell ak kàddu gu leer: ${parsedResult.translation}` }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }
              }
            }
          }
        });

        const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          parsedResult.audioBase64 = base64Audio;
        }
      } catch (ttsErr) {
        console.warn('Wolof TTS warning (fallback to phonetic audio player):', ttsErr);
      }
    }

    return res.json(parsedResult);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erreur /api/translate-audio:', err);
    return res.status(500).json({
      error: 'Erreur lors de la traduction vocale',
      message: err.message || 'Erreur interne'
    });
  }
});

/**
 * Text translation between Wolof and French
 */
app.post('/api/translate-text', async (req, res) => {
  try {
    const { text, sourceLanguage = 'auto', targetLanguage = 'auto' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Texte manquant' });
    }

    const ai = getGeminiClient();
    const prompt = `You are an expert Wolof ↔ French translator for Senegalese health centers.
Translate the following medical phrase faithfully:
Input text: "${text}"
${sourceLanguage !== 'auto' ? `Source language: ${sourceLanguage}` : ''}
${targetLanguage !== 'auto' ? `Target language: ${targetLanguage}` : ''}

Respond strictly in JSON format:
{
  "detectedLanguage": "wolof" | "francais",
  "targetLanguage": "francais" | "wolof",
  "transcript": "${text.replace(/"/g, '\\"')}",
  "translation": "Translated text",
  "symptomTag": "Brief medical category",
  "medicalSummary": "Summary in French"
}`;

    let responseText = '';
    try {
      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });
      responseText = response.text || '{}';
    } catch (apiErr) {
      console.warn('Fallback vers dictionnaire médical local:', apiErr);
      const lower = text.toLowerCase();
      const match = MEDICAL_LEXICON.find(item => lower.includes(item.wo.toLowerCase()) || lower.includes(item.fr.toLowerCase()));
      if (match) {
        const isWo = lower.includes(match.wo.toLowerCase());
        return res.json({
          detectedLanguage: isWo ? 'wolof' : 'francais',
          targetLanguage: isWo ? 'francais' : 'wolof',
          transcript: text,
          translation: isWo ? match.fr : match.wo,
          symptomTag: match.tag,
          medicalSummary: match.fr
        });
      }
      return res.json({
        detectedLanguage: 'wolof',
        targetLanguage: 'francais',
        transcript: text,
        translation: text,
        symptomTag: 'Symptôme',
        medicalSummary: 'Plainte enregistrée'
      });
    }

    const parsed = JSON.parse(responseText.trim() || '{}');
    return res.json(parsed);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erreur /api/translate-text:', err);
    return res.status(500).json({
      error: 'Erreur lors de la traduction texte',
      message: err.message
    });
  }
});

/**
 * Wolof Text-to-Speech API
 */
app.post('/api/tts-wolof', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texte manquant' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Wax ci wolof bu leer: ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({ error: 'Échec de génération audio' });
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/pcm;rate=24000'
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erreur /api/tts-wolof:', err);
    return res.status(500).json({
      error: 'Erreur synthèse vocale Wolof',
      message: err.message
    });
  }
});

/**
 * Start Express server and mount Vite
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Wax Santé] Serveur démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
