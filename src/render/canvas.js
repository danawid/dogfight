// Canvas з урахуванням devicePixelRatio: реальних пікселів у dpr разів більше,
// ніж CSS-пікселів, інакше на retina все розмите.

export function setupCanvas(canvas, arena) {
  const ctx = canvas.getContext('2d');
  const view = { dpr: 1, cssWidth: 0, cssHeight: 0, scale: 1, offsetX: 0, offsetY: 0 };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    // вписуємо арену у вікно зі збереженням пропорцій (letterbox)
    const scale = Math.min(w / arena.width, h / arena.height);
    Object.assign(view, {
      dpr,
      cssWidth: w,
      cssHeight: h,
      scale,
      offsetX: (w - arena.width * scale) / 2,
      offsetY: (h - arena.height * scale) / 2,
    });
  }

  window.addEventListener('resize', resize);
  resize();
  return { ctx, view };
}
