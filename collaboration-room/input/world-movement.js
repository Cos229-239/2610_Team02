/**
 * Towerflow Foundry — world-locked WASD movement.
 * Camera heading NEVER changes the movement axes.
 * Coordinate system: x grows right, z grows down/south.
 */
export function movementVector(pressed, sprint = false) {
  const has = (k) => pressed.has(k.toLowerCase());
  let x = Number(has("d")) - Number(has("a"));
  let z = Number(has("s")) - Number(has("w"));
  const magnitude = Math.hypot(x, z);
  if (magnitude) { x /= magnitude; z /= magnitude; }
  return { x, z, speedMultiplier: sprint || has("shift") ? 2 : 1 };
}
export function moveWorld(position, pressed, seconds, options = {}) {
  const { walkSpeed = 5, sprintMultiplier = 2, bounds = { minX:-19.5,maxX:19.5,minZ:-14.5,maxZ:14.5 } } = options;
  const {x,z,speedMultiplier} = movementVector(pressed);
  const speed = walkSpeed * (speedMultiplier === 2 ? sprintMultiplier : 1);
  const dt = Math.max(0, Math.min(Number(seconds)||0, 0.1));
  return {
    ...position,
    x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x + x*speed*dt)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, position.z + z*speed*dt))
  };
}
// Only capture navigation keys when the user is not typing in a UI.
export function isTypingTarget(target) {
  return Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]'));
}
export function installWorldInput({ target = window, onInteract, onMenu, onChat } = {}) {
  const pressed = new Set();
  const bound = new Set(["w","a","s","d","shift","i","j","k","l","e","m","t"]);
  const down = e => {
    if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (!bound.has(key)) return;
    e.preventDefault();
    pressed.add(key);
    if (e.repeat) return;
    if (key === "e") onInteract?.();
    if (key === "m") onMenu?.();
    if (key === "t") onChat?.();
  };
  const up = e => pressed.delete(e.key.toLowerCase());
  const clear = () => pressed.clear();
  target.addEventListener("keydown",down);
  target.addEventListener("keyup",up);
  target.addEventListener("blur",clear);
  return { pressed, dispose() {
    target.removeEventListener("keydown",down);
    target.removeEventListener("keyup",up);
    target.removeEventListener("blur",clear);
  }};
}
