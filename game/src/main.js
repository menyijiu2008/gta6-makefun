// Sunport Chase — boot and the one game loop.
// Owns the living state (player, wanted level, cash, camera), the fixed-step update:
// walking, driving physics, stealing cars, collisions, crimes and the wanted system,
// police pressure, mission hooks, saving, and the screen flow (title → play → pause /
// busted / wasted / complete).
//
// ?seed=N fixes the city layout. ?shot=<name>&seed=1 stages a frozen scene instead of
// running the loop, paints it twice and sets window.__shotReady (see shots.js).

import {
  BUST_PIN_TIME, CAR_ACCEL, CAR_MAX_REVERSE, CAR_MAX_SPEED, CAR_TURN, HEAT_DECAY,
  HEAT_HIT_CAR, HEAT_HIT_PED, HEAT_STEAL, HEAT_THRESHOLDS, PLAYER_RADIUS, SAVE_KEY,
  SPRINT_SPEED, STEP, WALK_SPEED, WORLD_H, WORLD_W,
} from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { buildingAt, clampToWorld, createCity, pushOutOfBuilding } from './world.js';
import { knockDownPed, spawnPedestrians, spawnTraffic, updatePedestrians, updateTraffic } from './traffic.js';
import { policePinning, policeSeesPlayer, updatePolice, updatePoliceSpawning } from './police.js';
import { startMission, updateMissions } from './missions.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const SPAWN = { x: 316, y: 1180 };

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const input = createInput(window);
const renderer = createRenderer(canvas);

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.missionIndex !== 'number' || typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      missionIndex: game.missionIndex, cash: game.cash, score: game.score,
    }));
  } catch {
    // Storage off (private window): progress lasts this visit only.
  }
}

function starsForHeat(heat) {
  let stars = 0;
  for (const t of HEAT_THRESHOLDS) if (heat >= t) stars += 1;
  return stars;
}

const game = {
  mode: 'title',
  time: 0,
  rng: createRandom(seed),
  world: null,
  player: { x: SPAWN.x, y: SPAWN.y, angle: -Math.PI / 2, car: null },
  trafficCars: [],
  peds: [],
  policeCars: [],
  wanted: { heat: 0, stars: 0, seenTimer: 0, pinTimer: 0 },
  policeSpawnTimer: 0,
  roadblock: null,
  roadblockCooldown: 0,
  mission: null,
  missionIndex: 0,
  storyDone: false,
  cash: 0,
  score: 0,
  camera: { x: 0, y: 0 },
  message: '',
  messageTimer: 0,
  prompt: '',
  audio,
  hasSave: false,
  saveData: null,

  playerPos() { return this.player.car ? this.player.car : this.player; },
  showMessage(text, seconds = 3) { this.message = text; this.messageTimer = seconds; },
  addHeat(amount) {
    this.wanted.heat += amount;
    this.wanted.stars = starsForHeat(this.wanted.heat);
  },
  completeMission(index, bonus) {
    this.cash += bonus;
    this.score += bonus;
    this.missionIndex = index + 1;
    this.showMessage(`Mission complete! +$${bonus}`, 4);
    this.audio.success();
    if (index >= 2) {
      this.storyDone = true;
      this.mission = null;
      this.mode = 'complete';
      writeSave();
    } else {
      writeSave();
      startMission(this, this.missionIndex);
    }
    announce(`Mission ${index + 1} complete. Bonus $${bonus}.`);
  },
};

// A handle for automated play-tests: the driver script reads state, never writes rules.
window.__sunportGame = game;

function announce(text) { if (status) status.textContent = text; }

