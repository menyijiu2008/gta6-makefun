// Sunport Chase — the story: three missions for courier A Yang, in order.
// 1) A timed delivery across town. 2) Steal a marked car and lose the heat it brings.
// 3) The final run: four stars, roadblocks, and the harbour point across the bay side.
// This module owns the mission state machine; main.js owns the world it reads.

import { HARBOUR, HEAT_THRESHOLDS } from './config.js';

export const MISSION_DEFS = [
  {
    name: 'Mission 1 — Cross-Town Delivery',
    intro: 'Auntie Fen needs a package moved. Pick it up in the south-west, then drive it to the north-east depot before the clock runs out.',
  },
  {
    name: 'Mission 2 — The Marked Car',
    intro: 'A teal coupe parked uptown is wanted by a buyer. Steal it, then shake the two-star heat.',
  },
  {
    name: 'Mission 3 — Harbour Run',
    intro: 'Last job. The whole force is out: break the roadblocks and reach the harbour point on the beach road.',
  },
];

const PACKAGE_POINT = { x: 340, y: 1540 };
const DEPOT_POINT = { x: 2020, y: 300 };
const DELIVERY_SECONDS = 85;

export function startMission(game, index) {
  const m = {
    index, phase: 'start', timer: null, target: null, targetLabel: '', stealCar: null,
  };
  game.mission = m;
  if (index === 0) {
    m.phase = 'pickup';
    m.target = { ...PACKAGE_POINT };
    m.targetLabel = 'Package pickup';
  } else if (index === 1) {
    // Mark the parked car nearest the uptown junction as the one to steal.
    let best = null;
    let bestD = Infinity;
    for (const car of game.world.parkedCars) {
      const d = (car.x - 1580) ** 2 + (car.y - 700) ** 2;
      if (d < bestD) { bestD = d; best = car; }
    }
    if (best) {
      best.marked = true;
      best.color = '#19c2b8';
      m.stealCar = best;
    }
    m.phase = 'steal';
    m.targetLabel = 'Marked car';
  } else if (index === 2) {
    m.phase = 'run';
    m.target = { ...HARBOUR };
    m.targetLabel = 'Harbour point';
    if (game.wanted.heat < HEAT_THRESHOLDS[3] + 8) game.wanted.heat = HEAT_THRESHOLDS[3] + 8;
  }
  game.showMessage(MISSION_DEFS[index].name, 4);
}

export function currentTarget(game) {
  const m = game.mission;
  if (!m) return null;
  if (m.index === 1 && m.phase === 'steal' && m.stealCar) {
    return { x: m.stealCar.x, y: m.stealCar.y, label: m.targetLabel };
  }
  return m.target ? { ...m.target, label: m.targetLabel } : null;
}

export function objectiveText(game) {
  const m = game.mission;
  if (!m) return game.storyDone ? 'Story complete — free roam. Cause some sunshine.' : '';
  if (m.index === 0 && m.phase === 'pickup') return 'Pick up the package (get in a car and drive to the marker)';
  if (m.index === 0 && m.phase === 'dropoff') return 'Deliver the package to the depot — hurry!';
  if (m.index === 1 && m.phase === 'steal') return 'Steal the marked teal car';
  if (m.index === 1 && m.phase === 'escape') return 'Lose the police — break line of sight until the stars fade';
  if (m.index === 2) return 'Reach the harbour point — smash through the roadblocks!';
  return '';
}

function distTo(game, x, y) {
  const p = game.playerPos();
  return Math.hypot(p.x - x, p.y - y);
}

export function updateMissions(game, dt) {
  const m = game.mission;
  if (!m || game.mode !== 'play') return;

  if (m.index === 0) {
    if (m.phase === 'pickup') {
      if (game.player.car && distTo(game, PACKAGE_POINT.x, PACKAGE_POINT.y) < 58) {
        m.phase = 'dropoff';
        m.target = { ...DEPOT_POINT };
        m.targetLabel = 'Depot drop-off';
        m.timer = DELIVERY_SECONDS;
        game.showMessage('Package on board — go!', 2.5);
        game.audio.success();
      }
    } else if (m.phase === 'dropoff') {
      m.timer -= dt;
      if (m.timer <= 0) {
        m.phase = 'pickup';
        m.target = { ...PACKAGE_POINT };
        m.targetLabel = 'Package pickup';
        m.timer = null;
        game.showMessage('Too slow — the package went back. Pick it up again.', 3.5);
        game.audio.fail();
      } else if (game.player.car && distTo(game, DEPOT_POINT.x, DEPOT_POINT.y) < 58) {
        game.completeMission(0, 300 + Math.ceil(m.timer) * 4);
      }
    }
  } else if (m.index === 1) {
    if (m.phase === 'steal') {
      if (m.stealCar && game.player.car === m.stealCar) {
        m.phase = 'escape';
        if (game.wanted.heat < HEAT_THRESHOLDS[1] + 6) game.wanted.heat = HEAT_THRESHOLDS[1] + 6;
        game.showMessage('That is the car — now lose them!', 3);
      }
    } else if (m.phase === 'escape') {
      if (game.wanted.stars === 0) game.completeMission(1, 450);
    }
  } else if (m.index === 2) {
    if (distTo(game, HARBOUR.x, HARBOUR.y) < 74) game.completeMission(2, 800);
  }
}
