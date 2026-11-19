// Sunport Chase — the Sunport police: spawning, pursuit and roadblocks.
// Cops pour in as the wanted level rises, steer after the player, ram and try to pin
// the player's car still. At four stars they also throw a roadblock across the road
// ahead. When the player stays out of sight, main.js drains the heat and the force
// stands down car by car.

import { H_ROADS, ROAD_HALF, V_ROADS } from './config.js';
import { nearestRoads, pushOutOfBuilding } from './world.js';

export function desiredPoliceCount(stars) {
  if (stars <= 0) return 0;
  return Math.min(2 + stars, 6);
}

export function makePoliceCar(x, y, angle, isBlock) {
  return {
    x, y, angle, speed: 0,
    color: '#eef1f5', kind: 'police', health: 100,
    block: !!isBlock, sirenPhase: Math.random() * Math.PI * 2,
  };
}

function spawnPointNear(game) {
  // Come from a road a few hundred pixels away, never right on top of the player.
  const p = game.playerPos();
  const { vx, hy } = nearestRoads(p.x, p.y);
  const options = [
    { x: vx, y: p.y - 560 }, { x: vx, y: p.y + 560 },
    { x: p.x - 560, y: hy }, { x: p.x + 560, y: hy },
  ];
  const choice = options[game.rng.int(0, options.length - 1)];
  choice.x = Math.max(50, Math.min(2240, choice.x));
  choice.y = Math.max(50, Math.min(1750, choice.y));
  return choice;
}

export function updatePoliceSpawning(game, dt) {
  game.policeSpawnTimer -= dt;
  const want = desiredPoliceCount(game.wanted.stars);
  const chasing = game.policeCars.filter((c) => !c.block).length;
  if (chasing < want && game.policeSpawnTimer <= 0) {
    const s = spawnPointNear(game);
    game.policeCars.push(makePoliceCar(s.x, s.y, 0, false));
    game.policeSpawnTimer = 1.4;
  }
  if (game.wanted.stars === 0 && game.policeCars.length > 0) {
    // Heat is gone: the force gives up and drives off (cars simply leave the world).
    game.policeCars = game.policeCars.filter((c) => c.block);
    game.roadblock = null;
  }
}

function steerToward(car, tx, ty, dt, maxSpeed) {
  const dx = tx - car.x;
  const dy = ty - car.y;
  const dist = Math.hypot(dx, dy);
  const desired = Math.atan2(dy, dx);
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = 3.4;
  car.angle += Math.max(-turn * dt, Math.min(turn * dt, diff));
  const aligned = Math.max(0.25, 1 - Math.abs(diff) * 0.55);
  const target = maxSpeed * aligned * (dist < 60 ? 0.55 : 1);
  car.speed += Math.max(-380 * dt, Math.min(300 * dt, target - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return dist;
}

export function updatePolice(game, dt) {
  const p = game.playerPos();
  const inCar = !!game.player.car;
  for (const cop of game.policeCars) {
    if (cop.block) continue;
    // Aim a little ahead of a moving target so chases cut corners and ram.
    const lead = inCar ? 0.35 : 0.1;
    const tx = p.x + (inCar ? Math.cos(game.player.car.angle) * game.player.car.speed * lead : 0);
    const ty = p.y + (inCar ? Math.sin(game.player.car.angle) * game.player.car.speed * lead : 0);
    const maxSpeed = game.wanted.stars >= 3 ? 468 : 442;
    steerToward(cop, tx, ty, dt, maxSpeed);
    if (pushOutOfBuilding(game.world, cop, 15)) cop.speed *= 0.4;
    cop.x = Math.max(20, Math.min(2300, cop.x));
    cop.y = Math.max(20, Math.min(1780, cop.y));
  }
  updateRoadblock(game, dt);
}

function updateRoadblock(game, dt) {
  game.roadblockCooldown -= dt;
  if (game.roadblock) {
    const p = game.playerPos();
    const dx = p.x - game.roadblock.x;
    const dy = p.y - game.roadblock.y;
    if (dx * dx + dy * dy > 620 * 620 || game.wanted.stars < 4) {
      game.policeCars = game.policeCars.filter((c) => !c.block);
      game.roadblock = null;
      game.roadblockCooldown = 9;
    }
    return;
  }
  if (game.wanted.stars < 4 || !game.player.car || game.roadblockCooldown > 0) return;
  // Throw the block across the road the player is driving on, ahead of them.
  const car = game.player.car;
  const aheadX = car.x + Math.cos(car.angle) * 340;
  const aheadY = car.y + Math.sin(car.angle) * 340;
  const { vx, hy } = nearestRoads(aheadX, aheadY);
  const onVertical = Math.abs(aheadX - vx) <= Math.abs(aheadY - hy);
  const bx = onVertical ? vx : aheadX;
  const by = onVertical ? aheadY : hy;
  if (bx < 60 || bx > 2260 || by < 60 || by > 1740) return;
  const cars = [];
  for (let i = -1; i <= 1; i += 1) {
    const x = onVertical ? bx + i * 30 : bx;
    const y = onVertical ? by : by + i * 30;
    cars.push(makePoliceCar(x, y, onVertical ? 0 : Math.PI / 2, true));
  }
  game.policeCars.push(...cars);
  game.roadblock = { x: bx, y: by };
  game.roadblockCooldown = 16;
}

/** Is any police car close enough to see the player right now? */
export function policeSeesPlayer(game) {
  const p = game.playerPos();
  for (const cop of game.policeCars) {
    const dx = cop.x - p.x;
    const dy = cop.y - p.y;
    if (dx * dx + dy * dy < 330 * 330) return true;
  }
  return false;
}

/** The closest police car is close and the player is barely moving: a pin in progress. */
export function policePinning(game) {
  const p = game.playerPos();
  const playerSpeed = game.player.car ? Math.abs(game.player.car.speed) : 0;
  if (playerSpeed > 65) return false;
  for (const cop of game.policeCars) {
    const dx = cop.x - p.x;
    const dy = cop.y - p.y;
    if (dx * dx + dy * dy < 52 * 52) return true;
  }
  return false;
}

export { H_ROADS, ROAD_HALF, V_ROADS };
