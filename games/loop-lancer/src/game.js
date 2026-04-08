const C = {
  ARENA_PAD: 40,
  PLAYER_RADIUS: 8,
  DRONE_RADIUS: 7,
  TRAIL_WIDTH: 3,
  TRAIL_DURATION: 2500,
  DASH_SPEED: 700,
  DASH_COOLDOWN: 200,
  DRONE_TURN_RATE: 2.0,
  DRONE_BASE_SPEED: 80,
  DRONE_SPEED_STEP: 8,
  WAVE_BREAK: 1500,
  WAVE_PREVIEW: 1200,
  COMBO_SHIELD: 5,
  BASE_DRONES: 3,
  DRONES_PER_WAVE: 1.4,
  SPAWN_STAGGER: 400,
  TRAIL_GLOW: 12,
  ZOOM_BASE: 1.0,
  ZOOM_MIN: 0.82,
  ZOOM_WAVE_STEP: 0.02,
  WANDERER_DRIFT: 3.0,
  POWERUP_DROP_CHANCE: 0.08,
  POWERUP_RADIUS: 6,
  POWERUP_LIFETIME: 8000,
  POWERUP_DURATION: { wide: 5000, slow: 4000, double: 5000, extend: 6000 },
  COLORS: {
    bg: '#0a0a1a',
    arena: 'rgba(56, 189, 248, 0.08)',
    arenaBorder: 'rgba(56, 189, 248, 0.15)',
    player: '#38bdf8',
    playerGlow: 'rgba(56, 189, 248, 0.4)',
    trail: '#22d3ee',
    trailWithAlpha: (a) => `rgba(34, 211, 238, ${a})`,
    drone: '#fbbf24',
    droneGlow: 'rgba(251, 191, 36, 0.3)',
    droneWanderer: '#f87171',
    droneShielded: '#a78bfa',
    droneSplitter: '#fb923c',
    shield: '#4ade80',
    hud: 'rgba(226, 232, 240, 0.7)',
    combo: '#facc15',
    powerWide: '#38bdf8',
    powerSlow: '#c084fc',
    powerDouble: '#34d399',
    powerExtend: '#fbbf24',
  },
  FONT: '"Avenir Next", "Segoe UI", sans-serif',
};

function initState() {
  return {
    phase: 'title',
    player: { x: 0, y: 0, tx: 0, ty: 0, dashing: false, cooldown: 0 },
    trails: [],
    drones: [],
    particles: [],
    score: 0,
    combo: 0,
    hasShield: false,
    multiKill: { text: '', timer: 0 },
    wave: 0,
    waveTimer: 0,
    spawnQueue: [],
    shake: 0,
    gameOverAt: 0,
    arenaRadius: 0,
    cx: 0,
    cy: 0,
    zoom: 1.0,
    zoomTarget: 1.0,
    previewDrones: [],
    powerups: [],
    activePower: null,
  };
}

const canvas = document.getElementById('game');
const useP3 =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(color-gamut: p3)').matches;

if (useP3) {
  Object.assign(C.COLORS, {
    player: 'color(display-p3 0.15 0.78 1.0)',
    playerGlow: 'color(display-p3 0.15 0.78 1.0 / 0.4)',
    trail: 'color(display-p3 0.05 0.87 0.95)',
    trailWithAlpha: (a) => `color(display-p3 0.05 0.87 0.95 / ${a})`,
    drone: 'color(display-p3 1.0 0.78 0.05)',
    droneGlow: 'color(display-p3 1.0 0.78 0.05 / 0.3)',
    droneWanderer: 'color(display-p3 1.0 0.45 0.35)',
    droneShielded: 'color(display-p3 0.7 0.5 1.0)',
    droneSplitter: 'color(display-p3 1.0 0.6 0.15)',
    shield: 'color(display-p3 0.15 0.92 0.45)',
    combo: 'color(display-p3 1.0 0.84 0.05)',
    powerWide: 'color(display-p3 0.15 0.78 1.0)',
    powerSlow: 'color(display-p3 0.8 0.48 1.0)',
    powerDouble: 'color(display-p3 0.1 0.88 0.55)',
    powerExtend: 'color(display-p3 1.0 0.78 0.05)',
  });
}

