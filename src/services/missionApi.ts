import type {
  ControlEventType,
  Difficulty,
  FlightDebrief,
  FlightStats,
  MissionControlMessage,
  MissionPlan,
} from '../types/game';

export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

async function postJson<T>(url: string, body: unknown, timeoutMs = 26000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiRequestError(
        data?.error || `Request failed with status ${response.status}`,
        response.status,
        data?.code || 'REQUEST_FAILED'
      );
    }
    return data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiRequestError(
        'Gemini Mission Control timed out. Please retry or fly a Standard Training Sortie.',
        504,
        'CLIENT_TIMEOUT'
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

export function generateAiMission(params: {
  preferredDifficulty?: Difficulty | 'Auto';
  previousMissionNames?: string[];
}): Promise<MissionPlan> {
  return postJson<MissionPlan>('/api/mission/generate', {
    preferredDifficulty:
      params.preferredDifficulty && params.preferredDifficulty !== 'Auto'
        ? params.preferredDifficulty
        : undefined,
    previousMissionNames: params.previousMissionNames ?? [],
  });
}

export function fetchMissionControlUpdate(params: {
  missionName: string;
  objective: string;
  difficulty: Difficulty;
  suppliesCollected: number;
  targetSupplies: number;
  distance: number;
  targetDistance: number;
  health: number;
  maxHealth: number;
  event: ControlEventType;
}): Promise<MissionControlMessage> {
  return postJson<MissionControlMessage>('/api/mission/control', params);
}

export function generateAiFlightDebrief(stats: FlightStats): Promise<FlightDebrief> {
  return postJson<FlightDebrief>('/api/mission/debrief', stats);
}

export function createStandardTrainingMission(
  difficulty: Difficulty | 'Auto' = 'Medium'
): MissionPlan {
  const chosen: Difficulty = difficulty === 'Auto' ? 'Medium' : difficulty;
  const presets: Record<Difficulty, Omit<MissionPlan, 'id' | 'source'>> = {
    Easy: {
      missionName: 'Training Sortie: Emerald Bay',
      region: 'Southern Coral Atoll',
      briefing:
        'Standard daylight supply run across calm coastal waters. Practice banking through gentle cloud banks and intercepting parachute crates.',
      objective: 'Collect 6 supply crates across 1,700m to reach Beacon Island.',
      difficulty: 'Easy',
      targetSupplies: 6,
      targetDistance: 1700,
      weatherMood: 'Sunny Archipelago',
      radioGreeting: 'Training Tower clear for takeoff. Smooth skies ahead, pilot.',
    },
    Medium: {
      missionName: 'Training Sortie: Sunset Ridge',
      region: 'Western Archipelago',
      briefing:
        'Dusk is settling over the outer island chain with rising coastal gusts. Deliver emergency rations before the lighthouse beacon goes dark.',
      objective: 'Collect 10 supply crates across 2,300m to reach the rescue flare.',
      difficulty: 'Medium',
      targetSupplies: 10,
      targetDistance: 2300,
      weatherMood: 'Golden Sunset',
      radioGreeting: 'Sunset corridor open. Keep an eye on high-altitude balloons.',
    },
    Hard: {
      missionName: 'Training Sortie: Monsoon Strait',
      region: 'Northern Storm Corridor',
      briefing:
        'Heavy storm cells are sweeping the strait. Thread past thunderheads and volcanic spires to deliver critical medical kits.',
      objective: 'Collect 13 supply crates across 2,900m through monsoon squalls.',
      difficulty: 'Hard',
      targetSupplies: 13,
      targetDistance: 2900,
      weatherMood: 'Monsoon Squall',
      radioGreeting: 'Heavy crosswinds reported. Stay sharp and manage your boost.',
    },
  };

  return {
    id: `training_${Date.now()}`,
    source: 'training',
    ...presets[chosen],
  };
}
