import { createLoop } from './loop.js';
import { createInput } from './input.js';
import { createShip, integrate } from './sim/ship.js';
import { ARENA, wrap } from './sim/arena.js';
import { setupCanvas } from './render/canvas.js';
import {
  clear,
  createStars,
  drawArena,
  drawHud,
  drawShip,
  enterWorld,
  interpolateShip,
} from './render/draw.js';

// ---------- режими експериментів (через адресний рядок) ----------
//   ?block        — експеримент 1: блокування 100 мс кожен 60-й кадр
//   ?interval     — експеримент 2: setInterval(16) замість rAF
//   ?variable     — експеримент 3: змінний крок замість фіксованого
//   ?auto         — автопілот: тяга + поворот, через 5 с симуляції пише позицію
// Можна комбінувати: ?variable&auto
const params = new URLSearchParams(location.search);
const EXP = {
  block: params.has('block'),
  interval: params.has('interval'),
  variable: params.has('variable'),
  auto: params.has('auto'),
};

// ---------- стан ----------
const canvas = document.getElementById('game');
const { ctx, view } = setupCanvas(canvas, ARENA);
const stars = createStars(ARENA);
const input = createInput(window);

let prev = createShip(ARENA.width / 2, ARENA.height / 2);
let curr = prev;
let simTime = 0;
let steps = 0;
let autoResult = null;
let showHud = true;
let frameCount = 0;
let recording = null; // { start, deltas, steps0 }
let lastRecording = null;

// ---------- керування ----------
function readControls() {
  if (EXP.auto) return { turn: 1, thrust: true };
  const left = input.isDown('ArrowLeft') || input.isDown('KeyA');
  const right = input.isDown('ArrowRight') || input.isDown('KeyD');
  return {
    turn: (right ? 1 : 0) - (left ? 1 : 0),
    thrust: input.isDown('ArrowUp') || input.isDown('KeyW'),
  };
}

// ---------- один крок симуляції ----------
function simulate(dt) {
  if (input.justPressed('KeyH')) showHud = !showHud;
  if (input.justPressed('KeyR') && !recording) startRecording();

  prev = curr;
  curr = wrap(integrate(curr, readControls(), dt), ARENA);
  simTime += dt;
  steps++;

  if (EXP.auto && !autoResult && simTime >= 5 - 1e-9) {
    autoResult = { steps, simTime, x: curr.x, y: curr.y };
    console.log('[auto] позиція після 5 с симуляції:', autoResult);
  }

  input.endStep(); // "щойно натиснуті" живуть рівно один крок
}

// ---------- кадр рендеру ----------
function render(alpha) {
  frameCount++;
  if (EXP.block && frameCount % 60 === 0) {
    const t = performance.now();
    while (performance.now() < t + 100) {
      // навмисно блокуємо головний потік на 100 мс
    }
  }

  const ship = interpolateShip(prev, curr, alpha, ARENA);

  clear(ctx, view);
  enterWorld(ctx, view);
  drawArena(ctx, ARENA, stars);
  drawShip(ctx, ship, performance.now());
  if (showHud) drawHud(ctx, view, hudLines());
}

// ---------- HUD ----------
const f1 = (n) => n.toFixed(1);

function hudLines() {
  const s = loop.stats;
  const speed = Math.hypot(curr.vx, curr.vy);
  const mode = [
    EXP.interval ? 'setInterval 16' : 'rAF',
    EXP.variable ? 'змінний крок' : 'крок 1/60',
    EXP.block ? 'блок 100 мс' : '',
  ].filter(Boolean);

  const lines = [
    { text: `steps/s   ${s.stepsPerSec}` },
    { text: `frames/s  ${s.framesPerSec}` },
    {
      text: `кадр      ${f1(s.frameDelta)} мс (робота ${f1(s.frameWork)} мс)`,
      warn: s.frameDelta > 20,
    },
    { text: `джитер    ${f1(s.jitter)} мс, макс ${f1(s.maxDelta)} мс` },
    { text: `швидкість ${Math.round(speed)} px/s` },
    {
      text: `режим     ${mode.join(', ')}`,
      warn: EXP.interval || EXP.variable || EXP.block,
    },
  ];

  if (EXP.auto) {
    lines.push({
      text: autoResult
        ? `auto: x=${f1(autoResult.x)} y=${f1(autoResult.y)} (${autoResult.steps} кроків)`
        : `auto: летимо... ${f1(simTime)} с`,
    });
  }

  if (recording) {
    const sec = (performance.now() - recording.start) / 1000;
    lines.push({ text: `запис...  ${f1(sec)} / 10 с`, warn: true });
  } else if (lastRecording) {
    const r = lastRecording;
    lines.push({
      text: `запис: ${r.fps} fps, ${r.meanMs}±${r.stdMs} мс, макс ${r.maxMs}`,
    });
  }

  lines.push({ text: '←→/AD поворот, ↑/W тяга, H — HUD, R — запис 10 с' });
  return lines;
}

// ---------- запис статистики на 10 с (числа для README) ----------
function startRecording() {
  recording = { start: performance.now(), deltas: [], steps0: loop.stats.totalSteps };
}

function onFrame(stats, rawDelta) {
  if (!recording) return;
  recording.deltas.push(rawDelta);
  const elapsed = performance.now() - recording.start;
  if (elapsed < 10_000) return;

  const d = recording.deltas;
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  const std = Math.sqrt(d.reduce((a, x) => a + (x - mean) ** 2, 0) / d.length);
  lastRecording = {
    frames: d.length,
    fps: f1((d.length * 1000) / elapsed),
    meanMs: f1(mean),
    stdMs: f1(std),
    minMs: f1(Math.min(...d)),
    maxMs: f1(Math.max(...d)),
    over20ms: d.filter((x) => x > 20).length,
    steps: stats.totalSteps - recording.steps0,
    realSec: f1(elapsed / 1000),
  };
  console.table(lastRecording);
  recording = null;
}

// ---------- старт ----------
const loop = createLoop({
  step: 1 / 60,
  simulate,
  render,
  onFrame,
  scheduler: EXP.interval ? 'interval' : 'raf',
  fixedStep: !EXP.variable,
});

loop.start();
canvas.focus();