function resetWorld(checkpoint) {
  game.rng = createRandom(seed);
  game.world = createCity(game.rng);
  game.trafficCars = spawnTraffic(game.rng);
  game.peds = spawnPedestrians(game.rng);
  game.policeCars = [];
  game.player = { x: SPAWN.x, y: SPAWN.y, angle: -Math.PI / 2, car: null };
  game.wanted = { heat: 0, stars: 0, seenTimer: 0, pinTimer: 0 };
  game.policeSpawnTimer = 0;
  game.roadblock = null;
  game.roadblockCooldown = 0;
  game.missionIndex = checkpoint ? checkpoint.missionIndex : 0;
  game.cash = checkpoint ? checkpoint.cash : 0;
  game.score = checkpoint ? checkpoint.score || 0 : 0;
  game.storyDone = game.missionIndex >= 3;
  game.mission = null;
  if (!game.storyDone) startMission(game, game.missionIndex);
  game.mode = 'play';
  updateCamera(1);
}

function nearestEnterableCar() {
  let best = null;
  let bestD = 48 * 48;
  for (const car of game.world.parkedCars) {
    const d = (car.x - game.player.x) ** 2 + (car.y - game.player.y) ** 2;
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(car) {
  game.world.parkedCars = game.world.parkedCars.filter((c) => c !== car);
  car.kind = 'player';
  car.speed = 0;
  game.player.car = car;
  if (!car.wasPlayer) {
    car.wasPlayer = true;
    game.addHeat(HEAT_STEAL);
    audio.crime();
    game.showMessage(car.marked ? 'Car stolen — the marked one!' : 'Car stolen!', 2.2);
  }
}

function exitCar() {
  const car = game.player.car;
  if (!car) return;
  car.kind = 'parked';
  car.speed = 0;
  game.world.parkedCars.push(car);
  game.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 26;
  game.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 26;
  pushOutOfBuilding(game.world, game.player, PLAYER_RADIUS);
  game.player.car = null;
}

function crashIntoBuilding(body, radius) {
  const hit = buildingAt(game.world, body.x, body.y, radius);
  if (!hit) return false;
  pushOutOfBuilding(game.world, body, radius);
  return true;
}

function updatePlayerOnFoot(dt) {
  const p = game.player;
  const ax = input.axisX();
  const ay = input.axisY();
  if (ax !== 0 || ay !== 0) {
    const speed = input.down('sprint') ? SPRINT_SPEED : WALK_SPEED;
    const len = Math.hypot(ax, ay);
    p.x += (ax / len) * speed * dt;
    p.y += (ay / len) * speed * dt;
    p.angle = Math.atan2(ay, ax);
  }
  crashIntoBuilding(p, PLAYER_RADIUS);
  clampToWorld(p, PLAYER_RADIUS);

  // Shove: combat-lite. Knocking someone down is a crime if anyone official is near.
  if (input.wasPressed('shove')) {
    for (const ped of game.peds) {
      if (ped.state !== 'down' && Math.hypot(ped.x - p.x, ped.y - p.y) < 32) {
        knockDownPed(ped);
        game.addHeat(6);
        audio.crash();
        game.showMessage('Shoved a pedestrian!', 1.6);
        break;
      }
    }
  }

  const car = nearestEnterableCar();
  game.prompt = car ? (car.wasPlayer ? 'E — get in your car' : car.marked ? 'E — steal the marked car' : 'E — steal car') : '';
  if (car && input.wasPressed('enter')) enterCar(car);
}

function carCollisions(car, dt) {
  const others = [...game.trafficCars, ...game.policeCars, ...game.world.parkedCars];
  for (const other of others) {
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 44 * 44 || d2 === 0) continue;
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    const overlap = 44 - d;
    other.x += nx * overlap * 0.6;
    other.y += ny * overlap * 0.6;
    car.x -= nx * overlap * 0.4;
    car.y -= ny * overlap * 0.4;
    const impact = Math.abs(car.speed);
    if (impact > 90 && (other.hitCooldown || 0) <= 0) {
      other.hitCooldown = 1.2;
      other.health -= impact * 0.05;
      car.health -= impact * 0.035;
      audio.crash();
      if (other.kind === 'traffic') game.addHeat(HEAT_HIT_CAR);
      else if (other.kind === 'police') game.addHeat(HEAT_HIT_CAR + 4);
      car.speed *= 0.45;
    } else if (impact > 30) {
      car.speed *= 0.8;
    }
  }
  for (const other of others) {
    if ((other.hitCooldown || 0) > 0) other.hitCooldown -= dt;
    if ((other.nearCooldown || 0) > 0) other.nearCooldown -= dt;
  }
}

/** Sweeping past a traffic car closely at speed, without touching it, pays score. */
function checkNearMisses(car) {
  if (Math.abs(car.speed) <= 300) return;
  for (const other of game.trafficCars) {
    if ((other.nearCooldown || 0) > 0) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d >= 46 && d < 66) {
      other.nearCooldown = 3;
      game.score += 15;
      game.showMessage('Near miss +15', 0.9);
    }
  }
}

