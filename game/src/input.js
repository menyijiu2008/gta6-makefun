// Sunport Chase — keyboard and mouse input.
// Tracks held keys for movement and one-shot "pressed" edges for actions such as
// entering a car (E), pausing (P / Esc) and muting (M). Mouse position and clicks are
// exposed for the menus.

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyE: 'enter', Enter: 'confirm', Space: 'confirm',
  KeyC: 'continue', KeyR: 'restart',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute', KeyF: 'shove',
};

export function createInput(target) {
  const held = new Set();
  const pressedEdges = new Set();
  const mouse = { x: 0, y: 0, clicked: false };

  target.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') event.preventDefault();
    if (!held.has(action)) pressedEdges.add(action);
    held.add(action);
  });
  target.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) held.delete(action);
  });
  target.addEventListener('blur', () => { held.clear(); });
  target.addEventListener('mousemove', (event) => { mouse.x = event.clientX; mouse.y = event.clientY; });
  target.addEventListener('mousedown', () => { mouse.clicked = true; });

  return {
    mouse,
    down(action) { return held.has(action); },
    wasPressed(action) { return pressedEdges.has(action); },
    axisX() { return (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0); },
    axisY() { return (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0); },
    endFrame() { pressedEdges.clear(); mouse.clicked = false; },
  };
}
