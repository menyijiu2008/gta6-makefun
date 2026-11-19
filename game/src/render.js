// Sunport Chase — all drawing: the city from above, cars, people, markers, and the
// full-screen menus (start, pause, busted, wasted, story complete). Native Canvas 2D,
// flat sun-soaked colours, no images. The HUD lives in hud.js; this file paints the world.

import {
  COLORS, H_ROADS, ROAD_HALF, ROAD_W, SAND_X, V_ROADS, WATER_X, WORLD_H, WORLD_W,
} from './config.js';
import { currentTarget } from './missions.js';
import { drawHUD } from './hud.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 720 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * ratio);
    canvas.height = Math.round(view.h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function drawWater(game) {
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(SAND_X, 0, WORLD_W - SAND_X, WORLD_H);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(WATER_X, 0, WORLD_W - WATER_X, WORLD_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 40; y < WORLD_H; y += 90) {
      const off = Math.sin(y * 0.05 + game.time * 1.4) * 14;
      ctx.moveTo(WATER_X + 26 + off, y);
      ctx.lineTo(WATER_X + 90 + off, y);
      ctx.moveTo(WATER_X + 130 - off, y + 34);
      ctx.lineTo(WATER_X + 185 - off, y + 34);
    }
    ctx.stroke();
    // The harbour pier the final mission runs to.
    ctx.fillStyle = '#8a6f4d';
    ctx.fillRect(WATER_X - 70, 1140 - 16, 130, 32);
  }

  function drawRoads() {
    ctx.fillStyle = COLORS.sidewalk;
    for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_HALF - 15, 0, ROAD_W + 30, WORLD_H);
    for (const ry of H_ROADS) ctx.fillRect(0, ry - ROAD_HALF - 15, SAND_X + 40, ROAD_W + 30);
    ctx.fillStyle = COLORS.road;
    for (const rx of V_ROADS) ctx.fillRect(rx - ROAD_HALF, 0, ROAD_W, WORLD_H);
    for (const ry of H_ROADS) ctx.fillRect(0, ry - ROAD_HALF, SAND_X + 40, ROAD_W);
    ctx.strokeStyle = COLORS.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    for (const rx of V_ROADS) { ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD_H); }
    for (const ry of H_ROADS) { ctx.moveTo(0, ry); ctx.lineTo(SAND_X + 40, ry); }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBuildings(world) {
    for (const b of world.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      const step = 26;
      for (let wx = b.x + 14; wx < b.x + b.w - 16; wx += step) {
        for (let wy = b.y + 14; wy < b.y + b.h - 16; wy += step) ctx.fillRect(wx, wy, 9, 6);
      }
    }
  }

  function drawPalms(world) {
    for (const palm of world.palms) {
      ctx.strokeStyle = '#7a5c38';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y);
      ctx.lineTo(palm.x + 3, palm.y - 7);
      ctx.stroke();
      ctx.fillStyle = '#3f9e4d';
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + palm.x * 0.01;
        ctx.beginPath();
        ctx.arc(palm.x + 3 + Math.cos(a) * 7, palm.y - 8 + Math.sin(a) * 5, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPickups(game) {
    for (const pk of game.world.pickups) {
      if (pk.taken) continue;
      const bobY = Math.sin(game.time * 3 + pk.bob) * 3;
      ctx.fillStyle = COLORS.cash;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bobY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#06380f';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', pk.x, pk.y + bobY + 1);
    }
  }

  function drawTargetMarker(game) {
    const target = currentTarget(game);
    if (!target || game.mode !== 'play') return;
    const pulse = 26 + Math.sin(game.time * 4) * 6;
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 225, 77, 0.16)';
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
    ctx.fill();
    const ay = target.y - 52 - Math.abs(Math.sin(game.time * 3)) * 8;
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.moveTo(target.x, ay + 16);
    ctx.lineTo(target.x - 10, ay);
    ctx.lineTo(target.x + 10, ay);
    ctx.closePath();
    ctx.fill();
  }

  function drawCarBody(car, game) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.roundRect(-21, -8, 46, 22, 6); ctx.fill();
    ctx.fillStyle = car.color;
    ctx.beginPath(); ctx.roundRect(-23, -11, 46, 22, 6); ctx.fill();
    ctx.fillStyle = 'rgba(20,26,34,0.9)';
    ctx.beginPath(); ctx.roundRect(-6, -8.5, 15, 17, 3); ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.85)';
    ctx.fillRect(7, -8, 3.5, 16);
    ctx.fillStyle = '#22262b';
    ctx.fillRect(-19, -13, 9, 4); ctx.fillRect(-19, 9, 9, 4);
    ctx.fillRect(11, -13, 9, 4); ctx.fillRect(11, 9, 9, 4);
    if (car.kind === 'police') {
      ctx.fillStyle = '#22262b';
      ctx.fillRect(-8, -11, 13, 22);
      const flash = Math.floor(game.time * 4 + (car.sirenPhase || 0)) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#3b82f6';
      ctx.fillRect(-3, -6, 6, 4);
      ctx.fillStyle = flash ? '#3b82f6' : '#ff3b30';
      ctx.fillRect(-3, 2, 6, 4);
    }
    if (car.health !== undefined && car.health < 55) {
      ctx.fillStyle = 'rgba(60,60,60,0.5)';
      ctx.beginPath(); ctx.arc(-16, 0, 6 + (55 - car.health) * 0.08, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (car.marked) {
      const ay = car.y - 44 - Math.abs(Math.sin(game.time * 3.2)) * 7;
      ctx.fillStyle = '#19c2b8';
      ctx.beginPath();
      ctx.moveTo(car.x, ay + 15);
      ctx.lineTo(car.x - 9, ay);
      ctx.lineTo(car.x + 9, ay);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPed(ped) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    if (ped.state === 'down') {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#6b7280';
      ctx.beginPath(); ctx.roundRect(-11, -4.5, 22, 9, 4); ctx.fill();
    } else {
      ctx.rotate(ped.angle);
      ctx.fillStyle = ped.color;
      ctx.beginPath(); ctx.roundRect(-7, -6, 14, 12, 5); ctx.fill();
      ctx.fillStyle = '#f2c79b';
      ctx.beginPath(); ctx.arc(2, 0, 4.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayerOnFoot(game) {
    const p = game.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(2, 3, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath(); ctx.roundRect(-8, -7, 16, 14, 6); ctx.fill();
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath(); ctx.arc(3, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawWorld(game) {
    const cam = game.camera;
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(cam.x - 40, cam.y - 40, view.w + 80, view.h + 80);
    drawWater(game);
    drawRoads();
    drawBuildings(game.world);
    drawPalms(game.world);
    drawPickups(game);
    drawTargetMarker(game);
    for (const car of game.world.parkedCars) drawCarBody(car, game);
    for (const car of game.trafficCars) drawCarBody(car, game);
    for (const ped of game.peds) drawPed(ped);
    for (const cop of game.policeCars) drawCarBody(cop, game);
    if (game.player.car) drawCarBody(game.player.car, game);
    else drawPlayerOnFoot(game);
    ctx.restore();
  }

  function centrePanel(w, h, pw, ph) {
    ctx.fillStyle = 'rgba(6, 10, 16, 0.72)';
    ctx.beginPath();
    ctx.roundRect((w - pw) / 2, (h - ph) / 2, pw, ph, 14);
    ctx.fill();
    return { x: (w - pw) / 2, y: (h - ph) / 2 };
  }

  function drawStartScreen(game) {
    const { w, h } = view;
    const { y } = centrePanel(w, h, 680, 520);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText('SUNPORT CHASE', w / 2, y + 78);
    ctx.fillStyle = '#eef1f5';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('阳光港追缉', w / 2, y + 116);
    ctx.font = '16.5px system-ui, sans-serif';
    ctx.fillStyle = '#cfd8e3';
    const lines = [
      'Sunport, a bright seaside city that never checks its mirrors.',
      'You are A Yang, a courier with a fast right foot and faster debts.',
      'Run three jobs: a cross-town delivery, one marked car, and the harbour run.',
      'Steal cars, dodge traffic, and keep the stars from pinning you down.',
      '',
      'WASD / arrows — move & drive      E — enter / exit car',
      'Shift — sprint      F — shove      P / Esc — pause      M — mute',
    ];
    lines.forEach((line, i) => ctx.fillText(line, w / 2, y + 162 + i * 27));
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillStyle = '#39d353';
    ctx.fillText('Press ENTER — New game', w / 2, y + 396);
    if (game.hasSave) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`Press C — Continue (mission ${game.saveData.missionIndex + 1}, $${game.saveData.cash})`, w / 2, y + 434);
    }
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('An original game — every name, car and street in Sunport is invented.', w / 2, y + 482);
  }

  function drawPauseScreen() {
    const { w, h } = view;
    ctx.fillStyle = 'rgba(4,6,10,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef1f5';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED 暂停', w / 2, h / 2 - 12);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Press P or Esc to keep driving', w / 2, h / 2 + 30);
  }

  function drawEndScreen(game) {
    const { w, h } = view;
    ctx.fillStyle = 'rgba(4,6,10,0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    let title = '';
    let sub = '';
    if (game.mode === 'busted') {
      const flash = Math.floor(game.time * 3) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#3b82f6';
      title = 'BUSTED 被捕';
      sub = 'The Sunport police pinned you down.';
    } else if (game.mode === 'wasted') {
      ctx.fillStyle = '#ff5a4d';
      title = 'WASTED 车辆报废';
      sub = 'Your ride is scrap. The jobs will wait for another driver.';
    } else {
      ctx.fillStyle = '#39d353';
      title = 'STORY COMPLETE 故事完成';
      sub = 'All three jobs done. Sunport is yours — free roam!';
    }
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText(title, w / 2, h / 2 - 60);
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillStyle = '#eef1f5';
    ctx.fillText(sub, w / 2, h / 2 - 16);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`Final score ${game.score} · Cash $${game.cash}`, w / 2, h / 2 + 26);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    const prompt = game.mode === 'complete' ? 'Press ENTER — free roam · R — play the story again' : 'Press R or ENTER — try again';
    ctx.fillText(prompt, w / 2, h / 2 + 70);
  }

  function draw(game) {
    drawWorld(game);
    if (game.mode === 'play' || game.mode === 'pause') drawHUD(ctx, game, view.w, view.h);
    if (game.mode === 'title') drawStartScreen(game);
    else if (game.mode === 'pause') drawPauseScreen();
    else if (game.mode === 'busted' || game.mode === 'wasted' || game.mode === 'complete') drawEndScreen(game);
  }

  return { draw, view };
}
