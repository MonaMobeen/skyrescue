import React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Flame,
  Heart,
  Package,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { MissionControlMessage, MissionPlan } from '../types/game';
import type { HudSnapshot, VirtualControls } from './SkyCanvas';

interface GameHudProps {
  mission: MissionPlan;
  hud: HudSnapshot;
  paused: boolean;
  soundEnabled: boolean;
  radioMessage: MissionControlMessage | null;
  virtualControlsRef: React.MutableRefObject<VirtualControls>;
  onTogglePause: () => void;
  onRestart: () => void;
  onExitToLanding: () => void;
  onToggleSound: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  mission,
  hud,
  paused,
  soundEnabled,
  radioMessage,
  virtualControlsRef,
  onTogglePause,
  onRestart,
  onExitToLanding,
  onToggleSound,
}) => {
  const distancePct = Math.min(100, Math.round((hud.distance / hud.targetDistance) * 100));
  const supplyDone = hud.suppliesCollected >= hud.targetSupplies;

  const bindTouch = (key: keyof VirtualControls) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      virtualControlsRef.current[key] = true;
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      virtualControlsRef.current[key] = false;
    },
    onPointerLeave: () => {
      virtualControlsRef.current[key] = false;
    },
    onPointerCancel: () => {
      virtualControlsRef.current[key] = false;
    },
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Top HUD Bar */}
      <div className="flex flex-col gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0B192C]/80 px-4 py-2.5 backdrop-blur-md border border-white/15 shadow-lg">
          {/* Mission Identity & Objective */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-sky-200/80">
              <span className="font-semibold text-orange-400">{mission.difficulty}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{mission.region}</span>
            </div>
            <div className="truncate font-display text-sm sm:text-base font-bold text-white">
              {mission.missionName}
            </div>
            <p className="hidden md:block truncate text-xs text-sky-100/75">
              {hud.beaconActive
                ? 'Rescue Zone ahead! Fly through the golden beacon ring to complete the mission.'
                : mission.objective}
            </p>
          </div>

          {/* Live Flight Telemetry Metrics */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Hull Health */}
            <div className="flex items-center gap-2" aria-label={`Health ${hud.health} of ${hud.maxHealth}`}>
              <div className="flex items-center gap-1">
                {Array.from({ length: hud.maxHealth }).map((_, idx) => (
                  <Heart
                    key={idx}
                    className={`h-4 w-4 transition-transform ${
                      idx < hud.health
                        ? 'fill-rose-500 text-rose-400 scale-100'
                        : 'fill-slate-700/60 text-slate-600 scale-90'
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-xs font-semibold tabular-nums text-white">
                {hud.health}/{hud.maxHealth}
              </span>
            </div>

            {/* Supplies */}
            <div className="flex items-center gap-1.5">
              <Package className={`h-4 w-4 ${supplyDone ? 'text-emerald-400' : 'text-orange-400'}`} />
              <div className="text-xs">
                <span className="text-sky-200/75 mr-1">Supplies</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    supplyDone ? 'text-emerald-300' : 'text-white'
                  }`}
                >
                  {hud.suppliesCollected}/{hud.targetSupplies}
                </span>
              </div>
            </div>

            {/* Distance */}
            <div className="hidden sm:flex flex-col min-w-[116px]">
              <div className="flex items-center justify-between text-[11px] text-sky-200/80">
                <span>Distance</span>
                <span className="font-mono font-bold tabular-nums text-white">
                  {hud.distance}m / {hud.targetDistance}m
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full bg-sky-400 transition-all duration-150"
                  style={{ width: `${distancePct}%` }}
                />
              </div>
            </div>

            {/* Boost Gauge */}
            <div className="hidden lg:flex flex-col min-w-[84px]">
              <div className="flex items-center justify-between text-[11px] text-sky-200/80">
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-400" />
                  Boost
                </span>
                <span className="font-mono tabular-nums text-white">{hud.boost}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className={`h-full transition-all duration-100 ${
                    hud.isBoosting ? 'bg-orange-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${hud.boost}%` }}
                />
              </div>
            </div>

            {/* Score */}
            <div className="text-right">
              <div className="text-[11px] text-sky-200/75">Score</div>
              <div className="font-mono text-base sm:text-lg font-bold tabular-nums text-white leading-none">
                {hud.score.toLocaleString()}
              </div>
            </div>

            {/* Controls: Sound & Pause */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleSound}
                aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:outline-2 focus-visible:outline-orange-400"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onTogglePause}
                aria-label={paused ? 'Resume flight' : 'Pause flight'}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 text-xs font-semibold text-white hover:bg-orange-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-white"
              >
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                <span className="hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Distance Strip */}
        <div className="sm:hidden flex items-center justify-between gap-3 rounded-xl bg-[#0B192C]/75 px-3 py-1.5 text-xs backdrop-blur-md border border-white/10">
          <span className="text-sky-200/80">Distance</span>
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-sky-400" style={{ width: `${distancePct}%` }} />
          </div>
          <span className="font-mono font-semibold tabular-nums text-white">
            {hud.distance}m / {hud.targetDistance}m
          </span>
        </div>

        {/* Gemini AI Mission Control Radio Banner */}
        {radioMessage && (
          <div className="max-w-lg rounded-xl bg-[#0B192C]/85 px-3.5 py-2.5 backdrop-blur-md border border-sky-400/30 shadow-md">
            <div className="flex items-start gap-2.5">
              <Radio className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-sky-300">
                  <span>Mission Control</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-orange-300">{radioMessage.directive}</span>
                </div>
                <p className="text-xs sm:text-sm text-white/95 leading-snug mt-0.5">
                  {radioMessage.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pause Modal Overlay */}
      {paused && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#061120]/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F2440] p-6 border border-white/15 shadow-2xl text-center">
            <h2 className="font-display text-2xl font-bold text-white">Flight Paused</h2>
            <p className="mt-1 text-sm text-sky-200/80">{mission.missionName}</p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-400 transition-colors whitespace-nowrap"
              >
                <Play className="h-4 w-4" />
                Resume Flight
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Mission
              </button>
              <button
                type="button"
                onClick={onExitToLanding}
                className="w-full rounded-xl px-5 py-2.5 text-sm font-medium text-sky-200 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
              >
                Return to Hangar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Touch Controls (Mobile/Touch friendly, unobtrusive on desktop) */}
      <div className="flex items-end justify-between gap-4">
        {/* Mobile D-Pad */}
        <div className="pointer-events-auto md:hidden grid grid-cols-3 gap-1.5 w-36">
          <div />
          <button
            type="button"
            aria-label="Fly up"
            {...bindTouch('up')}
            className="flex h-11 items-center justify-center rounded-xl bg-[#0B192C]/75 text-white border border-white/20 active:bg-orange-500"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <div />
          <button
            type="button"
            aria-label="Fly left"
            {...bindTouch('left')}
            className="flex h-11 items-center justify-center rounded-xl bg-[#0B192C]/75 text-white border border-white/20 active:bg-orange-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Fly down"
            {...bindTouch('down')}
            className="flex h-11 items-center justify-center rounded-xl bg-[#0B192C]/75 text-white border border-white/20 active:bg-orange-500"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Fly right"
            {...bindTouch('right')}
            className="flex h-11 items-center justify-center rounded-xl bg-[#0B192C]/75 text-white border border-white/20 active:bg-orange-500"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Subtle Control Reminder */}
        <div className="hidden md:flex items-center gap-3 rounded-xl bg-[#0B192C]/65 px-3.5 py-2 text-xs text-sky-100/80 backdrop-blur-sm border border-white/10">
          <span>Move: WASD or Arrow Keys</span>
          <span aria-hidden="true">·</span>
          <span>Boost: Space</span>
          <span aria-hidden="true">·</span>
          <span>Pause: P</span>
        </div>

        {/* Touch Boost Button */}
        <button
          type="button"
          aria-label="Turbo boost"
          {...bindTouch('boost')}
          className="pointer-events-auto md:hidden flex h-14 px-5 items-center gap-2 rounded-2xl bg-orange-500/90 text-sm font-bold text-white shadow-lg border border-orange-300/40 active:scale-95 active:bg-orange-400 whitespace-nowrap shrink-0"
        >
          <Flame className="h-5 w-5" />
          Boost ({hud.boost}%)
        </button>
      </div>
    </div>
  );
};