const Sound = (() => {
  let actx = null;
  function ac() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    return actx;
  }
  function play(fn) {
    try {
      fn(ac());
    } catch (_) {
      /* audio not available */
    }
  }

  function tone(
    a,
    { type = 'sine', freq, freqEnd, vol = 0.15, dur = 0.08, start = 0 } = {},
  ) {
    const t = a.currentTime + start;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== undefined)
      osc.frequency.linearRampToValueAtTime(freqEnd, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    dash: () => play((a) => tone(a, { freq: 200, freqEnd: 600, dur: 0.08 })),
    hit: () => play((a) => tone(a, { type: 'triangle', freq: 600, dur: 0.06 })),
    shieldGain: () =>
      play((a) => {
        tone(a, { freq: 400, freqEnd: 800, vol: 0.12, dur: 0.06 });
        tone(a, {
          freq: 600,
          freqEnd: 1200,
          vol: 0.12,
          dur: 0.06,
          start: 0.08,
        });
      }),
    shieldBreak: () => play((a) => tone(a, { freq: 120, vol: 0.2, dur: 0.2 })),
    gameOver: () => play((a) => tone(a, { freq: 400, freqEnd: 100, dur: 0.5 })),
    waveStart: () =>
      play((a) =>
        tone(a, { type: 'triangle', freq: 660, vol: 0.1, dur: 0.12 }),
      ),
    multiKill: () =>
      play((a) => tone(a, { type: 'triangle', freq: 900, dur: 0.06 })),
    powerUp: () =>
      play((a) => {
        for (const [freq, start] of [
          [500, 0],
          [700, 0.06],
          [900, 0.12],
        ]) {
          tone(a, { type: 'triangle', freq, vol: 0.1, dur: 0.04, start });
        }
      }),
  };
})();

const ctx = canvas.getContext(
  '2d',
  useP3 ? { colorSpace: 'display-p3' } : undefined,
);

const state = initState();
const POWERUP_TYPES = ['wide', 'slow', 'double', 'extend'];
const POWERUP_COLORS = {
  wide: C.COLORS.powerWide,
  slow: C.COLORS.powerSlow,
  double: C.COLORS.powerDouble,
  extend: C.COLORS.powerExtend,
};

function droneRadius(type) {
  if (type === 'wanderer') return C.DRONE_RADIUS * 1.2;
  if (type === 'splitter') return C.DRONE_RADIUS * 1.3;
  if (type === 'mini') return C.DRONE_RADIUS * 0.6;
  return C.DRONE_RADIUS;
}

function droneColor(type) {
  if (type === 'wanderer') return C.COLORS.droneWanderer;
  if (type === 'shielded') return C.COLORS.droneShielded;
  if (type === 'splitter' || type === 'mini') return C.COLORS.droneSplitter;
  return C.COLORS.drone;
}

function drawDiamond(r) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(0, r * 0.6);
  ctx.lineTo(-r, 0);
  ctx.lineTo(0, -r * 0.6);
  ctx.closePath();
}

function effectiveTrailLife() {
  return state.activePower?.type === 'extend'
    ? C.TRAIL_DURATION * 2
    : C.TRAIL_DURATION;
}

function effectiveTrailWidth() {
  return state.activePower?.type === 'wide' ? C.TRAIL_WIDTH * 2 : C.TRAIL_WIDTH;
}
let elapsed = 0;
let lastTime = 0;
let cursorX = 0;
let cursorY = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.width = w;
  state.height = h;
  state.cx = w / 2;
  state.cy = h / 2;
  const half = Math.min(w, h) / 2;
  const pad = half - C.ARENA_PAD < 100 ? Math.max(8, half - 100) : C.ARENA_PAD;
  state.arenaRadius = half - pad;

  if (state.phase === 'title') {
    state.player.x = state.cx;
    state.player.y = state.cy;
  } else {
    const dx = state.player.x - state.cx;
    const dy = state.player.y - state.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limit = state.arenaRadius - C.PLAYER_RADIUS;
    if (dist > limit) {
      const angle = Math.atan2(dy, dx);
      state.player.x = state.cx + Math.cos(angle) * limit;
      state.player.y = state.cy + Math.sin(angle) * limit;
    }

    if (state.player.dashing) {
      const ct = clampToArena(state.player.tx, state.player.ty);
      state.player.tx = ct.x;
      state.player.ty = ct.y;
    }
  }
}

