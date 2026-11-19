// Sunport Chase — the HUD: wanted stars, cash and score, the mission objective and
// timer, speed, centre prompts and messages, and the minimap with player, target and
// police blips. Drawn on the same canvas over the world, in screen space.

import { HARBOUR, SAND_X, V_ROADS, H_ROADS, WORLD_H, WORLD_W } from './config.js';
import { currentTarget, objectiveText } from './missions.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 12, 18, 0.58)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function drawStars(ctx, game, w) {
  const stars = game.wanted.stars;
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  let label = '';
  for (let i = 0; i < 5; i += 1) label += i < stars ? '★' : '☆';
  const flash = game.wanted.seenTimer <= 0 && stars > 0 && Math.floor(game.time * 3) % 2 === 0;
  ctx.fillStyle = stars === 0 ? 'rgba(255,255,255,0.35)' : flash ? '#ffd94d' : '#ffb52e';
  ctx.fillText(label, w - 16, 12);
  if (game.wanted.pinTimer > 0.15) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#ff5a4d';
    ctx.fillText('BUSTED IN…', w - 16, 44);
  }
}

function drawWallet(ctx, game) {
  panel(ctx, 12, 12, 208, 58);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillStyle = '#39d353';
  ctx.fillText(`$ ${game.cash}`, 24, 19);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#eef1f5';
  ctx.fillText(`Score ${game.score}`, 24, 44);
}

function drawObjective(ctx, game, w) {
  const text = objectiveText(game);
  if (!text) return;
  const target = currentTarget(game);
  const hasTimer = !!(game.mission && game.mission.timer !== null && game.mission.timer !== undefined);
  const secondLine = hasTimer || !!target;
  ctx.font = '16px system-ui, sans-serif';
  const tw = Math.min(ctx.measureText(text).width + 36, w - 40);
  panel(ctx, (w - tw) / 2, 12, tw, secondLine ? 62 : 40);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(text, w / 2, 21);
  if (hasTimer) {
    const t = Math.max(0, game.mission.timer);
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = t < 12 ? '#ff5a4d' : '#eef1f5';
    ctx.fillText(`⏱ ${t.toFixed(1)} s`, w / 2, 44);
  } else if (target) {
    const p = game.playerPos();
    const d = Math.round(Math.hypot(p.x - target.x, p.y - target.y) / 10);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText(`${target.label} · ${d} m`, w / 2, 45);
  }
}

function drawSpeed(ctx, game, w, h) {
  if (!game.player.car) return;
  const kmh = Math.round(Math.abs(game.player.car.speed) * 0.24);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = '#eef1f5';
  ctx.fillText(`${kmh}`, w - 52, h - 22);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('km/h', w - 16, h - 22);
}

function drawMinimap(ctx, game, h) {
  const mw = 196;
  const mh = 142;
  const x0 = 12;
  const y0 = h - mh - 12;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  panel(ctx, x0 - 4, y0 - 4, mw + 8, mh + 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#7d7767';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = '#2e9bc6';
  ctx.fillRect(x0 + SAND_X * sx, y0, mw - SAND_X * sx, mh);
  ctx.strokeStyle = '#454b53';
  ctx.lineWidth = 3;
  for (const rx of V_ROADS) {
    ctx.beginPath(); ctx.moveTo(x0 + rx * sx, y0); ctx.lineTo(x0 + rx * sx, y0 + mh); ctx.stroke();
  }
  for (const ry of H_ROADS) {
    ctx.beginPath(); ctx.moveTo(x0, y0 + ry * sy); ctx.lineTo(x0 + mw, y0 + ry * sy); ctx.stroke();
  }
  // Cash pickups as green dots.
  ctx.fillStyle = '#39d353';
  for (const pk of game.world.pickups) {
    if (!pk.taken) ctx.fillRect(x0 + pk.x * sx - 1.5, y0 + pk.y * sy - 1.5, 3, 3);
  }
  // Harbour.
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath(); ctx.arc(x0 + HARBOUR.x * sx, y0 + HARBOUR.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  // Mission target: a pulsing yellow diamond.
  const target = currentTarget(game);
  if (target) {
    const tx = x0 + target.x * sx;
    const ty = y0 + target.y * sy;
    const r = 4.5 + Math.sin(game.time * 5) * 1.2;
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.moveTo(tx, ty - r); ctx.lineTo(tx + r, ty); ctx.lineTo(tx, ty + r); ctx.lineTo(tx - r, ty);
    ctx.closePath(); ctx.fill();
  }
  // Police blips flash blue/red.
  for (const cop of game.policeCars) {
    ctx.fillStyle = Math.floor(game.time * 4 + cop.sirenPhase) % 2 === 0 ? '#4da3ff' : '#ff5a4d';
    ctx.beginPath(); ctx.arc(x0 + cop.x * sx, y0 + cop.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Player: white dot with a heading tick.
  const p = game.playerPos();
  const px = x0 + p.x * sx;
  const py = y0 + p.y * sy;
  const heading = game.player.car ? game.player.car.angle : game.player.angle;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.cos(heading) * 8, py + Math.sin(heading) * 8);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px, py, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('SUNPORT', x0 + 4, y0 + 4);
}

export function drawHUD(ctx, game, w, h) {
  drawWallet(ctx, game);
  drawStars(ctx, game, w);
  drawObjective(ctx, game, w);
  drawSpeed(ctx, game, w, h);
  drawMinimap(ctx, game, h);

  if (game.prompt) {
    ctx.font = 'bold 19px system-ui, sans-serif';
    const tw = ctx.measureText(game.prompt).width + 34;
    panel(ctx, (w - tw) / 2, h - 108, tw, 38);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(game.prompt, w / 2, h - 88);
  }
  if (game.message && game.messageTimer > 0) {
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(game.message, w / 2, 110);
    ctx.shadowBlur = 0;
  }
  if (game.audio.muted) {
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('🔇 M muted', w - 16, h - 52);
  }
}
