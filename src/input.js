// Клавіатура як замикання: стан приватний, назовні — лише функції.

const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export function createInput(target = window) {
  const down = new Set(); // клавіші, які зараз затиснуті
  const pressed = new Set(); // клавіші, натиснуті після останнього endStep()

  function onKeyDown(e) {
    if (GAME_KEYS.has(e.code)) e.preventDefault(); // стрілки не скролять сторінку
    if (!e.repeat) pressed.add(e.code); // автоповтор ОС не рахується як нове натискання
    down.add(e.code);
  }

  function onKeyUp(e) {
    down.delete(e.code);
  }

  // вікно втратило фокус — keyup не прийде, тож "відпускаємо" все
  function onBlur() {
    down.clear();
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    isDown: (code) => down.has(code),
    // true рівно в одному кроці симуляції після натискання
    justPressed: (code) => pressed.has(code),
    // викликати після КОЖНОГО кроку симуляції (не кадру!)
    endStep: () => pressed.clear(),
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
