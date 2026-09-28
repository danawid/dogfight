// Арена має фіксований розмір у "світових" пікселях — не залежить від вікна.
// Інакше гравці з різними моніторами жили б у різних світах (важливо для Lab 5).

export const ARENA = { width: 1600, height: 900 };

export function wrap(ship, arena = ARENA) {
  return {
    ...ship,
    x: mod(ship.x, arena.width),
    y: mod(ship.y, arena.height),
  };
}

function mod(v, m) {
  return ((v % m) + m) % m;
}
