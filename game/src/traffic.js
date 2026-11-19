// Sunport Chase — traffic and pedestrians: the city going about its day.
// Traffic cars drive the road grid lane by lane, turning at intersections, braking for
// whatever is in front of them. Pedestrians stroll the sidewalks, flee fast cars and
// fall down (and later get up) when clipped.

import { CAR_COLORS, H_ROADS, ROAD_HALF, SAND_X, V_ROADS, WORLD_H } from './config.js';
import { pushOutOfBuilding } from './world.js';

const LANE = 13;
const TRAFFIC_COUNT = 11;
const PED_COUNT = 13;

export function spawnTraffic(rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const vertical = rng.chance(0.55);
    const dir = rng.chance(0.5) ? 1 : -1;
    if (vertical) {
      const ri = rng.int(0, V_ROADS.length - 1);
      cars.push(makeTrafficCar(rng, 'v', ri, dir, rng.range(80, WORLD_H - 80)));
    } else {
      const ri = rng.int(0, H_ROADS.length - 1);
      cars.push(makeTrafficCar(rng, 'h', ri, dir, rng.range(80, SAND_X - 80)));
    }
  }
  return cars;
}

function makeTrafficCar(rng, axis, roadIndex, dir, pos) {
  const car = {
    axis, roadIndex, dir, pos,
    x: 0, y: 0, angle: 0, speed: 0,
    cruise: rng.range(105, 165),
    color: rng.pick(CAR_COLORS), kind: 'traffic', health: 100,
    honk: 0,
  };
  placeTrafficCar(car);
  return car;
}

function placeTrafficCar(car) {
  if (car.axis === 'v') {
    car.x = V_ROADS[car.roadIndex] + car.dir * LANE;
    car.y = car.pos;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    car.x = car.pos;
    car.y = H_ROADS[car.roadIndex] + car.dir * LANE;
    car.angle = car.dir > 0 ? 0 : Math.PI;
  }
}

/** Something solid in front of this car? Checks the player, their car and other vehicles. */
function blockedAhead(game, car, lookAhead) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const solids = [];
  if (game.player.car) solids.push(game.player.car);
  else solids.push(game.player);
  for (const other of game.trafficCars) if (other !== car) solids.push(other);
  for (const cop of game.policeCars) solids.push(cop);
  for (const other of solids) {
    const rx = other.x - car.x;
    const ry = other.y - car.y;
    const ahead = rx * fx + ry * fy;
    const side = Math.abs(rx * -fy + ry * fx);
    if (ahead > 4 && ahead < lookAhead && side < 17) return true;
  }
  return false;
}

function maybeTurn(rng, car, crossedLine, isVerticalLine) {
  if (!rng.chance(0.38)) return;
  // Turn onto the road just crossed: swap axis, keep the crossing point as the new pos.
  if (isVerticalLine) {
    car.axis = 'v';
    car.roadIndex = V_ROADS.indexOf(crossedLine);
    car.pos = car.y;
  } else {
    car.axis = 'h';
    car.roadIndex = H_ROADS.indexOf(crossedLine);
    car.pos = car.x;
  }
  car.dir = rng.chance(0.5) ? 1 : -1;
}

export function updateTraffic(game, dt) {
  const rng = game.rng;
  for (const car of game.trafficCars) {
    const before = car.pos;
    const wants = blockedAhead(game, car, 58) ? 0 : car.cruise;
    car.speed += Math.max(-320 * dt, Math.min(140 * dt, wants - car.speed));
    car.pos += car.dir * car.speed * dt;

    // Crossed an intersection centreline this step? Maybe turn onto it.
    const lines = car.axis === 'v' ? H_ROADS : V_ROADS;
    for (const line of lines) {
      const crossed = car.dir > 0 ? (before < line && car.pos >= line) : (before > line && car.pos <= line);
      if (crossed) { maybeTurn(rng, car, line, car.axis === 'h'); break; }
    }

    // Off the end of the road: turn around at the map edge.
    const limit = car.axis === 'v' ? WORLD_H - 60 : SAND_X - 60;
    if (car.pos > limit) { car.pos = limit; car.dir = -1; }
    if (car.pos < 60) { car.pos = 60; car.dir = 1; }
    placeTrafficCar(car);
    pushOutOfBuilding(game.world, car, 14);
  }
}

export function spawnPedestrians(rng) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    const rx = rng.pick(V_ROADS);
    const ry = rng.pick(H_ROADS);
    const ped = {
      x: rx + rng.pick([-1, 1]) * (ROAD_HALF + 18),
      y: ry + rng.range(-220, 220),
      tx: 0, ty: 0, angle: 0, speed: rng.range(38, 62),
      state: 'walk', timer: 0,
      color: rng.pick(['#e2703a', '#3d7bd9', '#f2f0e6', '#39b56a', '#e8b13c', '#d94f6a']),
    };
    pickPedTarget(rng, ped);
    peds.push(ped);
  }
  return peds;
}

function pickPedTarget(rng, ped) {
  // Stroll along the sidewalk: mostly straight, sometimes across to another corner.
  ped.tx = ped.x + rng.range(-40, 40);
  ped.ty = ped.y + rng.range(-260, 260);
  if (rng.chance(0.3)) ped.tx += rng.pick([-1, 1]) * (ROAD_HALF * 2 + 36);
  ped.tx = Math.max(20, Math.min(SAND_X + 60, ped.tx));
  ped.ty = Math.max(20, Math.min(WORLD_H - 20, ped.ty));
}

export function updatePedestrians(game, dt) {
  const rng = game.rng;
  const threats = [];
  if (game.player.car && Math.abs(game.player.car.speed) > 130) threats.push(game.player.car);
  for (const car of game.trafficCars) if (car.speed > 150) threats.push(car);
  for (const cop of game.policeCars) threats.push(cop);

  for (const ped of game.peds) {
    if (ped.state === 'down') {
      ped.timer -= dt;
      if (ped.timer <= 0) ped.state = 'walk';
      continue;
    }
    let fleeing = false;
    for (const t of threats) {
      const dx = ped.x - t.x;
      const dy = ped.y - t.y;
      if (dx * dx + dy * dy < 95 * 95) {
        ped.tx = ped.x + dx * 2.2;
        ped.ty = ped.y + dy * 2.2;
        fleeing = true;
        break;
      }
    }
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const dist = Math.hypot(dx, dy);
    const speed = fleeing ? 165 : ped.speed;
    if (dist < 8) {
      if (!fleeing) pickPedTarget(rng, ped);
      continue;
    }
    ped.angle = Math.atan2(dy, dx);
    ped.x += Math.cos(ped.angle) * speed * dt;
    ped.y += Math.sin(ped.angle) * speed * dt;
    ped.x = Math.max(14, Math.min(SAND_X + 70, ped.x));
    ped.y = Math.max(14, Math.min(WORLD_H - 14, ped.y));
  }
}

/** Knock a pedestrian down (they get up again after a few seconds). */
export function knockDownPed(ped) {
  ped.state = 'down';
  ped.timer = 4.5;
}
