import React, { useEffect, useRef } from 'react';
import { soundEngine } from '../audio/soundEngine';
import type {
  ControlEventType,
  FlightStats,
  MissionPlan,
  WeatherMood,
} from '../types/game';

export interface HudSnapshot {
  score: number;
  suppliesCollected: number;
  targetSupplies: number;
  distance: number;
  targetDistance: number;
  health: number;
  maxHealth: number;
  boost: number;
  isBoosting: boolean;
  beaconActive: boolean;
}

export interface VirtualControls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
}

interface SkyCanvasProps {
  mode: 'attract' | 'play';
  paused: boolean;
  mission: MissionPlan;
  runKey: number;
  virtualControlsRef?: React.MutableRefObject<VirtualControls>;
  onHudUpdate?: (snapshot: HudSnapshot) => void;
  onMilestone?: (event: ControlEventType, snapshot: HudSnapshot) => void;
  onGameEnd?: (stats: FlightStats) => void;
}

interface CloudObj {
  x: number;
  y: number;
  scale: number;
  speedFactor: number;
  layer: 0 | 1;
}

interface IslandObj {
  x: number;
  width: number;
  height: number;
  hasLighthouse: boolean;
  tint: number;
}

interface SupplyCrate {
  id: number;
  x: number;
  y: number;
  vy: number;
  phase: number;
  kind: 'supply' | 'repair';
  collected: boolean;
}