function updatePlayerDriving(dt) {
  const car = game.player.car;
  game.prompt = 'E — exit car';
  const throttle = (input.down('up') ? 1 : 0) - (input.down('down') ? 1 : 0);
  if (throttle > 0) car.speed += CAR_ACCEL * dt;
  else if (throttle < 0) {
    car.speed -= (car.speed > 10 ? CAR_ACCEL * 1.15 : CAR_ACCEL * 0.55) * dt;
  }
  car.speed -= car.speed * 0.55 * dt; // drag
  if (throttle === 0) car.speed -= car.speed * 1.1 * dt; // engine braking
  car.speed = Math.max(-CAR_MAX_REVERSE, Math.min(CAR_MAX_SPEED, car.speed));
  if (Math.abs(car.speed) < 2 && throttle === 0) car.speed = 0;

  const steer = input.axisX();
  if (steer !== 0 && car.speed !== 0) {
    const grip = Math.max(-1, Math.min(1, car.speed / 150));
    car.angle += steer * CAR_TURN * grip * dt;
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  if (crashIntoBuilding(car, 17)) {
    if (Math.abs(car.speed) > 170) {
      car.health -= (Math.abs(car.speed) - 150) * 0.09;
      audio.crash();
    }
    car.speed *= -0.22;
  }
  clampToWorld(car, 20);
  carCollisions(car, dt);
  checkNearMisses(car);

  // Running someone down: a serious crime, and it slows the car.
  for (const ped of game.peds) {
    if (ped.state === 'down') continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 25 && Math.abs(car.speed) > 40) {
      knockDownPed(ped);
      game.addHeat(HEAT_HIT_PED);
      audio.crash();
      car.speed *= 0.82;
      game.showMessage('Pedestrian hit!', 1.8);
    }
  }

  if (input.wasPressed('enter') && Math.abs(car.speed) < 30) exitCar();
  audio.setEngine(car.speed / CAR_MAX_SPEED, true);
}

function updatePickups() {
  const p = game.playerPos();
  for (const pk of game.world.pickups) {
    if (pk.taken) continue;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 27) {
      pk.taken = true;
      game.cash += 50;
      game.score += 25;
      audio.pickup();
      game.showMessage('+$50 cash pickup', 1.2);
    }
  }
}

function updateWanted(dt) {
  const w = game.wanted;
  w.stars = starsForHeat(w.heat);
  if (w.stars <= 0) { w.pinTimer = 0; return; }
  if (policeSeesPlayer(game)) w.seenTimer = 2.5;
  else if (w.seenTimer > 0) w.seenTimer -= dt;
  if (w.seenTimer <= 0) {
    w.heat = Math.max(0, w.heat - HEAT_DECAY * dt);
    w.stars = starsForHeat(w.heat);
  }
  if (policePinning(game)) {
    w.pinTimer += dt;
    if (w.pinTimer >= BUST_PIN_TIME) {
      game.mode = 'busted';
      audio.fail();
      audio.setEngine(0, false);
      audio.setSiren(false);
      announce('Busted.');
    }
  } else {
    w.pinTimer = Math.max(0, w.pinTimer - dt * 2.2);
  }
  if (game.player.car && game.player.car.health <= 0) {
    game.mode = 'wasted';
    audio.fail();
    audio.setEngine(0, false);
    audio.setSiren(false);
    announce('Wasted.');
  }
}

