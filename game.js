const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const strokesEl = document.getElementById('strokes');
const messageEl = document.getElementById('message');

const W = canvas.width;
const H = canvas.height;

const ballStart = { x: 100, y: 250 };
const hole = { x: 700, y: 250, r: 14 };

const walls = [
  { x: 0,       y: 0,       w: W,  h: 20 },
  { x: 0,       y: H - 20,  w: W,  h: 20 },
  { x: 0,       y: 0,       w: 20, h: H },
  { x: W - 20,  y: 0,       w: 20, h: H },
  { x: 320,     y: 80,      w: 20, h: 220 },
  { x: 500,     y: 200,     w: 140, h: 20 },
];

const ball = { x: ballStart.x, y: ballStart.y, r: 8, vx: 0, vy: 0 };

const FRICTION = 0.985;
const MIN_SPEED = 0.05;
const MAX_DRAG = 180;
const POWER_PER_PIXEL = 0.08;
const SINK_SPEED = 4.5;

let strokes = 0;
let aiming = false;
let aimEnd = null;
let sunk = false;

function speed() { return Math.hypot(ball.vx, ball.vy); }
function isMoving() { return speed() > MIN_SPEED; }

function mouse(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
}

canvas.addEventListener('mousedown', (e) => {
  if (sunk || isMoving()) return;
  const m = mouse(e);
  const d = Math.hypot(m.x - ball.x, m.y - ball.y);
  if (d < 40) { aiming = true; aimEnd = m; }
});

canvas.addEventListener('mousemove', (e) => {
  if (!aiming) return;
  aimEnd = mouse(e);
});

canvas.addEventListener('mouseup', () => {
  if (!aiming) return;
  aiming = false;
  const dx = ball.x - aimEnd.x;
  const dy = ball.y - aimEnd.y;
  const dist = Math.min(Math.hypot(dx, dy), MAX_DRAG);
  if (dist < 5) return;
  const angle = Math.atan2(dy, dx);
  const power = dist * POWER_PER_PIXEL;
  ball.vx = Math.cos(angle) * power;
  ball.vy = Math.sin(angle) * power;
  strokes++;
  strokesEl.textContent = strokes;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') reset();
});

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function collideCircleRect(c, r) {
  const cx = clamp(c.x, r.x, r.x + r.w);
  const cy = clamp(c.y, r.y, r.y + r.h);
  const dx = c.x - cx;
  const dy = c.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= c.r * c.r) return;
  const d = Math.sqrt(d2) || 0.0001;
  const nx = dx / d;
  const ny = dy / d;
  const overlap = c.r - d;
  c.x += nx * overlap;
  c.y += ny * overlap;
  const dot = c.vx * nx + c.vy * ny;
  if (dot < 0) {
    c.vx -= 2 * dot * nx;
    c.vy -= 2 * dot * ny;
    c.vx *= 0.8;
    c.vy *= 0.8;
  }
}

function update() {
  if (sunk) return;

  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= FRICTION;
  ball.vy *= FRICTION;

  for (const w of walls) collideCircleRect(ball, w);

  const dh = Math.hypot(ball.x - hole.x, ball.y - hole.y);
  if (dh < hole.r && speed() < SINK_SPEED) {
    sunk = true;
    ball.vx = ball.vy = 0;
    ball.x = hole.x;
    ball.y = hole.y;
    messageEl.textContent = `Sunk in ${strokes}! Press R to play again.`;
  }

  if (!isMoving()) { ball.vx = 0; ball.vy = 0; }
}

function draw() {
  ctx.fillStyle = '#3aa647';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = 0; y < H; y += 12) ctx.fillRect(0, y, W, 1);

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5a3a1a';
  ctx.strokeStyle = '#3a2510';
  ctx.lineWidth = 2;
  for (const w of walls) {
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
  ctx.lineWidth = 1;

  if (!sunk) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (aiming && aimEnd && !isMoving()) {
    const dx = ball.x - aimEnd.x;
    const dy = ball.y - aimEnd.y;
    const dist = Math.min(Math.hypot(dx, dy), MAX_DRAG);
    const angle = Math.atan2(dy, dx);
    const ex = ball.x + Math.cos(angle) * dist;
    const ey = ball.y + Math.sin(angle) * dist;
    const t = dist / MAX_DRAG;
    ctx.strokeStyle = `rgba(${255},${Math.round(255 * (1 - t))},${Math.round(255 * (1 - t))},0.85)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function reset() {
  ball.x = ballStart.x;
  ball.y = ballStart.y;
  ball.vx = 0;
  ball.vy = 0;
  strokes = 0;
  sunk = false;
  aiming = false;
  strokesEl.textContent = strokes;
  messageEl.textContent = '';
}

(function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
})();
