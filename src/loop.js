// Ігровий цикл з фіксованим кроком (Glenn Fiedler, "Fix Your Timestep!").
// Симуляція: рівно 1/step разів на секунду. Рендер: стільки, скільки дає монітор.
//
// Опції для експериментів (М4):
//   scheduler: 'raf' (правильно) | 'interval' (експеримент 2: setInterval 16 мс)
//   fixedStep: true (правильно) | false (експеримент 3: змінний крок)

const JITTER_WINDOW = 120; // скільки останніх кадрів беремо для статистики

export function createLoop({
  step = 1 / 60,
  simulate,
  render,
  maxDelta = 0.25,
  scheduler = 'raf',
  fixedStep = true,
  onFrame = () => {},
}) {
  let running = false;
  let handle = null;
  let last = null;
  let accumulator = 0;

  // лічильники для "за секунду"
  let windowStart = 0;
  let stepsInWindow = 0;
  let framesInWindow = 0;
  const deltas = [];

  const stats = {
    stepsPerSec: 0,
    framesPerSec: 0,
    frameDelta: 0, // мс між двома кадрами
    frameWork: 0, // мс, які зайняв сам кадр (simulate + render)
    jitter: 0, // стандартне відхилення frameDelta, мс
    maxDelta: 0, // найдовший проміжок за останні кадри, мс
    totalSteps: 0,
    simTime: 0, // скільки секунд симуляції пройшло
  };

  function runStep(dt) {
    simulate(dt);
    stepsInWindow++;
    stats.totalSteps++;
    stats.simTime += dt;
  }

  function frame(now) {
    if (!running) return;

    // перший кадр: лише запам'ятовуємо час
    if (last === null) {
      last = now;
      windowStart = now;
      schedule();
      return;
    }

    const workStart = performance.now();
    const rawDelta = now - last;
    last = now;
    const dt = Math.min(rawDelta / 1000, maxDelta); // clamp: без "спіралі смерті"

    if (fixedStep) {
      accumulator += dt;
      while (accumulator >= step) {
        runStep(step);
        accumulator -= step;
      }
      render(accumulator / step); // alpha в [0, 1)
    } else {
      runStep(dt); // один крок довжиною "скільки пройшло"
      render(1); // інтерполювати нічого
    }

    framesInWindow++;
    updateStats(now, rawDelta);
    stats.frameWork = performance.now() - workStart;
    onFrame(stats, rawDelta);

    schedule();
  }

  function updateStats(now, rawDelta) {
    stats.frameDelta = rawDelta;
    deltas.push(rawDelta);
    if (deltas.length > JITTER_WINDOW) deltas.shift();

    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance = deltas.reduce((a, d) => a + (d - mean) ** 2, 0) / deltas.length;
    stats.jitter = Math.sqrt(variance);
    stats.maxDelta = Math.max(...deltas);

    const elapsed = now - windowStart;
    if (elapsed >= 1000) {
      stats.stepsPerSec = Math.round((stepsInWindow * 1000) / elapsed);
      stats.framesPerSec = Math.round((framesInWindow * 1000) / elapsed);
      stepsInWindow = 0;
      framesInWindow = 0;
      windowStart = now;
    }
  }

  function schedule() {
    if (scheduler === 'raf') handle = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = null;
    accumulator = 0;
    if (scheduler === 'raf') {
      handle = requestAnimationFrame(frame);
    } else {
      handle = setInterval(() => frame(performance.now()), 16);
    }
  }

  function stop() {
    running = false;
    if (scheduler === 'raf') cancelAnimationFrame(handle);
    else clearInterval(handle);
  }

  return { start, stop, stats };
}
