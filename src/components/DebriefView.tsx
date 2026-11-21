import React from 'react';
import {
  Award,
  CheckCircle2,
  Compass,
  Home,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type { FlightDebrief, FlightStats, MissionPlan } from '../types/game';
import { SkyCanvas } from './SkyCanvas';

interface DebriefViewProps {
  mission: MissionPlan;
  stats: FlightStats;
  bestScore: number;
  isNewBestScore: boolean;
  debrief: FlightDebrief | null;
  debriefLoading: boolean;
  debriefError: string | null;
  onRetryDebrief: () => void;
  onRetrySameMission: () => void;
  onNewAiMission: () => void;
  onReturnToHangar: () => void;
}

export const DebriefView: React.FC<DebriefViewProps> = ({
  mission,
  stats,
  bestScore,
  isNewBestScore,
  debrief,
  debriefLoading,
  debriefError,
  onRetryDebrief,
  onRetrySameMission,
  onNewAiMission,
  onReturnToHangar,
}) => {
  const victory = stats.status === 'COMPLETED';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0B192C] text-white">
      {/* Subtle Live Sky Backdrop */}
      <div className="fixed inset-0 z-0">
        <SkyCanvas mode="attract" paused={false} mission={mission} runKey={0} />
        <div className="absolute inset-0 bg-[#071426]/82 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-8 sm:px-6">
        <div className="rounded-2xl bg-[#0B192C]/90 p-6 sm:p-8 border border-white/15 shadow-2xl space-y-6">
          {/* Outcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/15 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className={victory ? 'text-emerald-400' : 'text-rose-400'}>
                  {victory ? 'Mission Accomplished' : 'Aircraft Downed'}
                </span>
                <span aria-hidden="true" className="text-white/40">
                  ·
                </span>
                <span className="text-sky-200/80">{mission.missionName}</span>
                <span aria-hidden="true" className="text-white/40">
                  ·
                </span>
                <span className="text-orange-300">{mission.difficulty}</span>
              </div>
              <h1 className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-white">
                {victory ? 'Rescue Beacon Reached' : 'Emergency Water Landing'}
              </h1>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-sky-200/75">Final Score</div>
              <div className="font-mono text-3xl font-extrabold tabular-nums text-white">
                {stats.score.toLocaleString()}
              </div>
              <div className="mt-0.5 flex items-center sm:justify-end gap-1.5 text-xs">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span className={isNewBestScore ? 'font-semibold text-amber-300' : 'text-sky-200/75'}>
                  {isNewBestScore
                    ? 'New Personal Best'
                    : `Best: ${bestScore.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Recorded Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-white/15 pb-5">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-sky-200/75">
                <Package className="h-3.5 w-3.5 text-orange-400" />
                <span>Supplies Collected</span>
              </div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                {stats.suppliesCollected}/{stats.targetSupplies}
              </div>
            </div>
            <div>
              <div className="text-xs text-sky-200/75">Distance Flown</div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                {stats.distanceTravelled.toLocaleString()}m
              </div>
            </div>
            <div>
              <div className="text-xs text-sky-200/75">Obstacles Hit</div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                {stats.obstaclesHit}
              </div>
            </div>
            <div>
              <div className="text-xs text-sky-200/75">Flight Time · Boosts</div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-white">
                {stats.durationSeconds}s · {stats.boostsUsed}
              </div>
            </div>
          </div>

          {/* Gemini AI Flight Debrief */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-white">
                Gemini AI Flight Debrief
              </h2>
              {debrief && (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                  <Award className="h-4 w-4 text-amber-400" />
                  <span>Rank: {debrief.pilotRank}</span>
                </div>
              )}
            </div>

            {debriefLoading ? (
              <div className="rounded-xl bg-white/5 p-5 border border-white/10 space-y-3" aria-live="polite">
                <div className="h-4 w-48 animate-pulse rounded bg-white/15" />
                <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                <p className="text-xs text-sky-200/75 pt-1">
                  Gemini Flight Commander is reviewing your flight telemetry...
                </p>
              </div>
            ) : debriefError ? (
              <div className="rounded-xl bg-rose-950/50 p-4 border border-rose-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-sm text-rose-100">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  <div>
                    <p className="font-semibold">Unable to Generate AI Debrief</p>
                    <p className="mt-0.5 text-xs text-rose-200/90">{debriefError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRetryDebrief}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/25 transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Debrief
                </button>
              </div>
            ) : debrief ? (
              <div className="space-y-4">
                <p className="text-sm sm:text-base text-sky-50/95 leading-relaxed">
                  {debrief.pilotAssessment}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Performance Highlights</span>
                    </div>
                    <ul className="mt-2.5 space-y-2 text-xs sm:text-sm text-sky-100/90">
                      {debrief.highlights.map((item, idx) => (
                        <li key={idx} className="leading-snug">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-300">
                      <TrendingUp className="h-4 w-4" />
                      <span>Areas to Improve</span>
                    </div>
                    <ul className="mt-2.5 space-y-2 text-xs sm:text-sm text-sky-100/90">
                      {debrief.improvements.map((item, idx) => (
                        <li key={idx} className="leading-snug">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl bg-sky-950/60 px-4 py-3 border border-sky-400/25 flex items-start gap-2.5">
                  <Compass className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  <div className="text-xs sm:text-sm">
                    <span className="font-semibold text-sky-200">Next Challenge: </span>
                    <span className="text-white">{debrief.nextChallenge}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onNewAiMission}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-400 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4" />
              Next AI Mission
            </button>
            <button
              type="button"
              onClick={onRetrySameMission}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              Fly Again
            </button>
            <button
              type="button"
              onClick={onReturnToHangar}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-medium text-sky-200 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              <Home className="h-4 w-4" />
              Hangar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
