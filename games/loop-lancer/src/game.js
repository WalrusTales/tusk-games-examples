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
  COMBO_SHIELD: 5,
  BASE_DRONES: 3,
  DRONES_PER_WAVE: 1.4,
  SPAWN_STAGGER: 400,
  TRAIL_GLOW: 12,
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
    shield: '#4ade80',
    hud: 'rgba(226, 232, 240, 0.7)',
    combo: '#facc15',
  },
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
    wave: 0,
    waveTimer: 0,
    spawnQueue: [],
    shake: 0,
    gameOverAt: 0,
    arenaRadius: 0,
    cx: 0,
    cy: 0,
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
    shield: 'color(display-p3 0.15 0.92 0.45)',
    combo: 'color(display-p3 1.0 0.84 0.05)',
  });
}

const ctx = canvas.getContext(
  '2d',
  useP3 ? { colorSpace: 'display-p3' } : undefined,
);

const state = initState();
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
  const clamped = clampToArena(rawX, rawY);
  state.trails.push({
    x1: state.player.x,
    y1: state.player.y,
    x2: clamped.x,
    y2: clamped.y,
    born: elapsed,
  });
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

  // Remove expired trails
  state.trails = state.trails.filter(
    (t) => elapsed - t.born < C.TRAIL_DURATION,
  );

  // Wave-break countdown
  if (state.phase === 'wave-break') {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.phase = 'playing';
      startWave(state.wave + 1);
    }
    return;
  }

  if (state.phase !== 'playing') return;

  // Decrement cooldown
  if (state.player.cooldown > 0) {
    state.player.cooldown = Math.max(0, state.player.cooldown - dt);
  }

  // Dash movement
  if (state.player.dashing) {
    const dx = state.player.tx - state.player.x;
    const dy = state.player.ty - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      state.player.x = state.player.tx;
      state.player.y = state.player.ty;
      state.player.dashing = false;
      state.player.cooldown = C.DASH_COOLDOWN;
    } else {
      const move = (C.DASH_SPEED * dt) / 1000;
      if (move >= dist) {
        state.player.x = state.player.tx;
        state.player.y = state.player.ty;
        state.player.dashing = false;
        state.player.cooldown = C.DASH_COOLDOWN;
      } else {
        state.player.x += (dx / dist) * move;
        state.player.y += (dy / dist) * move;
      }
    }
  }

  // Process spawn queue
  const pending = [];
  for (const t of state.spawnQueue) {
    if (elapsed >= t) {
      spawnDrone();
    } else {
      pending.push(t);
    }
  }
  state.spawnQueue = pending;

  // Trail-drone collision
  const trailHitDist = C.DRONE_RADIUS + C.TRAIL_WIDTH;
  for (const drone of state.drones) {
    if (!drone.alive) continue;
    for (const trail of state.trails) {
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
        drone.alive = false;
        spawnParticles(drone.x, drone.y, C.COLORS.drone, 8);
        state.combo += 1;
        state.score += 1 + state.combo;
        if (state.combo >= C.COMBO_SHIELD && !state.hasShield) {
          state.hasShield = true;
          state.combo = 0;
        }
        break;
      }
    }
  }

  // Move drones toward player (heading-based steering)
  for (const drone of state.drones) {
    if (!drone.alive) continue;

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
    const move = (drone.speed * dt) / 1000;
    drone.x += Math.cos(drone.heading) * move;
    drone.y += Math.sin(drone.heading) * move;
  }

  // Drone-player collision
  const collisionDist = C.PLAYER_RADIUS + C.DRONE_RADIUS;
  for (const drone of state.drones) {
    if (!drone.alive) continue;
    const dx = state.player.x - drone.x;
    const dy = state.player.y - drone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= collisionDist) {
      drone.alive = false;
      if (state.hasShield) {
        state.hasShield = false;
        spawnParticles(state.player.x, state.player.y, C.COLORS.shield, 12);
        state.shake = 8;
        state.combo = 0;
      } else {
        state.phase = 'game-over';
        state.shake = 15;
        state.gameOverAt = elapsed;
      }
    }
  }

  // Wave completion check
  if (
    state.spawnQueue.length === 0 &&
    state.drones.length > 0 &&
    state.drones.every((d) => !d.alive)
  ) {
    state.drones = [];
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
  ctx.lineWidth = C.TRAIL_WIDTH;
  ctx.shadowColor = C.COLORS.trail;
  for (const trail of state.trails) {
    const age = (elapsed - trail.born) / C.TRAIL_DURATION;
    const alpha = 1 - age;
    ctx.strokeStyle = C.COLORS.trailWithAlpha(alpha);
    ctx.shadowBlur = C.TRAIL_GLOW * (1 - age);
    ctx.beginPath();
    ctx.moveTo(trail.x1, trail.y1);
    ctx.lineTo(trail.x2, trail.y2);
    ctx.stroke();
  }
  ctx.restore();

  // Drones
  ctx.save();
  ctx.shadowColor = C.COLORS.droneGlow;
  ctx.shadowBlur = 6;
  ctx.fillStyle = C.COLORS.drone;
  for (const drone of state.drones) {
    if (!drone.alive) continue;
    const angle = drone.heading;
    const r = C.DRONE_RADIUS;
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(0, r * 0.6);
    ctx.lineTo(-r, 0);
    ctx.lineTo(0, -r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

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

  // HUD
  if (
    state.phase === 'playing' ||
    state.phase === 'wave-break' ||
    state.phase === 'game-over'
  ) {
    const hudPad = 20;
    const hudFont = '"Avenir Next", "Segoe UI", sans-serif';

    ctx.save();
    ctx.fillStyle = C.COLORS.hud;

    // Wave label — top-left
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `bold 11px ${hudFont}`;
    ctx.fillText('WAVE', hudPad, hudPad);
    ctx.font = `bold 28px ${hudFont}`;
    ctx.fillText(String(state.wave), hudPad, hudPad + 14);

    // Score — top-right
    ctx.textAlign = 'right';
    ctx.font = `bold 28px ${hudFont}`;
    ctx.fillText(String(state.score), state.width - hudPad, hudPad);

    // Combo indicator
    if (state.combo > 0) {
      ctx.fillStyle = C.COLORS.combo;
      ctx.font = `bold 18px ${hudFont}`;
      ctx.fillText(`x${state.combo}`, state.width - hudPad, hudPad + 32);
    }

    ctx.restore();
  }

  // Wave announcement
  if (state.phase === 'wave-break') {
    const alpha = Math.max(0, state.waveTimer / C.WAVE_BREAK);
    const waveFont = '"Avenir Next", "Segoe UI", sans-serif';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 40px ${waveFont}`;
    ctx.fillStyle = C.COLORS.player;
    ctx.shadowColor = C.COLORS.playerGlow;
    ctx.shadowBlur = 20;
    ctx.fillText(`WAVE ${state.wave + 1}`, state.cx, state.cy);
    ctx.restore();
  }

  // Game over screen
  if (state.phase === 'game-over') {
    const goFont = '"Avenir Next", "Segoe UI", sans-serif';

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "GAME OVER"
    ctx.font = `bold 48px ${goFont}`;
    ctx.fillStyle = C.COLORS.player;
    ctx.shadowColor = C.COLORS.playerGlow;
    ctx.shadowBlur = 24;
    ctx.fillText('GAME OVER', state.cx, state.cy - 50);

    // Score + wave info
    ctx.shadowBlur = 0;
    ctx.font = `bold 24px ${goFont}`;
    ctx.fillStyle = C.COLORS.hud;
    ctx.fillText(`Score: ${state.score}`, state.cx, state.cy + 10);
    ctx.font = `20px ${goFont}`;
    ctx.fillText(`Wave ${state.wave}`, state.cx, state.cy + 44);

    // Retry prompt
    ctx.font = `18px ${goFont}`;
    ctx.fillStyle = C.COLORS.hud;
    ctx.fillText('Click to retry', state.cx, state.cy + 90);

    ctx.restore();
  }

  // Title screen
  if (state.phase === 'title') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 48px "Avenir Next", "Segoe UI", sans-serif';
    ctx.fillStyle = C.COLORS.player;
    ctx.shadowColor = C.COLORS.playerGlow;
    ctx.shadowBlur = 20;
    ctx.fillText('LOOP LANCER', state.cx, state.cy - 60);

    ctx.shadowBlur = 0;
    ctx.font = '18px "Avenir Next", "Segoe UI", sans-serif';
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

function startWave(n) {
  state.wave = n;
  const count = Math.floor(C.BASE_DRONES + n * C.DRONES_PER_WAVE);
  const now = elapsed;
  state.spawnQueue = [];
  for (let i = 0; i < count; i++) {
    state.spawnQueue.push(now + i * C.SPAWN_STAGGER);
  }
}

function spawnDrone() {
  const speed = C.DRONE_BASE_SPEED + state.wave * C.DRONE_SPEED_STEP;
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

  const heading = Math.atan2(state.player.y - sy, state.player.x - sx);
  state.drones.push({ x: sx, y: sy, speed, heading, alive: true });
}

function startGame() {
  if (state.phase !== 'title') return;
  state.phase = 'playing';
  state.player.x = state.cx;
  state.player.y = state.cy;
  startWave(1);
}

function handleInput(x, y) {
  if (state.phase === 'title') {
    startGame();
  } else if (state.phase === 'playing') {
    triggerDash(x, y);
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