function clampToArena(x, y) {
  const dx = x - state.cx;
  const dy = y - state.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const limit = state.arenaRadius - C.PLAYER_RADIUS;
  if (dist > limit) {
    const angle = Math.atan2(dy, dx);
    return {
      x: state.cx + Math.cos(angle) * limit,
      y: state.cy + Math.sin(angle) * limit,
    };
  }
  return { x, y };
}

function screenToWorld(sx, sy) {
  return {
    x: state.cx + (sx - state.cx) / state.zoom,
    y: state.cy + (sy - state.cy) / state.zoom,
  };
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    const life = 300 + Math.random() * 200;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color,
      radius: 1.5 + Math.random() * 1.5,
    });
  }
}

function triggerDash(rawX, rawY) {
  if (state.phase !== 'playing' || state.player.cooldown > 0) return;
  Sound.dash();
  const clamped = clampToArena(rawX, rawY);
  state.trails.push({
    x1: state.player.x,
    y1: state.player.y,
    x2: clamped.x,
    y2: clamped.y,
    born: elapsed,
    progress: 0,
  });
  // Double power-up: add a backward trail of the same length
  if (state.activePower && state.activePower.type === 'double') {
    const dx = state.player.x - clamped.x;
    const dy = state.player.y - clamped.y;
    const backTarget = clampToArena(state.player.x + dx, state.player.y + dy);
    state.trails.push({
      x1: state.player.x,
      y1: state.player.y,
      x2: backTarget.x,
      y2: backTarget.y,
      born: elapsed,
      progress: 1,
    });
  }
  state.player.tx = clamped.x;
  state.player.ty = clamped.y;
  state.player.dashing = true;
}

function resetGame() {
  const fresh = initState();
  for (const key of Object.keys(fresh)) {
    state[key] = fresh[key];
  }
  resize();
}

