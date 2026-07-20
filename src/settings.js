const KEY = "hn_mouse_sens_pct";
const FLOOR = 5;
let pct = 50;

try {
  const raw = localStorage.getItem(KEY);
  if (raw !== null) {
    const v = parseFloat(raw);
    if (Number.isFinite(v)) {
      pct = Math.min(100, Math.max(0, Math.round(v)));
    }
  }
} catch (e) {}

export function getMouseSensPct() {
  return pct;
}

export function setMouseSensPct(v) {
  if (!Number.isFinite(v)) {
    return;
  }
  pct = Math.min(100, Math.max(0, Math.round(v)));
  try {
    localStorage.setItem(KEY, String(pct));
  } catch (e) {}
}

export function getMouseSens() {
  return Math.max(pct, FLOOR) / 50;
}