interface Obstacle {
  id: number;
  kind: 'storm' | 'spire' | 'balloon' | 'flock';
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
  hit: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingLabel {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface RescueBeacon {
  x: number;
  y: number;
  active: boolean;
}

const MOOD_PALETTES: Record<
  WeatherMood,
  {
    skyTop: string;
    skyMid: string;
    skyHorizon: string;
    sunColor: string;
    sunGlow: string;
    mountainFar: string;
    mountainNear: string;
    oceanTop: string;
    oceanBottom: string;
    cloudLight: string;
    cloudShade: string;
    rainAlpha: number;
  }
> = {
  'Sunny Archipelago': {
    skyTop: '#0B3C6F',
    skyMid: '#0EA5E9',
    skyHorizon: '#BAE6FD',
    sunColor: '#FEF08A',
    sunGlow: 'rgba(253, 224, 71, 0.32)',
    mountainFar: '#3B7EA1',
    mountainNear: '#1E557A',
    oceanTop: '#0284C7',
    oceanBottom: '#082F49',
    cloudLight: '#FFFFFF',
    cloudShade: '#CBD5E1',
    rainAlpha: 0,
  },
  'Golden Sunset': {
    skyTop: '#0F172A',
    skyMid: '#1E3A8A',
    skyHorizon: '#FB923C',
    sunColor: '#FDBA74',
    sunGlow: 'rgba(249, 115, 22, 0.42)',
    mountainFar: '#334155',
    mountainNear: '#1E293B',
    oceanTop: '#1D4ED8',
    oceanBottom: '#0B192C',
    cloudLight: '#FFEDD5',
    cloudShade: '#94A3B8',
    rainAlpha: 0,
  },
  'Monsoon Squall': {
    skyTop: '#091526',
    skyMid: '#1E3A5F',
    skyHorizon: '#64748B',
    sunColor: '#E2E8F0',
    sunGlow: 'rgba(148, 163, 184, 0.2)',
    mountainFar: '#1E293B',
    mountainNear: '#0F172A',
    oceanTop: '#0F4C5C',
    oceanBottom: '#061A2B',
    cloudLight: '#E2E8F0',
    cloudShade: '#64748B',
    rainAlpha: 0.25,
  },
};

export const SkyCanvas: React.FC<SkyCanvasProps> = ({
  mode,
  paused,
  mission,
  runKey,
  virtualControlsRef,
  onHudUpdate,
  onMilestone,
  onGameEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const callbacksRef = useRef({ onHudUpdate, onMilestone, onGameEnd });
  callbacksRef.current = { onHudUpdate, onMilestone, onGameEnd };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.clientWidth || 1280;
    let height = canvas.clientHeight || 720;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(320, rect.width || window.innerWidth);
      height = Math.max(360, rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Input state
    const keys: Record<string, boolean> = {};
    let pointerActive = false;
    let pointerTargetX = 0;
    let pointerTargetY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        mode === 'play' &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)
      ) {
        e.preventDefault();
      }
      keys[e.code] = true;
      keys[e.key.toLowerCase()] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
      keys[e.key.toLowerCase()] = false;
    };

    const updatePointerCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      pointerTargetX = clientX - rect.left;
      pointerTargetY = clientY - rect.top - 24;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (mode !== 'play' || pausedRef.current) return;
      soundEngine.unlock();
      pointerActive = true;
      updatePointerCoords(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerActive || mode !== 'play') return;
      updatePointerCoords(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      pointerActive = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // World entities
    const clouds: CloudObj[] = Array.from({ length: 12 }, (_, i) => ({
      x: (i / 12) * width * 1.3,
      y: 64 + ((i * 73) % Math.max(160, height * 0.55)),
      scale: 0.65 + (i % 4) * 0.25,
      speedFactor: i % 2 === 0 ? 0.24 : 0.45,
      layer: (i % 2) as 0 | 1,
    }));

    const islands: IslandObj[] = Array.from({ length: 4 }, (_, i) => ({
      x: i * 480 + 180,
      width: 140 + (i % 3) * 55,
      height: 55 + (i % 2) * 35,
      hasLighthouse: i % 2 === 0,
      tint: i % 2,
    }));

    const baseSpeed =
      mission.difficulty === 'Easy' ? 255 : mission.difficulty === 'Hard' ? 370 : 310;
    const maxHealth = 3;

    const plane = {
      x: Math.min(200, width * 0.22),
      y: height * 0.44,
      vx: 0,
      vy: 0,
      tilt: 0,
      invulnTimer: 0,
    };

    let supplies: SupplyCrate[] = [];
    let obstacles: Obstacle[] = [];
    const particles: Particle[] = [];
    const labels: FloatingLabel[] = [];
    const contrail: { x: number; y: number }[] = [];

    let nextEntityId = 1;
    let supplyTimer = 0.7;
    let obstacleTimer = 1.3;
    let repairTimer = 8;
    let score = 0;
    let suppliesCollected = 0;
    let distance = 0;
    let health = maxHealth;
    let boost = 100;
    let wasBoosting = false;
    let boostsUsed = 0;
    let obstaclesHit = 0;
    let elapsedPlaySeconds = 0;
    let screenShake = 0;
    let gameEnded = false;
    let lastHudSync = 0;
    let lightningFlash = 0;

    const beacon: RescueBeacon = {
      x: width + 220,
      y: height * 0.45,
      active: false,
    };

    const milestonesSent = new Set<ControlEventType>();

    const emitHud = () => {
      callbacksRef.current.onHudUpdate?.({
        score: Math.floor(score),
        suppliesCollected,
        targetSupplies: mission.targetSupplies,
        distance: Math.floor(distance),
        targetDistance: mission.targetDistance,
        health,
        maxHealth,
        boost: Math.round(boost),
        isBoosting: wasBoosting,
        beaconActive: beacon.active,
      });
    };

    const triggerMilestone = (event: ControlEventType) => {
      if (milestonesSent.has(event)) return;
      milestonesSent.add(event);
      callbacksRef.current.onMilestone?.(event, {
        score: Math.floor(score),
        suppliesCollected,
        targetSupplies: mission.targetSupplies,
        distance: Math.floor(distance),
        targetDistance: mission.targetDistance,
        health,
        maxHealth,
        boost: Math.round(boost),
        isBoosting: wasBoosting,
        beaconActive: beacon.active,
      });
    };

    const spawnParticles = (
      x: number,
      y: number,
      color: string,
      count: number,
      speedSpread = 160
    ) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const spd = 40 + Math.random() * speedSpread;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 0.45 + Math.random() * 0.35,
          maxLife: 0.8,
          size: 2.5 + Math.random() * 3.5,
          color,
        });
      }
    };

    const finishGame = (status: 'COMPLETED' | 'FAILED') => {
      if (gameEnded) return;
      gameEnded = true;
      if (status === 'COMPLETED') {
        const bonus = health * 200 + 400;
        score += bonus;
        soundEngine.playVictory();
        spawnParticles(plane.x, plane.y, '#FACC15', 28, 240);
      } else {
        soundEngine.playGameOver();
      }
      emitHud();
      callbacksRef.current.onGameEnd?.({
        missionName: mission.missionName,
        difficulty: mission.difficulty,
        status,
        score: Math.floor(score),
        suppliesCollected,
        targetSupplies: mission.targetSupplies,
        distanceTravelled: Math.floor(distance),
        targetDistance: mission.targetDistance,
        obstaclesHit,
        boostsUsed,
        durationSeconds: Math.max(1, Math.round(elapsedPlaySeconds)),
      });
    };

    if (mode === 'play') {
      emitHud();
    }

    let animId = 0;
    let lastTime = performance.now();
    let worldClock = 0;

    const drawCloud = (x: number, y: number, scale: number, light: string, shade: string, isStorm = false) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Soft bottom shadow puff
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(-28, 12, 24, 0, Math.PI * 2);
      ctx.arc(0, 14, 30, 0, Math.PI * 2);
      ctx.arc(32, 11, 23, 0, Math.PI * 2);
      ctx.fill();

      // Lit upper puffs
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(-26, 2, 24, 0, Math.PI * 2);
      ctx.arc(-2, -10, 32, 0, Math.PI * 2);
      ctx.arc(28, 0, 24, 0, Math.PI * 2);
      ctx.arc(10, 8, 24, 0, Math.PI * 2);
      ctx.fill();

      if (isStorm) {
        // Lightning bolt hint inside storm cloud
        if (Math.sin(worldClock * 11 + x * 0.05) > 0.35) {
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-4, 14);
          ctx.lineTo(-10, 28);
          ctx.lineTo(2, 28);
          ctx.lineTo(-5, 44);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const drawPlane = (
      px: number,
      py: number,
      tilt: number,
      boosting: boolean,
      invuln: boolean,
      time: number
    ) => {
      if (invuln && Math.floor(time * 16) % 2 === 0) {
        ctx.save();
        ctx.globalAlpha = 0.45;
      } else {
        ctx.save();
      }

      ctx.translate(px, py);
      ctx.rotate(tilt);

      // Boost exhaust flame
      if (boosting) {
        const flicker = 14 + Math.sin(time * 45) * 6;
        const grad = ctx.createLinearGradient(-46, 2, -46 - flicker - 22, 2);
        grad.addColorStop(0, '#FFF7ED');
        grad.addColorStop(0.35, '#F97316');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-34, -4);
        ctx.lineTo(-46 - flicker - 18, 2);
        ctx.lineTo(-34, 8);
        ctx.closePath();
        ctx.fill();
      }

      // Rescue seaplane pontoons / struts
      ctx.strokeStyle = '#1E3A5F';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.lineTo(-14, 21);
      ctx.moveTo(12, 12);
      ctx.lineTo(14, 21);
      ctx.stroke();

      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.roundRect(-24, 19, 46, 7, 3.5);
      ctx.fill();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.roundRect(10, 19, 12, 7, [0, 3.5, 3.5, 0]);
      ctx.fill();

      // Rear tail wing (background)
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.moveTo(-26, -2);
      ctx.lineTo(-40, -22);
      ctx.lineTo(-28, -22);
      ctx.lineTo(-14, -2);
      ctx.closePath();
      ctx.fill();

      // Fuselage shadow & main white body
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-36, 2);
      ctx.quadraticCurveTo(-24, -12, 18, -11);
      ctx.quadraticCurveTo(42, -9, 46, 2);
      ctx.quadraticCurveTo(40, 14, 12, 14);
      ctx.quadraticCurveTo(-22, 14, -36, 2);
      ctx.closePath();
      ctx.fill();

      // 3D-inspired lower fuselage shading
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.moveTo(-32, 4);
      ctx.quadraticCurveTo(0, 14, 38, 6);
      ctx.quadraticCurveTo(18, 15, -18, 13);
      ctx.closePath();
      ctx.fill();

      // Rescue orange nose & navy livery stripe
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(24, -10);
      ctx.quadraticCurveTo(42, -8, 46, 2);
      ctx.quadraticCurveTo(40, 12, 24, 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-24, 1, 48, 3.5);

      // Cockpit canopy glass
      const glassGrad = ctx.createLinearGradient(4, -13, 20, -2);
      glassGrad.addColorStop(0, '#BAE6FD');
      glassGrad.addColorStop(0.5, '#0284C7');
      glassGrad.addColorStop(1, '#0C4A6E');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.moveTo(-2, -9);
      ctx.quadraticCurveTo(10, -20, 24, -8);
      ctx.closePath();
      ctx.fill();

      // Highlight glint on canopy
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(5, -12);
      ctx.quadraticCurveTo(12, -15, 18, -10);
      ctx.stroke();

      // Foreground wing with 3D perspective
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, 4);
      ctx.lineTo(14, 4);
      ctx.lineTo(4, 16);
      ctx.lineTo(-14, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wingtip rescue orange stripe
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.lineTo(6, 12);
      ctx.lineTo(4, 16);
      ctx.lineTo(-14, 15);
      ctx.closePath();
      ctx.fill();

      // Spinning propeller blur
      const propR = 15 + Math.sin(time * 55) * 3;
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(48, 2 - propR);
      ctx.lineTo(48, 2 + propR);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(47, 2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawSupplyCrate = (s: SupplyCrate, time: number) => {
      const sway = Math.sin(time * 3 + s.phase) * 5;
      ctx.save();
      ctx.translate(s.x + sway, s.y);

      if (s.kind === 'repair') {
        // Glowing emerald repair capsule
        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, 24 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#10B981';
        ctx.strokeStyle = '#ECFDF5';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-15, -15, 30, 30, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-3, -9, 6, 18);
        ctx.fillRect(-9, -3, 18, 6);
        ctx.restore();
        return;
      }

      // Glowing gold-orange rescue beacon halo
      ctx.fillStyle = 'rgba(251, 146, 60, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 10, 26 + Math.sin(time * 5 + s.phase) * 3, 0, Math.PI * 2);
      ctx.fill();

      // Parachute cords
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-18, -14);
      ctx.lineTo(-9, 2);
      ctx.moveTo(18, -14);
      ctx.lineTo(9, 2);
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 2);
      ctx.stroke();

      // Parachute canopy
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(0, -13, 19, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -13, 10, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // Supply crate box
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-13, 2, 26, 22, 4);
      ctx.fill();
      ctx.stroke();

      // Orange cross emblem
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(-2.5, 6, 5, 14);
      ctx.fillRect(-7, 10.5, 14, 5);

      ctx.restore();
    };

    const drawObstacle = (o: Obstacle, time: number, oceanTopY: number) => {
      ctx.save();
      if (o.kind === 'storm') {
        drawCloud(o.x, o.y, 1.15, '#475569', '#1E293B', true);
      } else if (o.kind === 'spire') {
        const baseY = oceanTopY + 10;
        const peakY = o.y - o.h / 2;
        const halfW = o.w / 2;

        // Sea stack body
        const grad = ctx.createLinearGradient(o.x - halfW, peakY, o.x + halfW, baseY);
        grad.addColorStop(0, '#475569');
        grad.addColorStop(0.5, '#1E293B');
        grad.addColorStop(1, '#0F172A');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(o.x - halfW, baseY);
        ctx.lineTo(o.x - halfW * 0.45, peakY + 26);
        ctx.lineTo(o.x, peakY);
        ctx.lineTo(o.x + halfW * 0.48, peakY + 32);
        ctx.lineTo(o.x + halfW, baseY);
        ctx.closePath();
        ctx.fill();

        // Lit ridge highlight
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.beginPath();
        ctx.moveTo(o.x, peakY);
        ctx.lineTo(o.x - halfW * 0.45, peakY + 26);
        ctx.lineTo(o.x - 4, baseY);
        ctx.closePath();
        ctx.fill();

        // Warning beacon tip
        const blink = 0.55 + 0.45 * Math.sin(time * 8 + o.phase);
        ctx.fillStyle = `rgba(239, 68, 68, ${blink})`;
        ctx.beginPath();
        ctx.arc(o.x, peakY - 4, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === 'balloon') {
        const bobY = o.y + Math.sin(time * 2.5 + o.phase) * 14;
        ctx.translate(o.x, bobY);

        // Gondola basket
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-7, 14);
        ctx.lineTo(-4, 24);
        ctx.moveTo(7, 14);
        ctx.lineTo(4, 24);
        ctx.stroke();

        ctx.fillStyle = '#78350F';
        ctx.fillRect(-6, 24, 12, 8);

        // Weather balloon sphere
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(0, -4, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(0, -4, 9, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#991B1B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -4, 20, 0, Math.PI * 2);
        ctx.stroke();
      } else if (o.kind === 'flock') {
        const flap = Math.sin(time * 12 + o.phase) * 7;
        const offsets = [
          { dx: 0, dy: 0 },
          { dx: 20, dy: -13 },
          { dx: 22, dy: 13 },
        ];
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (const off of offsets) {
          ctx.beginPath();
          ctx.moveTo(o.x + off.dx - 11, o.y + off.dy + flap);
          ctx.quadraticCurveTo(o.x + off.dx - 4, o.y + off.dy - 8, o.x + off.dx, o.y + off.dy);
          ctx.quadraticCurveTo(o.x + off.dx + 4, o.y + off.dy - 8, o.x + off.dx + 11, o.y + off.dy + flap);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const drawRescueBeacon = (bx: number, by: number, oceanTopY: number, time: number) => {
      ctx.save();
      // Glowing vertical rescue beam
      const beamGrad = ctx.createLinearGradient(bx, 0, bx, oceanTopY);
      beamGrad.addColorStop(0, 'rgba(251, 146, 60, 0)');
      beamGrad.addColorStop(0.5, 'rgba(251, 146, 60, 0.35)');
      beamGrad.addColorStop(1, 'rgba(250, 204, 21, 0.55)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(bx - 34, 0, 68, oceanTopY);

      // Floating target ring
      const pulse = 36 + Math.sin(time * 6) * 5;
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bx, by, pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, pulse - 10, 0, Math.PI * 2);
      ctx.stroke();

      // Label above beacon ring
      ctx.fillStyle = '#0B192C';
      ctx.beginPath();
      ctx.roundRect(bx - 56, by - pulse - 34, 112, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.font = '700 12px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RESCUE ZONE', bx, by - pulse - 22);
      ctx.restore();
    };

    const step = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      const isPlaying = mode === 'play' && !pausedRef.current && !gameEnded;
      const palette = MOOD_PALETTES[mission.weatherMood] || MOOD_PALETTES['Sunny Archipelago'];

      if (mode === 'attract' || isPlaying) {
        worldClock += dt;
      }

      // Compute current airspeed
      const vc = virtualControlsRef?.current;
      const wantBoost =
        isPlaying &&
        (keys['Space'] || keys[' '] || Boolean(vc?.boost)) &&
        boost > 2;

      if (wantBoost && !wasBoosting) {
        boostsUsed += 1;
        soundEngine.playBoost();
      }
      wasBoosting = wantBoost;

      const difficultyRamp = mode === 'play' ? 1 + Math.min(0.35, (distance / mission.targetDistance) * 0.35) : 1;
      const airspeed =
        mode === 'attract'
          ? 160
          : baseSpeed * difficultyRamp * (wantBoost ? 1.75 : 1);

      const oceanTopY = height - 64;

      if (isPlaying) {
        elapsedPlaySeconds += dt;
        if (plane.invulnTimer > 0) plane.invulnTimer = Math.max(0, plane.invulnTimer - dt);
        if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 22);

        if (wantBoost) {
          boost = Math.max(0, boost - 34 * dt);
        } else {
          boost = Math.min(100, boost + 18 * dt);
        }

        // Distance & passive flight score
        const distDelta = (airspeed * dt) / 4.2;
        distance += distDelta;
        score += distDelta * (wantBoost ? 0.55 : 0.35);

        // Steering
        let moveX = 0;
        let moveY = 0;
        if (keys['ArrowUp'] || keys['w']) moveY -= 1;
        if (keys['ArrowDown'] || keys['s']) moveY += 1;
        if (keys['ArrowLeft'] || keys['a']) moveX -= 1;
        if (keys['ArrowRight'] || keys['d']) moveX += 1;

        if (vc) {
          if (vc.up) moveY -= 1;
          if (vc.down) moveY += 1;
          if (vc.left) moveX -= 1;
          if (vc.right) moveX += 1;
        }

        if (pointerActive && moveX === 0 && moveY === 0) {
          const dx = pointerTargetX - plane.x;
          const dy = pointerTargetY - plane.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 8) {
            moveX = Math.max(-1, Math.min(1, dx / 70));
            moveY = Math.max(-1, Math.min(1, dy / 70));
          }
        }

        const accelX = 1450;
        const accelY = 1650;
        plane.vx += moveX * accelX * dt;
        plane.vy += moveY * accelY * dt;

        // Damping
        const damp = Math.pow(0.0018, dt);
        plane.vx *= damp;
        plane.vy *= damp;

        plane.x += plane.vx * dt;
        plane.y += plane.vy * dt;

        // Keep aircraft safely inside flight corridor
        const minX = 58;
        const maxX = Math.min(width - 90, width * 0.65);
        const minY = 82;
        const maxY = oceanTopY - 34;

        if (plane.x < minX) {
          plane.x = minX;
          plane.vx = 0;
        } else if (plane.x > maxX) {
          plane.x = maxX;
          plane.vx = 0;
        }

        if (plane.y < minY) {
          plane.y = minY;
          plane.vy = 0;
        } else if (plane.y > maxY) {
          plane.y = maxY;
          plane.vy = 0;
        }

        const targetTilt = Math.max(-0.38, Math.min(0.38, plane.vy * 0.0012));
        plane.tilt += (targetTilt - plane.tilt) * Math.min(1, dt * 12);

        // Spawn supplies
        const needMoreSupplies = suppliesCollected < mission.targetSupplies;
        supplyTimer -= dt;
        if (supplyTimer <= 0 && !beacon.active) {
          const pastTargetDist = distance >= mission.targetDistance;
          supplyTimer = pastTargetDist && needMoreSupplies ? 0.95 : 1.55 + Math.random() * 0.7;
          supplies.push({
            id: nextEntityId++,
            x: width + 45,
            y: 96 + Math.random() * Math.max(120, oceanTopY - 190),
            vy: 14 + Math.random() * 14,
            phase: Math.random() * Math.PI * 2,
            kind: 'supply',
            collected: false,
          });
        }

        // Occasional repair kit if damaged
        if (health < maxHealth && !beacon.active) {
          repairTimer -= dt;
          if (repairTimer <= 0) {
            repairTimer = 9 + Math.random() * 5;
            supplies.push({
              id: nextEntityId++,
              x: width + 45,
              y: 110 + Math.random() * Math.max(120, oceanTopY - 210),
              vy: 10,
              phase: Math.random() * Math.PI * 2,
              kind: 'repair',
              collected: false,
            });
          }
        }

        // Spawn obstacles
        obstacleTimer -= dt;
        if (obstacleTimer <= 0 && !beacon.active) {
          const baseObsInterval =
            mission.difficulty === 'Easy' ? 1.55 : mission.difficulty === 'Hard' ? 0.92 : 1.22;
          obstacleTimer = baseObsInterval / difficultyRamp + Math.random() * 0.45;

          const roll = Math.random();
          if (roll < 0.34) {
            // Storm thundercloud
            obstacles.push({
              id: nextEntityId++,
              kind: 'storm',
              x: width + 90,
              y: 95 + Math.random() * Math.max(100, oceanTopY - 220),
              w: 96,
              h: 56,
              phase: Math.random() * Math.PI * 2,
              hit: false,
            });
          } else if (roll < 0.62) {
            // Sea stack / mountain spire rising from ocean
            const spireH = Math.min(oceanTopY * 0.46, 120 + Math.random() * 110);
            obstacles.push({
              id: nextEntityId++,
              kind: 'spire',
              x: width + 90,
              y: oceanTopY - spireH / 2 + 10,
              w: 78,
              h: spireH,
              phase: Math.random() * Math.PI * 2,
              hit: false,
            });
          } else if (roll < 0.84) {
            // Weather balloon
            obstacles.push({
              id: nextEntityId++,
              kind: 'balloon',
              x: width + 60,
              y: 120 + Math.random() * Math.max(110, oceanTopY - 220),
              w: 44,
              h: 54,
              phase: Math.random() * Math.PI * 2,
              hit: false,
            });
          } else {
            // Bird flock
            obstacles.push({
              id: nextEntityId++,
              kind: 'flock',
              x: width + 70,
              y: 105 + Math.random() * Math.max(120, oceanTopY - 210),
              w: 58,
              h: 36,
              phase: Math.random() * Math.PI * 2,
              hit: false,
            });
          }
        }

        // Activate Rescue Beacon when both supplies and distance objectives are met
        if (
          !beacon.active &&
          suppliesCollected >= mission.targetSupplies &&
          distance >= mission.targetDistance
        ) {
          beacon.active = true;
          beacon.x = width + 180;
          beacon.y = Math.min(oceanTopY - 100, Math.max(140, height * 0.45));
          soundEngine.playRadio();
          triggerMilestone('FINAL_APPROACH');
        }

        if (beacon.active) {
          beacon.x -= airspeed * 0.72 * dt;
          const distToBeacon = Math.hypot(plane.x - beacon.x, plane.y - beacon.y);
          if (distToBeacon < 62 || plane.x > beacon.x + 25) {
            finishGame('COMPLETED');
          }
        }

        // Move supplies & check collection
        for (const s of supplies) {
          s.x -= airspeed * 0.88 * dt;
          s.y += s.vy * dt;
          if (s.y > oceanTopY - 26) {
            s.y = oceanTopY - 26;
            s.vy = -12;
          }
          if (!s.collected) {
            const dx = plane.x - s.x;
            const dy = plane.y - s.y;
            if (Math.hypot(dx, dy) < 42) {
              s.collected = true;
              if (s.kind === 'repair') {
                health = Math.min(maxHealth, health + 1);
                score += 100;
                soundEngine.playRepair();
                spawnParticles(s.x, s.y, '#10B981', 14);
                labels.push({ x: s.x, y: s.y - 16, text: '+1 HULL', color: '#34D399', life: 1 });
              } else {
                suppliesCollected += 1;
                const pts = wantBoost ? 200 : 150;
                score += pts;
                soundEngine.playPickup();
                spawnParticles(s.x, s.y, '#F97316', 16);
                labels.push({
                  x: s.x,
                  y: s.y - 16,
                  text: `+1 SUPPLY  +${pts}`,
                  color: '#FDBA74',
                  life: 1.05,
                });

                if (suppliesCollected === 1) {
                  triggerMilestone('FIRST_PICKUP');
                } else if (suppliesCollected === Math.ceil(mission.targetSupplies / 2)) {
                  triggerMilestone('HALFWAY');
                } else if (suppliesCollected === mission.targetSupplies) {
                  triggerMilestone('FINAL_APPROACH');
                }
              }
              emitHud();
            }
          }
        }
        supplies = supplies.filter((s) => !s.collected && s.x > -70);

        // Move obstacles & check collisions
        for (const o of obstacles) {
          const extraSpd = o.kind === 'flock' ? 1.18 : 1;
          o.x -= airspeed * extraSpd * dt;

          if (!o.hit && plane.invulnTimer <= 0) {
            const oy =
              o.kind === 'balloon' ? o.y + Math.sin(worldClock * 2.5 + o.phase) * 14 : o.y;
            const halfW = o.w * 0.4;
            const halfH = o.h * 0.38;
            const planeRx = 28;
            const planeRy = 13;

            const overlapX = Math.abs(plane.x - o.x) < halfW + planeRx;
            const overlapY = Math.abs(plane.y - oy) < halfH + planeRy;

            if (overlapX && overlapY) {
              o.hit = true;
              obstaclesHit += 1;
              health = Math.max(0, health - 1);
              plane.invulnTimer = 1.65;
              screenShake = 10;
              soundEngine.playHit();
              spawnParticles(plane.x + 10, plane.y, '#EF4444', 20, 210);
              labels.push({
                x: plane.x,
                y: plane.y - 24,
                text: 'HULL HIT -1',
                color: '#FCA5A5',
                life: 1.1,
              });

              if (health === 1) {
                triggerMilestone('LOW_HEALTH');
              }
              emitHud();

              if (health <= 0) {
                finishGame('FAILED');
              }
            }
          }
        }
        obstacles = obstacles.filter((o) => o.x > -140);

        // Smoke trail when low health
        if (health === 1 && Math.random() < 0.45) {
          particles.push({
            x: plane.x - 24,
            y: plane.y + 4,
            vx: -70 - Math.random() * 40,
            vy: -18 - Math.random() * 25,
            life: 0.6,
            maxLife: 0.6,
            size: 4 + Math.random() * 4,
            color: 'rgba(203, 213, 225, 0.7)',
          });
        }

        // Periodic HUD sync
        if (now - lastHudSync > 90) {
          lastHudSync = now;
          emitHud();
        }
      } else if (mode === 'attract') {
        // Gentle figure-8 showcase cruise
        plane.x = width * 0.5 + Math.sin(worldClock * 0.55) * Math.min(120, width * 0.14);
        plane.y = height * 0.36 + Math.sin(worldClock * 1.1) * 26;
        plane.tilt = Math.cos(worldClock * 1.1) * 0.08;
      }

      // Scroll parallax scenery when active or attract
      if (mode === 'attract' || isPlaying) {
        for (const c of clouds) {
          c.x -= airspeed * c.speedFactor * dt;
          if (c.x < -140) {
            c.x = width + 140;
            c.y = 65 + Math.random() * Math.max(140, oceanTopY * 0.58);
          }
        }
        for (const isl of islands) {
          isl.x -= airspeed * 0.28 * dt;
          if (isl.x + isl.width < -60) {
            isl.x = width + 160 + Math.random() * 240;
          }
        }

        contrail.push({ x: plane.x - 32, y: plane.y + 2 });
        if (contrail.length > 22) contrail.shift();
        for (const pt of contrail) {
          pt.x -= airspeed * dt * 0.65;
        }

        if (mission.weatherMood === 'Monsoon Squall' && Math.random() < 0.008) {
          lightningFlash = 0.25;
        }
      }

      if (lightningFlash > 0) lightningFlash = Math.max(0, lightningFlash - dt);

      // Update particles & floating labels
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      for (const l of labels) {
        l.y -= 34 * dt;
        l.life -= dt;
      }
      for (let i = labels.length - 1; i >= 0; i--) {
        if (labels[i].life <= 0) labels.splice(i, 1);
      }

      // === RENDER ===
      ctx.save();
      ctx.scale(dpr, dpr);

      if (screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * screenShake,
          (Math.random() - 0.5) * screenShake
        );
      }

      // 1. Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, oceanTopY);
      skyGrad.addColorStop(0, palette.skyTop);
      skyGrad.addColorStop(0.58, palette.skyMid);
      skyGrad.addColorStop(1, palette.skyHorizon);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, oceanTopY + 4);

      if (lightningFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlash * 0.55})`;
        ctx.fillRect(0, 0, width, oceanTopY);
      }

      // 2. Sun & atmospheric bloom
      const sunX = width * 0.78;
      const sunY = oceanTopY * 0.34;
      const sunGlowGrad = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 170);
      sunGlowGrad.addColorStop(0, palette.sunGlow);
      sunGlowGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sunGlowGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 170, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.sunColor;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
      ctx.fill();

      // 3. Far clouds
      for (const c of clouds) {
        if (c.layer === 0) {
          drawCloud(c.x, c.y, c.scale, palette.cloudLight, palette.cloudShade);
        }
      }

      // 4. Distant parallax mountain ridge silhouette
      ctx.fillStyle = palette.mountainFar;
      ctx.beginPath();
      ctx.moveTo(0, oceanTopY);
      const ridgeOffset = (worldClock * 24) % 320;
      for (let x = -320; x <= width + 320; x += 160) {
        const px = x - ridgeOffset;
        const peak = 46 + Math.abs(Math.sin(x * 0.013)) * 58;
        ctx.lineTo(px + 80, oceanTopY - peak);
        ctx.lineTo(px + 160, oceanTopY);
      }
      ctx.lineTo(width, oceanTopY);
      ctx.closePath();
      ctx.fill();

      // 5. Scrolling Tropical Islands with Lighthouses
      for (const isl of islands) {
        ctx.fillStyle = isl.tint === 0 ? palette.mountainNear : '#1E4668';
        ctx.beginPath();
        ctx.moveTo(isl.x, oceanTopY + 2);
        ctx.quadraticCurveTo(
          isl.x + isl.width * 0.5,
          oceanTopY - isl.height * 1.6,
          isl.x + isl.width,
          oceanTopY + 2
        );
        ctx.closePath();
        ctx.fill();

        // Sandy shoreline strip
        ctx.fillStyle = '#FDE68A';
        ctx.fillRect(isl.x + 10, oceanTopY - 4, isl.width - 20, 5);

        if (isl.hasLighthouse) {
          const lx = isl.x + isl.width * 0.65;
          const ly = oceanTopY - isl.height * 0.52;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(lx - 4, ly - 24, 8, 24);
          ctx.fillStyle = '#F97316';
          ctx.fillRect(lx - 4, ly - 16, 8, 6);
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(lx, ly - 26, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 6. Midground clouds
      for (const c of clouds) {
        if (c.layer === 1) {
          drawCloud(c.x, c.y, c.scale, palette.cloudLight, palette.cloudShade);
        }
      }

      // 7. Ocean Surface with layered 3D-inspired wave crests
      const oceanGrad = ctx.createLinearGradient(0, oceanTopY, 0, height);
      oceanGrad.addColorStop(0, palette.oceanTop);
      oceanGrad.addColorStop(1, palette.oceanBottom);
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, oceanTopY, width, height - oceanTopY);

      // Sun shimmer on water
      ctx.fillStyle = 'rgba(254, 240, 138, 0.16)';
      ctx.beginPath();
      ctx.moveTo(sunX - 30, oceanTopY);
      ctx.lineTo(sunX + 30, oceanTopY);
      ctx.lineTo(sunX + 95, height);
      ctx.lineTo(sunX - 95, height);
      ctx.closePath();
      ctx.fill();

      // Animated wave lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      for (let row = 0; row < 3; row++) {
        const wy = oceanTopY + 12 + row * 18;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 24) {
          const waveY = wy + Math.sin(x * 0.03 + worldClock * (4 + row) + row) * 3;
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }

      // Speed lines during boost
      if (wantBoost) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const sy = ((i * 89 + worldClock * 310) % (oceanTopY - 70)) + 45;
          const sx = width - ((worldClock * 1100 + i * 210) % (width + 200));
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 65, sy);
          ctx.stroke();
        }
      }

      // Contrail behind plane
      if (contrail.length > 2) {
        ctx.strokeStyle = wantBoost ? 'rgba(251, 146, 60, 0.45)' : 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = wantBoost ? 4 : 2.5;
        ctx.beginPath();
        contrail.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // Rescue Beacon (when active)
      if (mode === 'play' && beacon.active) {
        drawRescueBeacon(beacon.x, beacon.y, oceanTopY, worldClock);
      }

      // Supplies & Obstacles (Play mode)
      if (mode === 'play') {
        for (const s of supplies) {
          drawSupplyCrate(s, worldClock);
        }
        for (const o of obstacles) {
          drawObstacle(o, worldClock, oceanTopY);
        }
      }

      // Aircraft
      drawPlane(
        plane.x,
        plane.y,
        plane.tilt,
        wantBoost,
        mode === 'play' && plane.invulnTimer > 0,
        worldClock
      );

      // Monsoon rain streaks (subtle foreground atmosphere)
      if (palette.rainAlpha > 0) {
        ctx.strokeStyle = `rgba(226, 232, 240, ${palette.rainAlpha})`;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 36; i++) {
          const rx = ((i * 137 + worldClock * 520) % (width + 100)) - 50;
          const ry = (i * 97 + worldClock * 680) % oceanTopY;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 14, ry + 20);
          ctx.stroke();
        }
      }

      // Particles
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Floating pickup/hit labels
      for (const l of labels) {
        ctx.globalAlpha = Math.min(1, l.life * 1.2);
        ctx.font = '700 14px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0B192C';
        ctx.fillText(l.text, l.x + 1, l.y + 1);
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, l.x, l.y);
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [mode, mission, runKey, virtualControlsRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="SKYRESCUE interactive flight canvas"
      className="block w-full h-full touch-none select-none"
    />
  );
};
