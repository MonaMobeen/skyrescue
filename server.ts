import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Add your key in Settings > Secrets to enable AI missions and debriefs.'
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 503;
    err.code = 'API_KEY_MISSING';
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 12000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateJsonWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    responseSchema: Record<string, unknown>;
  }
) {
  const attempts: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: PRIMARY_MODEL, thinkingLevel: ThinkingLevel.LOW },
    { model: FALLBACK_MODEL, thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const { model, thinkingLevel } = attempts[i];
    try {
      return await Promise.race([
        ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: params.responseSchema,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            const err = new Error('Gemini API request timed out.') as Error & {
              statusCode?: number;
              code?: string;
            };
            err.statusCode = 504;
            err.code = 'GEMINI_TIMEOUT';
            reject(err);
          }, 12500)
        ),
      ]);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const isAuthOrBadRequest =
        msg.includes('API_KEY_INVALID') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('400') ||
        msg.includes('403');
      if (isAuthOrBadRequest || i === attempts.length - 1) {
        throw error;
      }
    }
  }
  throw lastError;
}

function extractReadableErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    if (parsed?.error?.message) return parsed.error.message;
    if (parsed?.message) return parsed.message;
  } catch {
    // Not JSON, return raw text
  }
  return raw;
}

function formatGeminiError(error: unknown): {
  status: number;
  error: string;
  code: string;
} {
  const errObj = error as { statusCode?: number; status?: number; code?: string; message?: string };
  const rawMessage = errObj?.message || 'Unable to reach Gemini AI service.';
  const cleanMessage = extractReadableErrorMessage(rawMessage);
  const status = errObj?.statusCode || errObj?.status || 502;

  if (errObj?.code === 'API_KEY_MISSING') {
    return {
      status: 503,
      code: 'API_KEY_MISSING',
      error: cleanMessage,
    };
  }
  if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      error: 'Gemini API key is invalid or unauthorized. Please verify your key in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      error: 'Gemini API quota reached temporarily. Please try again in a few moments.',
    };
  }
  return {
    status: status >= 400 && status < 600 ? status : 502,
    code: errObj?.code || 'GEMINI_ERROR',
    error: cleanMessage,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'skyrescue-mission-control' });
  });

  app.post('/api/mission/generate', async (req: Request, res: Response) => {
    try {
      const ai = getGeminiClient();
      const body = req.body ?? {};
      const preferredDifficulty =
        body.preferredDifficulty === 'Easy' ||
        body.preferredDifficulty === 'Medium' ||
        body.preferredDifficulty === 'Hard'
          ? body.preferredDifficulty
          : null;
      const previousMissionNames = Array.isArray(body.previousMissionNames)
        ? body.previousMissionNames.slice(-6).filter((n: unknown) => typeof n === 'string')
        : [];

      const difficultyDirective = preferredDifficulty
        ? `Difficulty MUST be "${preferredDifficulty}".`
        : 'Pick a balanced difficulty among "Easy", "Medium", or "Hard".';

      const avoidNames =
        previousMissionNames.length > 0
          ? `Avoid repeating these recent mission names: ${previousMissionNames.join(', ')}.`
          : '';

      const prompt = [
        'Create a fresh, vivid arcade airplane emergency rescue mission for SKYRESCUE.',
        'Settings can span coastal archipelagos, mountain passes, flood-hit river deltas, or remote island beacons (including inspiring Pakistani or global disaster-relief terrain).',
        difficultyDirective,
        avoidNames,
        'Calibrate targetSupplies and targetDistance for a thrilling 45 to 75 second arcade session:',
        '- Easy: targetSupplies 6 to 8, targetDistance 1600 to 2000',
        '- Medium: targetSupplies 9 to 12, targetDistance 2200 to 2700',
        '- Hard: targetSupplies 13 to 16, targetDistance 2800 to 3400',
        'Keep briefing to 2 punchy cinematic sentences, objective under 16 words, and radioGreeting under 14 words.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await generateJsonWithFallback(ai, {
        contents: prompt,
        systemInstruction:
          'You are Gemini Mission Control for SKYRESCUE, an upbeat Nintendo-style arcade rescue flight game. Return crisp, inspiring, family-friendly rescue mission parameters.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            missionName: { type: Type.STRING },
            region: { type: Type.STRING },
            briefing: { type: Type.STRING },
            objective: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
            targetSupplies: { type: Type.INTEGER },
            targetDistance: { type: Type.INTEGER },
            weatherMood: {
              type: Type.STRING,
              enum: ['Sunny Archipelago', 'Golden Sunset', 'Monsoon Squall'],
            },
            radioGreeting: { type: Type.STRING },
          },
          required: [
            'missionName',
            'region',
            'briefing',
            'objective',
            'difficulty',
            'targetSupplies',
            'targetDistance',
            'weatherMood',
            'radioGreeting',
          ],
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const diff =
        parsed.difficulty === 'Easy' || parsed.difficulty === 'Hard'
          ? parsed.difficulty
          : 'Medium';
      const clampSupplies =
        diff === 'Easy'
          ? Math.min(8, Math.max(6, Number(parsed.targetSupplies) || 7))
          : diff === 'Hard'
            ? Math.min(16, Math.max(12, Number(parsed.targetSupplies) || 14))
            : Math.min(12, Math.max(9, Number(parsed.targetSupplies) || 10));
      const clampDistance =
        diff === 'Easy'
          ? Math.min(2100, Math.max(1500, Number(parsed.targetDistance) || 1800))
          : diff === 'Hard'
            ? Math.min(3500, Math.max(2700, Number(parsed.targetDistance) || 3000))
            : Math.min(2800, Math.max(2100, Number(parsed.targetDistance) || 2400));

      const validMood =
        parsed.weatherMood === 'Golden Sunset' || parsed.weatherMood === 'Monsoon Squall'
          ? parsed.weatherMood
          : 'Sunny Archipelago';

      res.json({
        id: `mission_${Date.now()}`,
        missionName: String(parsed.missionName || 'Operation Horizon Lifeline'),
        region: String(parsed.region || 'Emerald Archipelago'),
        briefing: String(
          parsed.briefing ||
            'Coastal communities are awaiting emergency medical drops before nightfall. Thread the cloud corridors and deliver every crate safely.'
        ),
        objective: String(
          parsed.objective || `Deliver ${clampSupplies} supply crates across ${clampDistance}m to the rescue beacon.`
        ),
        difficulty: diff,
        targetSupplies: clampSupplies,
        targetDistance: clampDistance,
        weatherMood: validMood,
        radioGreeting: String(
          parsed.radioGreeting || 'Rescue One, clear skies for takeoff. Watch for storm cells ahead.'
        ),
        source: 'gemini',
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json(formatted);
    }
  });

  app.post('/api/mission/control', async (req: Request, res: Response) => {
    try {
      const ai = getGeminiClient();
      const {
        missionName,
        objective,
        difficulty,
        suppliesCollected,
        targetSupplies,
        distance,
        targetDistance,
        health,
        maxHealth,
        event,
      } = req.body ?? {};

      const prompt = [
        `Mission: ${String(missionName || 'Rescue Sortie')} (${String(difficulty || 'Medium')})`,
        `Objective: ${String(objective || 'Deliver emergency crates')}`,
        `Live Telemetry: Supplies ${Number(suppliesCollected) || 0}/${Number(targetSupplies) || 10}, Distance ${Math.round(Number(distance) || 0)}m/${Number(targetDistance) || 2400}m, Hull ${Number(health) || 0}/${Number(maxHealth) || 3}.`,
        `Milestone Event: ${String(event || 'HALFWAY')}.`,
        'Send a brief, encouraging in-flight radio message (max 14 words) and a 3-5 word tactical directive based strictly on this telemetry.',
      ].join('\n');

      const response = await generateJsonWithFallback(ai, {
        contents: prompt,
        systemInstruction:
          'You are SKYRESCUE Mission Control radio operator. Be concise, urgent yet encouraging, and strictly reference the provided telemetry.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            directive: { type: Type.STRING },
          },
          required: ['message', 'directive'],
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        id: `radio_${Date.now()}`,
        message: String(parsed.message || 'Steady wings, pilot. Keep collecting emergency crates!'),
        directive: String(parsed.directive || 'Hold altitude and stay sharp'),
        event: String(event || 'HALFWAY'),
        timestamp: Date.now(),
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json(formatted);
    }
  });

  app.post('/api/mission/debrief', async (req: Request, res: Response) => {
    try {
      const ai = getGeminiClient();
      const stats = req.body ?? {};
      const status = stats.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';
      const score = Number(stats.score) || 0;
      const suppliesCollected = Number(stats.suppliesCollected) || 0;
      const targetSupplies = Number(stats.targetSupplies) || 10;
      const distanceTravelled = Math.round(Number(stats.distanceTravelled) || 0);
      const targetDistance = Math.round(Number(stats.targetDistance) || 2400);
      const obstaclesHit = Number(stats.obstaclesHit) || 0;
      const boostsUsed = Number(stats.boostsUsed) || 0;
      const durationSeconds = Math.round(Number(stats.durationSeconds) || 0);

      const prompt = [
        'Analyze this completed SKYRESCUE arcade flight using ONLY the verified telemetry below. Do not invent numbers.',
        `Mission Name: ${String(stats.missionName || 'Rescue Sortie')}`,
        `Difficulty: ${String(stats.difficulty || 'Medium')}`,
        `Outcome: ${status}`,
        `Final Score: ${score}`,
        `Supplies Collected: ${suppliesCollected} of ${targetSupplies}`,
        `Distance Travelled: ${distanceTravelled}m of ${targetDistance}m`,
        `Obstacles Hit: ${obstaclesHit}`,
        `Turbo Boosts Used: ${boostsUsed}`,
        `Flight Duration: ${durationSeconds} seconds`,
        'Return a personalized pilotAssessment (2-3 sentences), 2-3 specific highlights grounded in the telemetry, 1-2 honest areas to improve, a fun aviation pilotRank, and 1 concrete nextChallenge.',
      ].join('\n');

      const response = await generateJsonWithFallback(ai, {
        contents: prompt,
        systemInstruction:
          'You are Chief Flight Commander at SKYRESCUE Mission Control. Give warm, specific, honest post-flight debriefs grounded strictly in the pilot telemetry provided.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pilotRank: { type: Type.STRING },
            pilotAssessment: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            nextChallenge: { type: Type.STRING },
          },
          required: [
            'pilotRank',
            'pilotAssessment',
            'highlights',
            'improvements',
            'nextChallenge',
          ],
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        pilotRank: String(parsed.pilotRank || 'Rescue Aviator'),
        pilotAssessment: String(
          parsed.pilotAssessment || 'Solid effort in challenging skies, pilot.'
        ),
        highlights: Array.isArray(parsed.highlights)
          ? parsed.highlights.slice(0, 3).map(String)
          : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements.slice(0, 2).map(String)
          : [],
        nextChallenge: String(
          parsed.nextChallenge || 'Attempt a higher difficulty sector with zero hull hits.'
        ),
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json(formatted);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SKYRESCUE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SKYRESCUE server:', err);
  process.exit(1);
});
