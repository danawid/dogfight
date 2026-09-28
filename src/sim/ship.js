// Корабель — це просто дані. integrate() — чиста функція:
// (стан, команди, dt) -> новий стан. Жодного DOM, жодного canvas, жодного Math.random.

export const SHIP = {
  turnSpeed: 4, // рад/с
  thrust: 320, // прискорення, px/s²
  drag: 0.8, // частка швидкості, яку втрачаємо за секунду
  maxSpeed: 480, // px/s
  radius: 14, // для малювання (і зіткнень у наступних лабах)
};

export function createShip(x, y) {
  return { x, y, vx: 0, vy: 0, angle: -Math.PI / 2, thrust: false }; // носом угору
}

// controls = { turn: -1 | 0 | 1, thrust: boolean }
export function integrate(ship, controls, dt, cfg = SHIP) {
  const angle = normalizeAngle(ship.angle + controls.turn * cfg.turnSpeed * dt);

  let vx = ship.vx;
  let vy = ship.vy;

  if (controls.thrust) {
    vx += Math.cos(angle) * cfg.thrust * dt;
    vy += Math.sin(angle) * cfg.thrust * dt;
  }

  const damping = Math.max(0, 1 - cfg.drag * dt);
  vx *= damping;
  vy *= damping;

  const speed = Math.hypot(vx, vy);
  if (speed > cfg.maxSpeed) {
    vx *= cfg.maxSpeed / speed;
    vy *= cfg.maxSpeed / speed;
  }

  return {
    x: ship.x + vx * dt,
    y: ship.y + vy * dt,
    vx,
    vy,
    angle,
    thrust: controls.thrust,
  };
}

// кут у діапазоні [-π, π)
export function normalizeAngle(a) {
  const TWO_PI = Math.PI * 2;
  return ((((a + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
}