function updateCamera(snap = 0) {
  const p = game.playerPos();
  const { w, h } = renderer.view;
  const tx = Math.max(0, Math.min(WORLD_W - w, p.x - w / 2));
  const ty = Math.max(0, Math.min(WORLD_H - h, p.y - h / 2));
  if (snap) { game.camera.x = tx; game.camera.y = ty; }
  else {
    game.camera.x += (tx - game.camera.x) * 0.12;
    game.camera.y += (ty - game.camera.y) * 0.12;
  }
}

function step(dt) {
  game.time += dt;
  if (game.messageTimer > 0) game.messageTimer -= dt;
  if (game.mode === 'title') {
    updateTraffic(game, dt);
    updatePedestrians(game, dt);
    game.camera.x = 60 + Math.sin(game.time * 0.05) * 40;
    game.camera.y = 480;
    return;
  }
  if (game.mode !== 'play') return;

  game.prompt = '';
  if (game.player.car) updatePlayerDriving(dt);
  else { updatePlayerOnFoot(dt); audio.setEngine(0, false); }
  updateTraffic(game, dt);
  updatePedestrians(game, dt);
  updatePoliceSpawning(game, dt);
  if (game.policeCars.length) updatePolice(game, dt);
  updateWanted(dt);
  updatePickups();
  updateMissions(game, dt);
  updateCamera(0);
  const anyCopNear = game.policeCars.some((c) => Math.hypot(c.x - game.playerPos().x, c.y - game.playerPos().y) < 520);
  audio.setSiren(game.wanted.stars > 0 && anyCopNear);
}

function handleScreenKeys() {
  if (input.wasPressed('mute')) {
    audio.toggleMute();
    return;
  }
  if (game.mode === 'title') {
    if (input.wasPressed('confirm') || input.mouse.clicked) { audio.unlock(); resetWorld(null); }
    else if (input.wasPressed('continue') && game.hasSave) { audio.unlock(); resetWorld(game.saveData); }
  } else if (game.mode === 'play') {
    if (input.wasPressed('pause')) game.mode = 'pause';
  } else if (game.mode === 'pause') {
    if (input.wasPressed('pause') || input.wasPressed('confirm')) game.mode = 'play';
  } else if (game.mode === 'busted' || game.mode === 'wasted') {
    if (input.wasPressed('restart') || input.wasPressed('confirm')) {
      // Retry the current mission from the last checkpoint (mission index is the one
      // in progress; the saved cash/score are what the last completed mission left).
      const saved = readSave();
      resetWorld({
        missionIndex: game.missionIndex,
        cash: saved ? saved.cash : 0,
        score: saved ? saved.score : 0,
      });
      game.saveData = readSave();
      game.hasSave = !!game.saveData && game.saveData.missionIndex > 0;
    }
  } else if (game.mode === 'complete') {
    if (input.wasPressed('confirm')) { game.mode = 'play'; game.showMessage('Free roam — Sunport is yours.', 3); }
    else if (input.wasPressed('restart')) resetWorld(null);
  }
}

function bootWorldForBackdrop() {
  game.rng = createRandom(seed);
  game.world = createCity(game.rng);
  game.trafficCars = spawnTraffic(game.rng);
  game.peds = spawnPedestrians(game.rng);
  game.saveData = readSave();
  game.hasSave = !!game.saveData && game.saveData.missionIndex > 0;
  game.camera.x = 60;
  game.camera.y = 480;
}

if (shotName) {
  bootWorldForBackdrop();
  game.mode = 'play';
  stageShot(game, shotName, { startMission, enterCar });
  updateCamera(1);
  let painted = 0;
  const paint = () => {
    renderer.draw(game);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  bootWorldForBackdrop();
  let accumulator = 0;
  let last = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleScreenKeys();
    if (game.mode === 'play' || game.mode === 'title') {
      while (accumulator >= STEP) { step(STEP); accumulator -= STEP; }
    } else accumulator = 0;
    renderer.draw(game);
    input.endFrame();
  };
  announce('Sunport Chase. Press Enter to start.');
  requestAnimationFrame(frame);
}
