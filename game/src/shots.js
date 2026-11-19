// Sunport Chase — the screenshot scenes behind ?shot=<name>&seed=1.
// Each scene builds the real game state (real city, real cars, real HUD data) and then
// poses it: the player placed mid-chase, mid-steal, mid-delivery or facing a roadblock.
// Nothing is drawn specially for the camera — the frame is the game's own renderer
// painting a frozen moment, so the same seed always gives the same picture.

import { makePoliceCar } from './police.js';

function givePlayerCar(game, helpers, x, y, angle, speed) {
  const car = game.world.parkedCars[0];
  car.x = x;
  car.y = y;
  car.angle = angle;
  helpers.enterCar(car);
  car.speed = speed;
  game.player.car = car;
  return car;
}

function poseCover(game, helpers) {
  // Daytime chase on the central avenue: A Yang's car fleeing north, two police cars
  // right behind, three stars up, mission 1 on the HUD.
  helpers.startMission(game, 0);
  const car = givePlayerCar(game, helpers, 700 - 13, 980, -Math.PI / 2, 265);
  car.color = '#d94f3d';
  game.wanted.heat = 60; // three stars
  game.wanted.stars = 3;
  game.policeCars.push(makePoliceCar(700 + 13, 1130, -Math.PI / 2, false));
  game.policeCars.push(makePoliceCar(700 - 16, 1252, -Math.PI / 2, false));
  for (const cop of game.policeCars) cop.speed = 250;
  const traffic = game.trafficCars[0];
  traffic.x = 700 + 13; traffic.y = 620; traffic.angle = Math.PI / 2; traffic.speed = 120;
  game.cash = 150;
  game.score = 215;
  game.time = 2.2;
}

function poseSteal(game, helpers) {
  // On foot beside a parked car, the steal prompt up.
  helpers.startMission(game, 0);
  const car = game.world.parkedCars[3] || game.world.parkedCars[0];
  car.x = 700 + 34;
  car.y = 880;
  car.angle = Math.PI / 2;
  game.player.x = car.x + 34;
  game.player.y = car.y + 6;
  game.player.angle = Math.PI;
  game.prompt = car.marked ? 'E — steal the marked car' : 'E — steal car';
  game.cash = 100;
  game.score = 60;
  game.time = 1.4;
}

function poseDelivery(game, helpers) {
  // Mission 1 in flight: package on board, timer running, a busy intersection ahead.
  helpers.startMission(game, 0);
  game.mission.phase = 'dropoff';
  game.mission.target = { x: 2020, y: 300 };
  game.mission.targetLabel = 'Depot drop-off';
  game.mission.timer = 47.3;
  const car = givePlayerCar(game, helpers, 1000, 700 - 13, 0, 185);
  car.color = '#3d7bd9';
  // Fill the junction with traffic, frozen mid-flow.
  const spots = [
    { x: 1140 + 13, y: 560, angle: Math.PI / 2 },
    { x: 1140 - 13, y: 830, angle: -Math.PI / 2 },
    { x: 1290, y: 700 + 13, angle: Math.PI },
    { x: 880, y: 700 - 13, angle: 0 },
    { x: 1140 - 13, y: 430, angle: -Math.PI / 2 },
  ];
  spots.forEach((s, i) => {
    const t = game.trafficCars[i + 1];
    if (!t) return;
    t.x = s.x; t.y = s.y; t.angle = s.angle; t.speed = 110;
  });
  game.cash = 250;
  game.score = 340;
  game.time = 3.1;
}

function poseRoadblock(game, helpers) {
  // The harbour run at four stars: a wall of police cars across the road ahead.
  helpers.startMission(game, 2);
  const car = givePlayerCar(game, helpers, 1140 - 13, 1000, -Math.PI / 2, 305);
  car.color = '#e8b13c';
  game.wanted.heat = 110; // four stars
  game.wanted.stars = 4;
  for (let i = -1; i <= 1; i += 1) {
    game.policeCars.push(makePoliceCar(1140 + i * 31, 764, 0, true));
  }
  game.roadblock = { x: 1140, y: 764 };
  game.policeCars.push(makePoliceCar(1140 + 14, 1160, -Math.PI / 2, false));
  // No "Car stolen!" banner in this frame: it would sit right on top of the roadblock.
  game.message = '';
  game.messageTimer = 0;
  game.cash = 700;
  game.score = 1240;
  game.time = 2.6;
}

const SCENES = {
  cover: poseCover,
  steal: poseSteal,
  delivery: poseDelivery,
  roadblock: poseRoadblock,
};

/** Pose the named scene on a fresh game state. Unknown names fall back to the cover. */
export function stageShot(game, name, helpers) {
  const pose = SCENES[name] || poseCover;
  pose(game, helpers);
}
