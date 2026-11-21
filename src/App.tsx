import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { DebriefView } from './components/DebriefView';
import { GameHud } from './components/GameHud';
import { LandingView } from './components/LandingView';
import { SkyCanvas, type HudSnapshot, type VirtualControls } from './components/SkyCanvas';
import {
  createStandardTrainingMission,
  fetchMissionControlUpdate,
  generateAiFlightDebrief,
  generateAiMission,
} from './services/missionApi';
import type {
  ControlEventType,
  Difficulty,
  FlightDebrief,
  FlightStats,
  GameScreenState,
  MissionControlMessage,
  MissionPlan,
  StoredPlayerProgress,
} from './types/game';
import { loadPlayerProgress, savePlayerProgress } from './utils/storage';

const PREVIEW_MISSION = createStandardTrainingMission('Medium');

export default function App() {
  const [progress, setProgress] = useState<StoredPlayerProgress>(() => {
    const loaded = loadPlayerProgress();
    soundEngine.setEnabled(loaded.soundEnabled);
    return loaded;
  });

  const [screen, setScreen] = useState<GameScreenState>('LANDING');
  const [mission, setMission] = useState<MissionPlan | null>(null);
  const [missionLoading, setMissionLoading] = useState<boolean>(true);
  const [missionError, setMissionError] = useState<string | null>(null);
  const [recentMissionNames, setRecentMissionNames] = useState<string[]>([]);

  const [runKey, setRunKey] = useState<number>(1);
  const [hud, setHud] = useState<HudSnapshot>({
    score: 0,
    suppliesCollected: 0,
    targetSupplies: 10,
    distance: 0,
    targetDistance: 2300,
    health: 3,
    maxHealth: 3,
    boost: 100,
    isBoosting: false,
    beaconActive: false,
  });

  const [radioMessage, setRadioMessage] = useState<MissionControlMessage | null>(null);
  const radioTimeoutRef = useRef<number | null>(null);

  const [lastStats, setLastStats] = useState<FlightStats | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState<boolean>(false);
  const [debrief, setDebrief] = useState<FlightDebrief | null>(null);
  const [debriefLoading, setDebriefLoading] = useState<boolean>(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);

  const virtualControlsRef = useRef<VirtualControls>({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
  });

  const showRadioBanner = useCallback((msg: MissionControlMessage) => {
    setRadioMessage(msg);
    if (radioTimeoutRef.current !== null) {
      window.clearTimeout(radioTimeoutRef.current);
    }
    radioTimeoutRef.current = window.setTimeout(() => {
      setRadioMessage(null);
    }, 5200);
  }, []);

  const requestNewMission = useCallback(
    async (difficultyOverride?: Difficulty | 'Auto'): Promise<MissionPlan | null> => {
      setMissionLoading(true);
      setMissionError(null);
      try {
        const diff = difficultyOverride ?? progress.preferredDifficulty;
        const generated = await generateAiMission({
          preferredDifficulty: diff,
          previousMissionNames: recentMissionNames,
        });
        setMission(generated);
        setRecentMissionNames((prev) => [...prev.slice(-5), generated.missionName]);
        return generated;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to generate an AI mission right now. Please try again.';
        setMissionError(message);
        return null;
      } finally {
        setMissionLoading(false);
      }
    },
    [progress.preferredDifficulty, recentMissionNames]
  );

  // Initial Gemini AI mission load
  useEffect(() => {
    void requestNewMission(progress.preferredDifficulty);
    return () => {
      if (radioTimeoutRef.current !== null) {
        window.clearTimeout(radioTimeoutRef.current);
      }
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProgress = useCallback(
    (updater: (prev: StoredPlayerProgress) => StoredPlayerProgress) => {
      setProgress((prev) => {
        const next = updater(prev);
        savePlayerProgress(next);
        return next;
      });
    },
    []
  );

  const handleToggleSound = useCallback(() => {
    soundEngine.unlock();
    updateProgress((prev) => {
      const nextSound = !prev.soundEnabled;
      soundEngine.setEnabled(nextSound);
      return { ...prev, soundEnabled: nextSound };
    });
  }, [updateProgress]);

  const handleSelectDifficulty = useCallback(
    (diff: Difficulty | 'Auto') => {
      updateProgress((prev) => ({ ...prev, preferredDifficulty: diff }));
      void requestNewMission(diff);
    },
    [requestNewMission, updateProgress]
  );

  const handleUseTrainingMission = useCallback(() => {
    setMissionError(null);
    setMission(createStandardTrainingMission(progress.preferredDifficulty));
  }, [progress.preferredDifficulty]);

  const launchFlight = useCallback(
    (activeMission: MissionPlan) => {
      soundEngine.unlock();
      soundEngine.playTakeoff();
      virtualControlsRef.current = {
        up: false,
        down: false,
        left: false,
        right: false,
        boost: false,
      };
      setHud({
        score: 0,
        suppliesCollected: 0,
        targetSupplies: activeMission.targetSupplies,
        distance: 0,
        targetDistance: activeMission.targetDistance,
        health: 3,
        maxHealth: 3,
        boost: 100,
        isBoosting: false,
        beaconActive: false,
      });
      setDebrief(null);
      setDebriefError(null);
      setRunKey((k) => k + 1);
      setScreen('PLAYING');
      showRadioBanner({
        id: `intro_${Date.now()}`,
        event: 'FIRST_PICKUP',
        directive: activeMission.objective,
        message: activeMission.radioGreeting,
        timestamp: Date.now(),
      });
    },
    [showRadioBanner]
  );

  const handleStartMission = useCallback(() => {
    if (!mission) return;
    launchFlight(mission);
  }, [launchFlight, mission]);

  const handleMilestone = useCallback(
    (event: ControlEventType, snapshot: HudSnapshot) => {
      if (!mission) return;
      if (mission.source !== 'gemini') {
        const fallbackDirectives: Record<ControlEventType, { directive: string; message: string }> = {
          FIRST_PICKUP: {
            directive: 'Stay on course',
            message: 'First crate secured! Keep scanning the skyline for parachutes.',
          },
          HALFWAY: {
            directive: 'Maintain airspeed',
            message: 'Halfway to target supply count. Watch out for storm cells ahead.',
          },
          LOW_HEALTH: {
            directive: 'Protect remaining hull',
            message: 'Hull integrity critical! Look for a green repair kit and avoid hazards.',
          },
          FINAL_APPROACH: {
            directive: 'Enter the Rescue Zone',
            message: 'Supplies secured! Fly into the golden Rescue Zone beacon to land.',
          },
        };
        const msg = fallbackDirectives[event];
        soundEngine.playRadio();
        showRadioBanner({
          id: `local_radio_${Date.now()}`,
          event,
          directive: msg.directive,
          message: msg.message,
          timestamp: Date.now(),
        });
        return;
      }

      void fetchMissionControlUpdate({
        missionName: mission.missionName,
        objective: mission.objective,
        difficulty: mission.difficulty,
        suppliesCollected: snapshot.suppliesCollected,
        targetSupplies: snapshot.targetSupplies,
        distance: snapshot.distance,
        targetDistance: snapshot.targetDistance,
        health: snapshot.health,
        maxHealth: snapshot.maxHealth,
        event,
      })
        .then((msg) => {
          soundEngine.playRadio();
          showRadioBanner(msg);
        })
        .catch(() => {
          // Non-blocking during active 60fps flight
        });
    },
    [mission, showRadioBanner]
  );

  const loadDebrief = useCallback(async (stats: FlightStats) => {
    setDebriefLoading(true);
    setDebriefError(null);
    try {
      const result = await generateAiFlightDebrief(stats);
      setDebrief(result);
    } catch (err) {
      setDebriefError(
        err instanceof Error
          ? err.message
          : 'Unable to fetch Gemini AI Flight Debrief right now.'
      );
    } finally {
      setDebriefLoading(false);
    }
  }, []);

  const handleGameEnd = useCallback(
    (stats: FlightStats) => {
      setLastStats(stats);
      setScreen('DEBRIEF');
      setRadioMessage(null);

      setIsNewBestScore(stats.score > progress.bestScore);
      updateProgress((prev) => ({
        ...prev,
        bestScore: Math.max(prev.bestScore, stats.score),
        missionsCompleted:
          stats.status === 'COMPLETED' ? prev.missionsCompleted + 1 : prev.missionsCompleted,
        totalSuppliesDelivered: prev.totalSuppliesDelivered + stats.suppliesCollected,
      }));

      void loadDebrief(stats);
    },
    [loadDebrief, progress.bestScore, updateProgress]
  );

  // Keyboard Pause shortcut (P or Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'PLAYING' && screen !== 'PAUSED') return;
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        setScreen((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen]);

  const handleNewAiMissionFromDebrief = useCallback(async () => {
    setScreen('LANDING');
    const nextMission = await requestNewMission(progress.preferredDifficulty);
    if (nextMission) {
      launchFlight(nextMission);
    }
  }, [launchFlight, progress.preferredDifficulty, requestNewMission]);

  if (screen === 'LANDING') {
    return (
      <LandingView
        mission={mission}
        missionLoading={missionLoading}
        missionError={missionError}
        progress={progress}
        selectedDifficulty={progress.preferredDifficulty}
        onSelectDifficulty={handleSelectDifficulty}
        onGenerateMission={() => void requestNewMission(progress.preferredDifficulty)}
        onUseTrainingMission={handleUseTrainingMission}
        onStartMission={handleStartMission}
        onToggleSound={handleToggleSound}
        previewMission={PREVIEW_MISSION}
      />
    );
  }

  if (screen === 'DEBRIEF' && lastStats && mission) {
    return (
      <DebriefView
        mission={mission}
        stats={lastStats}
        bestScore={progress.bestScore}
        isNewBestScore={isNewBestScore}
        debrief={debrief}
        debriefLoading={debriefLoading}
        debriefError={debriefError}
        onRetryDebrief={() => void loadDebrief(lastStats)}
        onRetrySameMission={() => launchFlight(mission)}
        onNewAiMission={() => void handleNewAiMissionFromDebrief()}
        onReturnToHangar={() => setScreen('LANDING')}
      />
    );
  }

  const activeMission = mission ?? PREVIEW_MISSION;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B192C]">
      <SkyCanvas
        mode="play"
        paused={screen === 'PAUSED'}
        mission={activeMission}
        runKey={runKey}
        virtualControlsRef={virtualControlsRef}
        onHudUpdate={setHud}
        onMilestone={handleMilestone}
        onGameEnd={handleGameEnd}
      />
      <GameHud
        mission={activeMission}
        hud={hud}
        paused={screen === 'PAUSED'}
        soundEnabled={progress.soundEnabled}
        radioMessage={radioMessage}
        virtualControlsRef={virtualControlsRef}
        onTogglePause={() => setScreen((s) => (s === 'PLAYING' ? 'PAUSED' : 'PLAYING'))}
        onRestart={() => launchFlight(activeMission)}
        onExitToLanding={() => setScreen('LANDING')}
        onToggleSound={handleToggleSound}
      />
    </div>
  );
}
