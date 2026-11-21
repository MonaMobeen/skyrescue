export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type WeatherMood = 'Sunny Archipelago' | 'Golden Sunset' | 'Monsoon Squall';

export interface MissionPlan {
  id: string;
  missionName: string;
  region: string;
  briefing: string;
  objective: string;
  difficulty: Difficulty;
  targetSupplies: number;
  targetDistance: number;
  weatherMood: WeatherMood;
  radioGreeting: string;
  source: 'gemini' | 'training';
}

export type ControlEventType =
  | 'FIRST_PICKUP'
  | 'HALFWAY'
  | 'LOW_HEALTH'
  | 'FINAL_APPROACH';

export interface MissionControlMessage {
  id: string;
  message: string;
  directive: string;
  event: ControlEventType;
  timestamp: number;
}

export interface FlightStats {
  missionName: string;
  difficulty: Difficulty;
  status: 'COMPLETED' | 'FAILED';
  score: number;
  suppliesCollected: number;
  targetSupplies: number;
  distanceTravelled: number;
  targetDistance: number;
  obstaclesHit: number;
  boostsUsed: number;
  durationSeconds: number;
}

export interface FlightDebrief {
  pilotRank: string;
  pilotAssessment: string;
  highlights: string[];
  improvements: string[];
  nextChallenge: string;
}

export type GameScreenState = 'LANDING' | 'PLAYING' | 'PAUSED' | 'DEBRIEF';

export interface StoredPlayerProgress {
  bestScore: number;
  missionsCompleted: number;
  totalSuppliesDelivered: number;
  soundEnabled: boolean;
  preferredDifficulty: Difficulty | 'Auto';
}
