import React from 'react';
import {
  Compass,
  Flame,
  Gamepad2,
  Package,
  Play,
  Radio,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Difficulty, MissionPlan, StoredPlayerProgress } from '../types/game';
import { SkyCanvas } from './SkyCanvas';

interface LandingViewProps {
  mission: MissionPlan | null;
  missionLoading: boolean;
  missionError: string | null;
  progress: StoredPlayerProgress;
  selectedDifficulty: Difficulty | 'Auto';
  onSelectDifficulty: (difficulty: Difficulty | 'Auto') => void;
  onGenerateMission: () => void;
  onUseTrainingMission: () => void;
  onStartMission: () => void;
  onToggleSound: () => void;
  previewMission: MissionPlan;
}

const DIFFICULTIES: Array<Difficulty | 'Auto'> = ['Auto', 'Easy', 'Medium', 'Hard'];

export const LandingView: React.FC<LandingViewProps> = ({
  mission,
  missionLoading,
  missionError,
  progress,
  selectedDifficulty,
  onSelectDifficulty,
  onGenerateMission,
  onUseTrainingMission,
  onStartMission,
  onToggleSound,
  previewMission,
}) => {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0B192C] text-white">
      {/* Live Animated Atmospheric Background */}
      <div className="fixed inset-0 z-0">
        <SkyCanvas
          mode="attract"
          paused={false}
          mission={mission ?? previewMission}
          runKey={0}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071426]/75 via-[#0B192C]/55 to-[#071426]/90" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-4 py-5 sm:px-8 sm:py-6">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-6 border-b border-white/15 pb-4">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <svg
              viewBox="0 0 40 40"
              className="h-9 w-9 shrink-0"
              aria-hidden="true"
            >
              <rect width="40" height="40" rx="10" fill="#F97316" />
              <path
                d="M7 22L20 14L33 22L28 24L20 19.5L12 24L7 22Z"
                fill="#FFFFFF"
              />
              <path
                d="M17 13L20 8L23 13L20 29L17 13Z"
                fill="#FFFFFF"
              />
            </svg>
            <span className="font-display text-xl font-extrabold tracking-tight text-white">
              SKYRESCUE
            </span>
          </div>

          <div className="hidden md:block text-xs font-medium text-sky-100/80 whitespace-nowrap">
            GDG Live Pakistan DevFest 2026 · AI Flight Mission
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-sky-100 whitespace-nowrap">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-sky-200/80">Best</span>
              <span className="font-mono font-bold tabular-nums text-white">
                {progress.bestScore.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={progress.soundEnabled ? 'Mute sound' : 'Unmute sound'}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-orange-400"
            >
              {progress.soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 text-sky-300" />
                  <span className="hidden sm:inline">Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-slate-300" />
                  <span className="hidden sm:inline">Sound Off</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Hero + Mission Control Grid */}
        <main className="my-auto py-8">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left Column: Title, Tagline, Intro, Career Stats */}
            <div className="lg:col-span-6 space-y-5">
              <p className="text-sm font-semibold tracking-wide text-orange-400">
                Your Mission. Your Flight. Your AI.
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.06] text-balance">
                Pilot Emergency Rescue Flights Across Open Skies
              </h1>
              <p className="max-w-xl text-base text-sky-100/85 leading-relaxed">
                Take the stick of an emergency seaplane. Thread past storm thunderheads and coastal
                sea stacks, intercept parachuting supply crates, and fly under live Gemini AI
                Mission Control.
              </p>

              {/* Career Summary Strip */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-sm border-t border-white/15">
                <div>
                  <div className="text-xs text-sky-200/70">Best Score</div>
                  <div className="font-mono text-xl font-bold tabular-nums text-white">
                    {progress.bestScore.toLocaleString()}
                  </div>
                </div>
                <div className="h-8 w-px bg-white/15" aria-hidden="true" />
                <div>
                  <div className="text-xs text-sky-200/70">Missions Cleared</div>
                  <div className="font-mono text-xl font-bold tabular-nums text-white">
                    {progress.missionsCompleted}
                  </div>
                </div>
                <div className="h-8 w-px bg-white/15" aria-hidden="true" />
                <div>
                  <div className="text-xs text-sky-200/70">Supplies Delivered</div>
                  <div className="font-mono text-xl font-bold tabular-nums text-white">
                    {progress.totalSuppliesDelivered}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Active Mission Dispatch Panel */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-[#0B192C]/85 p-6 backdrop-blur-xl border border-white/15 shadow-2xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
                    <Radio className="h-4 w-4 text-orange-400" />
                    <span>Mission Dispatch</span>
                  </div>

                  {/* Difficulty Selector */}
                  <div
                    className="flex items-center gap-1 rounded-xl bg-white/10 p-1"
                    role="group"
                    aria-label="Mission difficulty"
                  >
                    {DIFFICULTIES.map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => onSelectDifficulty(diff)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                          selectedDifficulty === diff
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-sky-100/80 hover:text-white'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mission Content / Loading / Error */}
                {missionLoading ? (
                  <div className="space-y-3 py-4" aria-live="polite">
                    <div className="h-4 w-40 animate-pulse rounded bg-white/15" />
                    <div className="h-7 w-3/4 animate-pulse rounded bg-white/20" />
                    <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                    <p className="pt-2 text-xs text-sky-200/75">
                      Contacting Gemini Mission Control for a fresh rescue sortie...
                    </p>
                  </div>
                ) : missionError && !mission ? (
                  <div className="rounded-xl bg-rose-950/50 p-4 border border-rose-400/30 space-y-3">
                    <div className="flex items-start gap-2.5 text-sm text-rose-100">
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                      <div>
                        <p className="font-semibold">Gemini Mission Control Unavailable</p>
                        <p className="mt-1 text-xs text-rose-200/90 leading-relaxed">
                          {missionError}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={onGenerateMission}
                        className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors whitespace-nowrap"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry AI Mission
                      </button>
                      <button
                        type="button"
                        onClick={onUseTrainingMission}
                        className="rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-400 transition-colors whitespace-nowrap"
                      >
                        Load Standard Training Sortie
                      </button>
                    </div>
                  </div>
                ) : mission ? (
                  <div className="space-y-4">
                    {missionError && (
                      <div className="rounded-xl bg-amber-950/60 px-3.5 py-2.5 text-xs text-amber-100 border border-amber-400/30">
                        {missionError}
                      </div>
                    )}

                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-sky-200/80">
                        <span className="font-semibold text-orange-400">{mission.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span>{mission.region}</span>
                        <span aria-hidden="true">·</span>
                        <span>{mission.weatherMood}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {mission.source === 'gemini' ? 'Generated by Gemini' : 'Training Sortie'}
                        </span>
                      </div>
                      <h2 className="mt-1 font-display text-2xl font-bold text-white">
                        {mission.missionName}
                      </h2>
                    </div>

                    <p className="text-sm text-sky-100/85 leading-relaxed">{mission.briefing}</p>

                    <div className="border-t border-white/10 pt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-sky-200/70">Objective</span>
                        <p className="mt-0.5 font-medium text-white">{mission.objective}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-sky-200/70">Supplies</span>
                          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-orange-300">
                            {mission.targetSupplies} crates
                          </p>
                        </div>
                        <div>
                          <span className="text-sky-200/70">Distance</span>
                          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-sky-300">
                            {mission.targetDistance.toLocaleString()}m
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    type="button"
                    disabled={missionLoading || !mission}
                    onClick={onStartMission}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-950/40 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Start Mission
                  </button>
                  <button
                    type="button"
                    disabled={missionLoading}
                    onClick={onGenerateMission}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-300"
                  >
                    <RefreshCw className={`h-4 w-4 ${missionLoading ? 'animate-spin' : ''}`} />
                    New AI Mission
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* How to Play Section */}
          <section
            aria-label="How to Play"
            className="mt-10 rounded-2xl bg-[#0B192C]/75 p-5 sm:p-6 backdrop-blur-md border border-white/10"
          >
            <h2 className="font-display text-lg font-bold text-white">How to Play</h2>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="flex items-start gap-3">
                <Gamepad2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
                <div>
                  <h3 className="font-semibold text-white">Pilot Controls</h3>
                  <p className="mt-1 text-xs text-sky-100/75 leading-relaxed">
                    Use Arrow keys or WASD to steer, Spacebar to boost. On mobile, drag anywhere or
                    use the on-screen flight pad.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
                <div>
                  <h3 className="font-semibold text-white">Collect Supplies</h3>
                  <p className="mt-1 text-xs text-sky-100/75 leading-relaxed">
                    Intercept parachuting emergency crates and green hull repair kits before flying
                    through the final Rescue Zone beacon.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Flame className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                <div>
                  <h3 className="font-semibold text-white">Dodge Hazards</h3>
                  <p className="mt-1 text-xs text-sky-100/75 leading-relaxed">
                    Steer clear of storm thunderheads, coastal spires, weather balloons, and bird
                    flocks to protect your 3 hull points.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Compass className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-white">Gemini AI Control</h3>
                  <p className="mt-1 text-xs text-sky-100/75 leading-relaxed">
                    Gemini generates each mission, sends live tactical radio updates, and evaluates
                    your real telemetry after landing.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
