import { normalizeAngle } from '../sim/ship.js';

const COLORS = {
  space: '#070b1c',
  arena: '#0c1430',
  grid: 'rgba(120, 150, 255, 0.07)',
  edge: 'rgba(120, 150, 255, 0.35)',
  ship: '#d9f1ff',
  shipStroke: '#6fc3ff',
  flameOuter: '#ff6a3d',
  flameInner: '#ffd27a',
  hudBg: 'rgba(7, 11, 28, 0.75)',
  hudText: '#cfe3ff',
  hudWarn: '#ff7a6b',
};

// ---------- інтерполяція ----------

const lerp = (a, b, t) => a + (b - a) * t;

// кут інтерполюємо найкоротшим шляхом: від 179° до -179° — це 2°, а не 358°
function lerpAngle(a, b, t) {
  return a + normalizeAngle(b - a) * t;
}

// якщо корабель "загорнувся" через край, не малюємо його посередині арени
function lerpWrapped(a, b, t, size) {
  return Math.abs(b - a) > size / 2 ? b : lerp(a, b, t);
}

export function interpolateShip(prev, curr, alpha, arena) {
  return {
    ...curr,
    x: lerpWrapped(prev.x, curr.x, alpha, arena.width),
    y: lerpWrapped(prev.y, curr.y, alpha, arena.height),
    angle: lerpAngle(prev.angle, curr.angle, alpha),
  };
}

// ---------- фон ----------

export function createStars(arena, count = 220) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * arena.width,
    y: Math.random() * arena.height,
    r: Math.random() < 0.9 ? 1 : 2,
    a: 0.3 + Math.random() * 0.7,
  }));
}

export function clear(ctx, view) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); // 1 одиниця = 1 CSS-піксель
  ctx.fillStyle = COLORS.space;
  ctx.fillRect(0, 0, view.cssWidth, view.cssHeight);
}

// переходимо у "світові" координати арени
export function enterWorld(ctx, view) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.translate(view.offsetX, view.offsetY);
  ctx.scale(view.scale, view.scale);
}

export function drawArena(ctx, arena, stars) {
  ctx.fillStyle = COLORS.arena;
  ctx.fillRect(0, 0, arena.width, arena.height);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 100; x < arena.width; x += 100) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
  }
  for (let y = 100; y < arena.height; y += 100) {
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
  }
  ctx.stroke();

  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = COLORS.edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, arena.width, arena.height);
}

// ---------- корабель ----------

// Малюємо корабель у початку координат носом вправо,
// а на місце його ставимо translate + rotate самого canvas.
export function drawShip(ctx, ship, timeMs) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  if (ship.thrust) {
    const len = 16 + Math.sin(timeMs * 0.05) * 4 + Math.random() * 4;
    ctx.fillStyle = COLORS.flameOuter;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(-8 - len, 0);
    ctx.lineTo(-8, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.flameInner;
    ctx.beginPath();
    ctx.moveTo(-8, -3);
    ctx.lineTo(-8 - len * 0.55, 0);
    ctx.lineTo(-8, 3);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.ship;
  ctx.strokeStyle = COLORS.shipStroke;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(20, 0); // ніс
  ctx.lineTo(-12, 12); // праве крило
  ctx.lineTo(-6, 0); // виріз на кормі
  ctx.lineTo(-12, -12); // ліве крило
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ---------- HUD ----------

// lines: [{ text, warn? }]
export function drawHud(ctx, view, lines) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.font = '13px ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace';
  ctx.textBaseline = 'top';

  const lineH = 18;
  const width = Math.max(...lines.map((l) => ctx.measureText(l.text).width)) + 20;
  const height = lines.length * lineH + 12;

  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(10, 10, width, height);

  lines.forEach((l, i) => {
    ctx.fillStyle = l.warn ? COLORS.hudWarn : COLORS.hudText;
    ctx.fillText(l.text, 20, 16 + i * lineH);
  });
}