function update(dt) {
  elapsed += dt;

  // Smooth zoom interpolation (all phases)
  state.zoom += (state.zoomTarget - state.zoom) * 0.02;

  // Update particles (all phases so death particles finish animating)
  const dtSec = dt / 1000;
  for (const p of state.particles) {
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  // Decay screen shake
  if (state.shake > 0) {
    state.shake *= 0.9;
    if (state.shake < 0.5) state.shake = 0;
  }

  // Decay multi-kill flash timer
  if (state.multiKill.timer > 0) {
    state.multiKill.timer = Math.max(0, state.multiKill.timer - dt);
  }

  const trailLife = effectiveTrailLife();
  state.trails = state.trails.filter((t) => elapsed - t.born < trailLife);

  // Wave-break countdown → transition to wave-preview
  if (state.phase === 'wave-break') {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.phase = 'wave-preview';
      state.previewDrones = planWave(state.wave + 1);
      state.waveTimer = C.WAVE_PREVIEW;
    }
    return;
  }

  // Wave-preview countdown → start wave with pre-planned positions
  if (state.phase === 'wave-preview') {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.phase = 'playing';
      startWave(state.wave + 1);
    }
    return;
  }

  if (state.phase !== 'playing') return;

  if (state.activePower !== null && elapsed >= state.activePower.until) {
    state.activePower = null;
  }

  const collectDist = C.PLAYER_RADIUS + C.POWERUP_RADIUS;
  state.powerups = state.powerups.filter((p) => {
    if (elapsed - p.born > C.POWERUP_LIFETIME) return false;
    if (Math.hypot(state.player.x - p.x, state.player.y - p.y) <= collectDist) {
      state.activePower = {
        type: p.type,
        until: elapsed + C.POWERUP_DURATION[p.type],
      };
      Sound.powerUp();
      return false;
    }
    return true;
  });

  // Decrement cooldown
  if (state.player.cooldown > 0) {
    state.player.cooldown = Math.max(0, state.player.cooldown - dt);
  }

  if (state.player.dashing) {
    const dx = state.player.tx - state.player.x;
    const dy = state.player.ty - state.player.y;
    const dist = Math.hypot(dx, dy);
    const move = (C.DASH_SPEED * dt) / 1000;

    if (dist < 2 || move >= dist) {
      state.player.x = state.player.tx;
      state.player.y = state.player.ty;
      state.player.dashing = false;
      state.player.cooldown = C.DASH_COOLDOWN;
      if (state.trails.length > 0) {
        state.trails[state.trails.length - 1].progress = 1;
      }
    } else {
      state.player.x += (dx / dist) * move;
      state.player.y += (dy / dist) * move;

      const trail = state.trails[state.trails.length - 1];
      if (trail) {
        const totalLen = Math.hypot(trail.x2 - trail.x1, trail.y2 - trail.y1);
        if (totalLen > 0) {
          const traveled = Math.hypot(
            state.player.x - trail.x1,
            state.player.y - trail.y1,
          );
          trail.progress = Math.min(1, traveled / totalLen);
        } else {
          trail.progress = 1;
        }
      }
    }
  }

  // Process spawn queue
  const pending = [];
  for (const entry of state.spawnQueue) {
    if (elapsed >= entry.time) {
      spawnDrone(entry.type, entry.x, entry.y);
    } else {
      pending.push(entry);
    }
  }
  state.spawnQueue = pending;

  const killsByTrail = new Map();
  const newMinis = [];
  const trailW = effectiveTrailWidth();
  for (const drone of state.drones) {
    if (!drone.alive) continue;
    const trailHitDist = droneRadius(drone.type) + trailW;
    for (let ti = 0; ti < state.trails.length; ti++) {
      const trail = state.trails[ti];
      if (
        distToSegment(
          drone.x,
          drone.y,
          trail.x1,
          trail.y1,
          trail.x2,
          trail.y2,
        ) <= trailHitDist
      ) {
        drone.hp -= 1;
        if (drone.hp > 0) {
          // Shielded drone survives — flash with fewer particles
          spawnParticles(drone.x, drone.y, C.COLORS.droneShielded, 4);
          state.shake = 4;
        } else {
          drone.alive = false;
          Sound.hit();
          spawnParticles(drone.x, drone.y, droneColor(drone.type), 8);
          state.combo += 1;
          state.score += 1 + state.combo;
          if (state.combo >= C.COMBO_SHIELD && !state.hasShield) {
            state.hasShield = true;
            Sound.shieldGain();
            state.combo = 0;
          }
          killsByTrail.set(ti, (killsByTrail.get(ti) || 0) + 1);

          // Splitter: spawn 2 mini-drones perpendicular to the trail
          if (drone.type === 'splitter') {
            const trailAngle = Math.atan2(
              trail.y2 - trail.y1,
              trail.x2 - trail.x1,
            );
            const miniSpeed =
              (C.DRONE_BASE_SPEED + state.wave * C.DRONE_SPEED_STEP) * 1.5;
            for (const offset of [Math.PI / 2, -Math.PI / 2]) {
              const heading = trailAngle + offset;
              newMinis.push({
                x: drone.x,
                y: drone.y,
                speed: miniSpeed,
                heading,
                alive: true,
                type: 'mini',
                hp: 1,
              });
            }
          }

          // Power-up drop chance
          if (Math.random() < C.POWERUP_DROP_CHANCE) {
            const pType =
              POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
            state.powerups.push({
              x: drone.x,
              y: drone.y,
              type: pType,
              born: elapsed,
            });
          }
        }
        break;
      }
    }
  }
  // Add any mini-drones spawned by splitters
  for (const mini of newMinis) {
    state.drones.push(mini);
  }

  // Multi-kill bonus: award extra points when a single trail kills 2+ drones
  for (const [, count] of killsByTrail) {
    if (count >= 2) {
      state.score += count * 3;
      state.multiKill.text = `MULTI x${count}`;
      state.multiKill.timer = 800;
      Sound.multiKill();
    }
  }

  state.drones = state.drones.filter((d) => d.alive);

  for (const drone of state.drones) {
    if (drone.type === 'wanderer') {
      drone.heading += (Math.random() - 0.5) * C.WANDERER_DRIFT * (dt / 1000);
    }

    // Calculate desired angle toward player
    const dx = state.player.x - drone.x;
    const dy = state.player.y - drone.y;
    const desired = Math.atan2(dy, dx);

    // Calculate shortest angular difference, normalized to [-PI, PI]
    let angleDiff = desired - drone.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Rotate heading toward desired by at most turnRate * dt/1000
    const maxTurn = (C.DRONE_TURN_RATE * dt) / 1000;
    if (Math.abs(angleDiff) <= maxTurn) {
      drone.heading = desired;
    } else {
      drone.heading += Math.sign(angleDiff) * maxTurn;
    }

    // Move in heading direction
    const effectiveSpeed =
      state.activePower && state.activePower.type === 'slow'
        ? drone.speed * 0.5
        : drone.speed;
    const move = (effectiveSpeed * dt) / 1000;
    drone.x += Math.cos(drone.heading) * move;
    drone.y += Math.sin(drone.heading) * move;
  }

  for (const drone of state.drones) {
    const collisionDist = C.PLAYER_RADIUS + droneRadius(drone.type);
    if (
      Math.hypot(state.player.x - drone.x, state.player.y - drone.y) <=
      collisionDist
    ) {
      drone.alive = false;
      if (state.hasShield) {
        state.hasShield = false;
        Sound.shieldBreak();
        spawnParticles(state.player.x, state.player.y, C.COLORS.shield, 12);
        state.shake = 8;
        state.combo = 0;
      } else {
        state.phase = 'game-over';
        Sound.gameOver();
        state.shake = 15;
        state.gameOverAt = elapsed;
      }
    }
  }

  state.drones = state.drones.filter((d) => d.alive);

  if (
    state.spawnQueue.length === 0 &&
    state.drones.length === 0 &&
    state.wave > 0
  ) {
    state.score += state.wave * 10;
    state.phase = 'wave-break';
    state.waveTimer = C.WAVE_BREAK;
  }
}

