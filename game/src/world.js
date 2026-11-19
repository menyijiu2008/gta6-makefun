// Sunport Chase — the city of Sunport itself: generation and geometry.
// Builds the road grid, city blocks with buildings, the beach and harbour on the east
// edge, palm props, parked cars and cash pickups, all from the run's seed. Also owns the
// geometry questions every other module asks: is this point on a road, does this circle
// hit a building, where is the nearest road centreline.

import {
  BUILDING_COLORS, CAR_COLORS, H_ROADS, ROAD_HALF, SAND_X, V_ROADS,
  WATER_X, WORLD_H, WORLD_W,
} from './config.js';

export function isOnRoad(x, y) {
  for (const rx of V_ROADS) if (Math.abs(x - rx) <= ROAD_HALF) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) <= ROAD_HALF) return true;
  return false;
}

export function isWater(x) { return x >= WATER_X; }
export function isSand(x) { return x >= SAND_X && x < WATER_X; }

/** Nearest vertical and horizontal road centrelines to a point. */
export function nearestRoads(x, y) {
  let vx = V_ROADS[0];
  let hy = H_ROADS[0];
  for (const rx of V_ROADS) if (Math.abs(rx - x) < Math.abs(vx - x)) vx = rx;
  for (const ry of H_ROADS) if (Math.abs(ry - y) < Math.abs(hy - y)) hy = ry;
  return { vx, hy };
}

/** The building rect a circle touches, or null. Buildings are the only hard obstacles. */
export function buildingAt(world, x, y, r) {
  for (const b of world.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

/** Push a circle out of a building rect along its shallowest axis. */
export function pushOutOfBuilding(world, body, r) {
  const b = buildingAt(world, body.x, body.y, r);
  if (!b) return false;
  const left = body.x + r - b.x;
  const right = b.x + b.w - (body.x - r);
  const top = body.y + r - b.y;
  const bottom = b.y + b.h - (body.y - r);
  const min = Math.min(left, right, top, bottom);
  if (min === left) body.x = b.x - r;
  else if (min === right) body.x = b.x + b.w + r;
  else if (min === top) body.y = b.y - r;
  else body.y = b.y + b.h + r;
  return true;
}

export function clampToWorld(body, r) {
  body.x = Math.max(r, Math.min(WORLD_W - r, body.x));
  body.y = Math.max(r, Math.min(WORLD_H - r, body.y));
  if (body.x > WATER_X - r) body.x = WATER_X - r;
}

function buildBlocks(rng) {
  const buildings = [];
  const xEdges = [0, ...V_ROADS, SAND_X];
  const yEdges = [0, ...H_ROADS, WORLD_H];
  for (let xi = 0; xi < xEdges.length - 1; xi += 1) {
    for (let yi = 0; yi < yEdges.length - 1; yi += 1) {
      const x0 = xEdges[xi] + ROAD_HALF + 26;
      const x1 = xEdges[xi + 1] - ROAD_HALF - 26;
      const y0 = yEdges[yi] + ROAD_HALF + 26;
      const y1 = yEdges[yi + 1] - ROAD_HALF - 26;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // Each block gets one big building or a pair, with a small plaza gap between lots.
      const split = rng.chance(0.55) && x1 - x0 > 200;
      const lots = split
        ? [[x0, y0, (x0 + x1) / 2 - 12, y1], [(x0 + x1) / 2 + 12, y0, x1, y1]]
        : [[x0, y0, x1, y1]];
      for (const [lx0, ly0, lx1, ly1] of lots) {
        if (rng.chance(0.14)) continue; // an empty lot: car park / plaza
        buildings.push({
          x: lx0 + rng.range(0, 14),
          y: ly0 + rng.range(0, 14),
          w: (lx1 - lx0) - rng.range(0, 22),
          h: (ly1 - ly0) - rng.range(0, 22),
          color: rng.pick(BUILDING_COLORS),
          roof: rng.pick(['#8a4f3a', '#5d6d7e', '#7a6a53', '#946b54']),
          floors: rng.int(2, 7),
        });
      }
    }
  }
  return buildings;
}

function buildParkedCars(rng) {
  const cars = [];
  // Park along vertical roads, nose north or south, tucked against the kerb.
  for (let i = 0; i < 15; i += 1) {
    const vertical = rng.chance(0.6);
    if (vertical) {
      const rx = rng.pick(V_ROADS);
      const side = rng.chance(0.5) ? -1 : 1;
      cars.push({
        x: rx + side * (ROAD_HALF - 14),
        y: rng.range(80, WORLD_H - 80),
        angle: side < 0 ? -Math.PI / 2 : Math.PI / 2,
        speed: 0, color: rng.pick(CAR_COLORS), kind: 'parked', health: 100, marked: false,
      });
    } else {
      const ry = rng.pick(H_ROADS);
      const side = rng.chance(0.5) ? -1 : 1;
      cars.push({
        x: rng.range(80, SAND_X - 80),
        y: ry + side * (ROAD_HALF - 14),
        angle: side < 0 ? Math.PI : 0,
        speed: 0, color: rng.pick(CAR_COLORS), kind: 'parked', health: 100, marked: false,
      });
    }
  }
  return cars;
}

function buildPickups(rng) {
  const pickups = [];
  for (let i = 0; i < 14; i += 1) {
    const rx = rng.pick(V_ROADS);
    const ry = rng.pick(H_ROADS);
    const x = rx + rng.pick([-1, 1]) * (ROAD_HALF + 22) + rng.range(-16, 16);
    const y = ry + rng.pick([-1, 1]) * (ROAD_HALF + 22) + rng.range(-16, 16);
    pickups.push({ x, y, taken: false, bob: rng.range(0, Math.PI * 2) });
  }
  pickups.push({ x: 2330, y: 900, taken: false, bob: 1 });
  pickups.push({ x: 2330, y: 1400, taken: false, bob: 2 });
  return pickups;
}

function buildPalms(rng) {
  const palms = [];
  for (let y = 90; y < WORLD_H - 60; y += rng.range(90, 150)) {
    palms.push({ x: SAND_X + rng.range(14, 60), y });
  }
  for (let i = 0; i < 22; i += 1) {
    const rx = rng.pick(V_ROADS);
    const ry = rng.pick(H_ROADS);
    palms.push({ x: rx + rng.pick([-1, 1]) * (ROAD_HALF + 16), y: ry + rng.range(-160, 160) });
  }
  return palms;
}

/** Build the whole city for a seed. Pure data — main.js owns the living state. */
export function createCity(rng) {
  const buildings = buildBlocks(rng);
  return {
    buildings,
    parkedCars: buildParkedCars(rng),
    pickups: buildPickups(rng),
    palms: buildPalms(rng),
  };
}