function draw() {
  ctx.fillStyle = C.COLORS.bg;
  ctx.fillRect(0, 0, state.width, state.height);

  // Screen shake offset
  ctx.save();
  if (state.shake > 0) {
    const sx = (Math.random() - 0.5) * state.shake * 2;
    const sy = (Math.random() - 0.5) * state.shake * 2;
    ctx.translate(sx, sy);
  }

  // Zoom transform (wraps gameplay elements only)
  ctx.save();
  ctx.translate(state.cx, state.cy);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-state.cx, -state.cy);

  // Arena fill + border
  ctx.beginPath();
  ctx.arc(state.cx, state.cy, state.arenaRadius, 0, Math.PI * 2);
  ctx.fillStyle = C.COLORS.arena;
  ctx.fill();
  ctx.strokeStyle = C.COLORS.arenaBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Dash trails
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = C.COLORS.trail;
  const drawTrailLife = effectiveTrailLife();
  const drawTrailW = effectiveTrailWidth();
  for (const trail of state.trails) {
    const age = (elapsed - trail.born) / drawTrailLife;
    const alpha = 1 - age;
    const progress = trail.progress ?? 1;

    if (progress < 1) {
      // Draw-in effect: bright traveled portion + dim projected portion
      const mx = trail.x1 + (trail.x2 - trail.x1) * progress;
      const my = trail.y1 + (trail.y2 - trail.y1) * progress;

      // Traveled portion — brighter and thicker
      ctx.lineWidth = drawTrailW * 2.5;
      ctx.shadowBlur = C.TRAIL_GLOW * (1 - age) * 1.8;
      ctx.strokeStyle = C.COLORS.trailWithAlpha(Math.min(1, alpha + 0.2));
      ctx.beginPath();
      ctx.moveTo(trail.x1, trail.y1);
      ctx.lineTo(mx, my);
      ctx.stroke();

      // Untraveled/projected portion — dim
      ctx.lineWidth = drawTrailW;
      ctx.shadowBlur = C.TRAIL_GLOW * (1 - age);
      ctx.strokeStyle = C.COLORS.trailWithAlpha(alpha * 0.3);
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(trail.x2, trail.y2);
      ctx.stroke();
    } else {
      // Completed trail — render as before
      ctx.lineWidth = drawTrailW;
      ctx.strokeStyle = C.COLORS.trailWithAlpha(alpha);
      ctx.shadowBlur = C.TRAIL_GLOW * (1 - age);
      ctx.beginPath();
      ctx.moveTo(trail.x1, trail.y1);
      ctx.lineTo(trail.x2, trail.y2);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.shadowBlur = 6;
  for (const drone of state.drones) {
    if (!drone.alive) continue;
    const r = droneRadius(drone.type);
    const color = droneColor(drone.type);
    const glow = drone.type === 'basic' ? C.COLORS.droneGlow : color;

    ctx.shadowColor = glow;
    ctx.fillStyle = color;

    if (drone.type === 'wanderer') {
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(drone.x, drone.y);
      ctx.rotate(drone.heading);
      drawDiamond(r);
      ctx.fill();
      ctx.restore();
    }

    if (drone.type === 'shielded' && drone.hp === 2) {
      ctx.save();
      ctx.strokeStyle = C.COLORS.droneShielded;
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(elapsed * 0.005);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
  ctx.restore();

  if (state.phase === 'wave-preview' && state.previewDrones.length > 0) {
    const pulseAlpha = 0.15 + 0.15 * Math.sin(elapsed * 0.008);
    ctx.save();
    ctx.lineWidth = 1.5;
    for (const pd of state.previewDrones) {
      const r = droneRadius(pd.type);
      ctx.strokeStyle = droneColor(pd.type);
      ctx.globalAlpha = pulseAlpha;

      if (pd.type === 'wanderer') {
        ctx.beginPath();
        ctx.arc(pd.x, pd.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.save();
        ctx.translate(pd.x, pd.y);
        drawDiamond(r);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Particles
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Player glow + dot
  const pulseBase = 12;
  const pulseAmp = 4;
  const pulse = pulseBase + Math.sin(elapsed * 0.003) * pulseAmp;
  const onCooldown = state.player.cooldown > 0;
  const glowBlur = onCooldown ? pulse * 0.3 : pulse;

  ctx.save();
  ctx.shadowColor = C.COLORS.playerGlow;
  ctx.shadowBlur = glowBlur;
  ctx.fillStyle = C.COLORS.player;

  if (state.player.dashing) {
    const dx = state.player.tx - state.player.x;
    const dy = state.player.ty - state.player.y;
    const angle = Math.atan2(dy, dx);
    ctx.translate(state.player.x, state.player.y);
    ctx.rotate(angle);
    ctx.scale(1.3, 0.7);
    ctx.beginPath();
    ctx.arc(0, 0, C.PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, C.PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Shield ring
  if (state.hasShield) {
    const shieldAlpha = 0.75 + 0.25 * Math.sin(elapsed * 0.005);
    ctx.save();
    ctx.strokeStyle = C.COLORS.shield;
    ctx.globalAlpha = shieldAlpha;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      state.player.x,
      state.player.y,
      C.PLAYER_RADIUS + 4,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }

  // Power-ups (world space, inside zoom)
  for (const pu of state.powerups) {
    const puAge = (elapsed - pu.born) / C.POWERUP_LIFETIME;
    const puAlpha = puAge > 0.75 ? 0.7 * (1 - (puAge - 0.75) / 0.25) : 0.7;
    const pulseScale = 1 + 0.2 * Math.sin(elapsed * 0.004);
    const rotation = elapsed * 0.002;
    const color = POWERUP_COLORS[pu.type];
    const r = C.POWERUP_RADIUS * pulseScale;

    ctx.save();
    ctx.translate(pu.x, pu.y);
    ctx.rotate(rotation);
    ctx.globalAlpha = puAlpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.6, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Restore zoom transform — HUD and overlays render in screen space
  ctx.restore();

  // HUD
  if (
    state.phase === 'playing' ||
    state.phase === 'wave-break' ||
    state.phase === 'wave-preview' ||
    state.phase === 'game-over'
  ) {
    const hudPad = 20;

    ctx.save();
    ctx.fillStyle = C.COLORS.hud;

    // Wave label — top-left
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `bold 11px ${C.FONT}`;
    ctx.fillText('WAVE', hudPad, hudPad);
    ctx.font = `bold 28px ${C.FONT}`;
    ctx.fillText(String(state.wave), hudPad, hudPad + 14);

    // Score — top-right
    ctx.textAlign = 'right';
    ctx.font = `bold 28px ${C.FONT}`;
    ctx.fillText(String(state.score), state.width - hudPad, hudPad);

    // Combo indicator
    if (state.combo > 0) {
      ctx.fillStyle = C.COLORS.combo;
      ctx.font = `bold 18px ${C.FONT}`;
      ctx.fillText(`x${state.combo}`, state.width - hudPad, hudPad + 32);
    }

    // Multi-kill flash
    if (state.multiKill.timer > 0) {
      const mkAlpha = state.multiKill.timer / 800;
      ctx.save();
      ctx.globalAlpha = mkAlpha;
      ctx.fillStyle = C.COLORS.combo;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 24px ${C.FONT}`;
      ctx.fillText(state.multiKill.text, state.cx, state.cy + 60);
      ctx.restore();
    }

    // Active power-up indicator bar (bottom-center)
    if (state.activePower !== null) {
      const barW = 80;
      const barH = 6;
      const barX = state.cx - barW / 2;
      const barY = state.height - hudPad - barH;
      const duration = C.POWERUP_DURATION[state.activePower.type];
      const remaining = Math.max(0, state.activePower.until - elapsed);
      const frac = remaining / duration;
      const barColor = POWERUP_COLORS[state.activePower.type];

      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(barX, barY, barW * frac, barH);
      ctx.restore();
    }

    ctx.restore();
  }

  // Wave announcement (visible during both wave-break and wave-preview)
  if (state.phase === 'wave-break' || state.phase === 'wave-preview') {
    const totalDuration =
      state.phase === 'wave-break' ? C.WAVE_BREAK : C.WAVE_PREVIEW;
    const alpha = Math.max(0, state.waveTimer / totalDuration);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 40px ${C.FONT}`;
    ctx.fillStyle = C.COLORS.player;
    ctx.shadowColor = C.COLORS.playerGlow;
    ctx.shadowBlur = 20;
    ctx.fillText(`WAVE ${state.wave + 1}`, state.cx, state.cy);
    ctx.restore();
  }

  // Game over screen
  if (state.phase === 'game-over') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "GAME OVER"
    ctx.font = `bold 48px ${C.FONT}`;
    ctx.fillStyle = C.COLORS.player;
    ctx.shadowColor = C.COLORS.playerGlow;
    ctx.shadowBlur = 24;
    ctx.fillText('GAME OVER', state.cx, state.cy - 50);

    // Score + wave info
    ctx.shadowBlur = 0;
    ctx.font = `bold 24px ${C.FONT}`;
    ctx.fillStyle = C.COLORS.hud;
    ctx.fillText(`Score: ${state.score}`, state.cx, state.cy + 10);
    ctx.font = `20px ${C.FONT}`;
    ctx.fillText(`Wave ${state.wave}`, state.cx, state.cy + 44);

    // Retry prompt
    ctx.font = `18px ${C.FONT}`;
    ctx.fillStyle = C.COLORS.hud;
    ctx.fillText('Click to retry', state.cx, state.cy + 90);

    ctx.restore();
  }

  // Title screen
  if (state.phase === 'title') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold 48px ${C.FONT}`;
    ctx.fillStyle = C.COLORS.player;
    ctx.shadowColor = C.COLORS.playerGlow;
    ctx.shadowBlur = 20;
    ctx.fillText('LOOP LANCER', state.cx, state.cy - 60);

    ctx.shadowBlur = 0;
    ctx.font = `18px ${C.FONT}`;
    ctx.fillStyle = C.COLORS.hud;
    ctx.fillText('Click to start', state.cx, state.cy + 10);
    ctx.restore();
  }

  // Restore screen shake offset
  ctx.restore();
}

function tick(now) {
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(tick);
}

function pickDroneType(wave) {
  const r = Math.random();
  if (wave >= 10) {
    if (r < 0.4) return 'basic';
    if (r < 0.6) return 'wanderer';
    if (r < 0.8) return 'shielded';
    return 'splitter';
  }
  if (wave >= 7) {
    if (r < 0.5) return 'basic';
    if (r < 0.75) return 'wanderer';
    return 'shielded';
  }
  if (wave >= 4) {
    if (r < 0.7) return 'basic';
    return 'wanderer';
  }
  return 'basic';
}

function pickSpawnPosition() {
  let angle = Math.random() * Math.PI * 2;
  let sx = state.cx + Math.cos(angle) * state.arenaRadius;
  let sy = state.cy + Math.sin(angle) * state.arenaRadius;

  // Avoid spawning too close to the player
  const dx = sx - state.player.x;
  const dy = sy - state.player.y;
  if (Math.sqrt(dx * dx + dy * dy) < 60) {
    angle += Math.PI / 2;
    sx = state.cx + Math.cos(angle) * state.arenaRadius;
    sy = state.cy + Math.sin(angle) * state.arenaRadius;
  }

  return { x: sx, y: sy };
}

function planWave(n) {
  const count = Math.floor(C.BASE_DRONES + n * C.DRONES_PER_WAVE);
  const planned = [];
  for (let i = 0; i < count; i++) {
    const type = pickDroneType(n);
    const pos = pickSpawnPosition();
    planned.push({ x: pos.x, y: pos.y, type });
  }
  return planned;
}

function startWave(n) {
  Sound.waveStart();
  state.wave = n;
  state.zoomTarget = Math.max(C.ZOOM_MIN, C.ZOOM_BASE - n * C.ZOOM_WAVE_STEP);
  const now = elapsed;
  state.spawnQueue = [];

  if (state.previewDrones.length > 0) {
    // Use pre-planned positions/types from the wave preview
    for (let i = 0; i < state.previewDrones.length; i++) {
      const pd = state.previewDrones[i];
      state.spawnQueue.push({
        time: now + i * C.SPAWN_STAGGER,
        type: pd.type,
        x: pd.x,
        y: pd.y,
      });
    }
    state.previewDrones = [];
  } else {
    // Fallback: generate fresh (shouldn't happen in normal flow)
    const count = Math.floor(C.BASE_DRONES + n * C.DRONES_PER_WAVE);
    for (let i = 0; i < count; i++) {
      state.spawnQueue.push({
        time: now + i * C.SPAWN_STAGGER,
        type: pickDroneType(n),
      });
    }
  }
}

function spawnDrone(type = 'basic', preX, preY) {
  let speed = C.DRONE_BASE_SPEED + state.wave * C.DRONE_SPEED_STEP;
  let sx;
  let sy;

  if (preX !== undefined && preY !== undefined) {
    sx = preX;
    sy = preY;
  } else {
    const pos = pickSpawnPosition();
    sx = pos.x;
    sy = pos.y;
  }

  if (type === 'mini') {
    speed *= 1.5;
  }

  const heading = Math.atan2(state.player.y - sy, state.player.x - sx);
  const hp = type === 'shielded' ? 2 : 1;
  state.drones.push({ x: sx, y: sy, speed, heading, alive: true, type, hp });
}

function startGame() {
  if (state.phase !== 'title') return;
  state.phase = 'wave-preview';
  state.player.x = state.cx;
  state.player.y = state.cy;
  state.previewDrones = planWave(1);
  state.waveTimer = C.WAVE_PREVIEW;
}

function handleInput(x, y) {
  if (state.phase === 'title') {
    startGame();
  } else if (state.phase === 'playing') {
    const world = screenToWorld(x, y);
    triggerDash(world.x, world.y);
  } else if (state.phase === 'game-over') {
    if (elapsed - state.gameOverAt < 500) return;
    resetGame();
    startGame();
  }
}

canvas.addEventListener('mousemove', (e) => {
  cursorX = e.clientX;
  cursorY = e.clientY;
});

canvas.addEventListener('click', (e) => {
  handleInput(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  cursorX = touch.clientX;
  cursorY = touch.clientY;
  handleInput(touch.clientX, touch.clientY);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleInput(cursorX, cursorY);
  }
});

window.addEventListener('resize', resize);
resize();
lastTime = performance.now();
requestAnimationFrame(tick);
