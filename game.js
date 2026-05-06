const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const strokesEl = document.getElementById('strokes');
const totalEl = document.getElementById('total');
const holeNumEl = document.getElementById('hole-num');
const parEl = document.getElementById('par');
const messageEl = document.getElementById('message');
const nextBtn = document.getElementById('next-btn');
const scorecardBody = document.getElementById('scorecard-body');
const designedBtn = document.getElementById('designed-btn');
const randomBtn = document.getElementById('random-btn');
const seedInput = document.getElementById('seed-input');
const seedDisplay = document.getElementById('seed-display');

const DESIGNED_COURSES = COURSES;

const HOLE_RADIUS = 14;
const BALL_RADIUS = 8;
const WALL_THICKNESS = 20;
const FRICTION = 0.985;
const SAND_FRICTION = 0.88;
const MIN_SPEED = 0.05;
const MAX_DRAG = 180;
const POWER_PER_PIXEL = 0.08;
const SINK_SPEED = 4.5;

let courseIdx = 0;
let scores = new Array(COURSES.length);
let course;
let ball;
let strokes;
let aiming = false;
let aimEnd = null;
let sunk = false;
let frame = 0;

function loadCourse(i) {
  courseIdx = i;
  course = COURSES[i];
  canvas.width = course.width;
  canvas.height = course.height;
  ball = { x: course.ball[0], y: course.ball[1], r: BALL_RADIUS, vx: 0, vy: 0 };
  strokes = 0;
  aiming = false;
  aimEnd = null;
  sunk = false;
  frame = 0;
  messageEl.textContent = '';
  nextBtn.hidden = true;
  updateHud();
}

function outerWalls() {
  const t = WALL_THICKNESS;
  return [
    [0, 0, course.width, t],
    [0, course.height - t, course.width, t],
    [0, 0, t, course.height],
    [course.width - t, 0, t, course.height],
  ];
}

function allWalls() {
  return outerWalls().concat(course.walls);
}

function moverRect(m, fr) {
  const [x, y, w, h] = m.rect;
  const phase = m.phase || 0;
  const off = (m.range / 2) * (1 - Math.cos(2 * Math.PI * (fr / m.period + phase)));
  return m.axis === 'x' ? [x + off, y, w, h] : [x, y + off, w, h];
}

function moverVelocity(m, fr) {
  const phase = m.phase || 0;
  const v = (m.range * Math.PI / m.period) * Math.sin(2 * Math.PI * (fr / m.period + phase));
  return m.axis === 'x' ? [v, 0] : [0, v];
}

function courseMovers() { return course.movers || []; }

function speed() { return Math.hypot(ball.vx, ball.vy); }
function isMoving() { return speed() > MIN_SPEED; }

function totalScore() {
  let n = 0;
  for (const s of scores) if (typeof s === 'number') n += s;
  return n;
}
function totalPar() {
  return COURSES.reduce((a, c) => a + c.par, 0);
}

function updateHud() {
  strokesEl.textContent = strokes;
  totalEl.textContent = totalScore();
  holeNumEl.textContent = `${courseIdx + 1}/${COURSES.length}`;
  parEl.textContent = course.par;
  renderScorecard();
}

function renderScorecard() {
  const cells = (label, get, isTotal) => {
    let s = `<tr><td>${label}</td>`;
    for (let i = 0; i < COURSES.length; i++) {
      const cls = i === courseIdx ? ' class="current"' : '';
      s += `<td${cls}>${get(i)}</td>`;
    }
    s += `<td class="total">${isTotal()}</td></tr>`;
    return s;
  };
  let head = '<tr><th>Hole</th>';
  for (let i = 0; i < COURSES.length; i++) head += `<th>${i + 1}</th>`;
  head += '<th>Total</th></tr>';
  const par = cells('Par', i => COURSES[i].par, () => totalPar());
  const you = cells(
    'You',
    i => {
      if (typeof scores[i] === 'number') return scores[i];
      if (i === courseIdx) return strokes;
      return '–';
    },
    () => totalScore()
  );
  scorecardBody.innerHTML = head + par + you;
}

function mouse(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
}

canvas.addEventListener('mousedown', (e) => {
  if (sunk || isMoving()) return;
  const m = mouse(e);
  if (Math.hypot(m.x - ball.x, m.y - ball.y) < 40) {
    aiming = true;
    aimEnd = m;
  }
});
canvas.addEventListener('mousemove', (e) => {
  if (aiming) aimEnd = mouse(e);
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
  updateHud();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    scores[courseIdx] = undefined;
    loadCourse(courseIdx);
  } else if ((e.key === 'n' || e.key === 'N') && sunk) {
    advance();
  }
});
nextBtn.addEventListener('click', advance);

function loadCourseSet(courses, label, activeBtn) {
  window.COURSES = courses;
  scores = new Array(courses.length);
  seedDisplay.textContent = label || '';
  designedBtn.classList.toggle('active', activeBtn === designedBtn);
  randomBtn.classList.toggle('active', activeBtn === randomBtn);
  loadCourse(0);
}

designedBtn.addEventListener('click', () => {
  loadCourseSet(DESIGNED_COURSES, '', designedBtn);
});

randomBtn.addEventListener('click', () => {
  const raw = seedInput.value.trim();
  let seed;
  if (raw) {
    const n = parseInt(raw, 10);
    seed = (Number.isFinite(n) && String(n) === raw) ? n : Procedural.hashString(raw);
  } else {
    seed = Math.floor(Math.random() * 1e9);
  }
  const courses = Procedural.generateCourse(seed, 5);
  loadCourseSet(courses, `Seed: ${raw || seed}`, randomBtn);
});

function advance() {
  if (courseIdx + 1 < COURSES.length) {
    loadCourse(courseIdx + 1);
  } else {
    scores = new Array(COURSES.length);
    loadCourse(0);
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function inAnyRect(x, y, rects) {
  for (const r of rects) {
    if (x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]) return true;
  }
  return false;
}

function collideCircleRect(c, rect, mv) {
  const [rx, ry, rw, rh] = rect;
  const cx = clamp(c.x, rx, rx + rw);
  const cy = clamp(c.y, ry, ry + rh);
  const dx = c.x - cx;
  const dy = c.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= c.r * c.r) return;
  const d = Math.sqrt(d2) || 0.0001;
  const nx = dx / d;
  const ny = dy / d;
  c.x += nx * (c.r - d);
  c.y += ny * (c.r - d);
  const dot = c.vx * nx + c.vy * ny;
  if (dot < 0) {
    c.vx -= 2 * dot * nx;
    c.vy -= 2 * dot * ny;
    c.vx *= 0.8;
    c.vy *= 0.8;
  }
  if (mv) {
    const md = mv[0] * nx + mv[1] * ny;
    if (md > 0) {
      c.vx += md * nx;
      c.vy += md * ny;
    }
  }
}

function update() {
  frame++;
  if (sunk) return;

  ball.x += ball.vx;
  ball.y += ball.vy;

  const onSand = inAnyRect(ball.x, ball.y, course.sand);
  const f = onSand ? SAND_FRICTION : FRICTION;
  ball.vx *= f;
  ball.vy *= f;

  for (const w of allWalls()) collideCircleRect(ball, w);
  for (const m of courseMovers()) {
    collideCircleRect(ball, moverRect(m, frame), moverVelocity(m, frame));
  }

  const [hx, hy] = course.hole;
  if (Math.hypot(ball.x - hx, ball.y - hy) < HOLE_RADIUS && speed() < SINK_SPEED) {
    onSink();
    return;
  }

  if (!isMoving()) { ball.vx = 0; ball.vy = 0; }
}

function onSink() {
  sunk = true;
  ball.vx = ball.vy = 0;
  ball.x = course.hole[0];
  ball.y = course.hole[1];
  scores[courseIdx] = strokes;
  updateHud();

  const par = course.par;
  const diff = strokes - par;
  let label;
  if (strokes === 1) label = 'Hole in one!';
  else if (diff <= -2) label = 'Eagle!';
  else if (diff === -1) label = 'Birdie!';
  else if (diff === 0) label = 'Par.';
  else if (diff === 1) label = 'Bogey.';
  else label = `${diff > 0 ? '+' : ''}${diff}`;

  if (courseIdx + 1 < COURSES.length) {
    messageEl.textContent = `${label} (${strokes} strokes)`;
    nextBtn.textContent = 'Next hole →';
    nextBtn.hidden = false;
  } else {
    const total = totalScore();
    const tp = totalPar();
    const td = total - tp;
    const tdStr = td === 0 ? 'even' : (td > 0 ? `+${td}` : `${td}`);
    messageEl.textContent = `Course complete — ${total} (${tdStr})`;
    nextBtn.textContent = 'Play again ↺';
    nextBtn.hidden = false;
  }
}

function drawSand() {
  ctx.fillStyle = '#e8c878';
  for (const [x, y, w, h] of course.sand) ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(120,80,30,0.45)';
  for (const [x, y, w, h] of course.sand) {
    for (let dx = 4; dx < w; dx += 8) {
      for (let dy = 4; dy < h; dy += 8) {
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }
}

function drawWalls() {
  ctx.fillStyle = '#5a3a1a';
  ctx.strokeStyle = '#3a2510';
  ctx.lineWidth = 2;
  for (const [x, y, w, h] of allWalls()) {
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  ctx.lineWidth = 1;
}

function drawMovers() {
  ctx.fillStyle = '#c14242';
  ctx.strokeStyle = '#7a2222';
  ctx.lineWidth = 2;
  for (const m of courseMovers()) {
    const [x, y, w, h] = moverRect(m, frame);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  ctx.lineWidth = 1;
}

function draw() {
  ctx.fillStyle = '#3aa647';
  ctx.fillRect(0, 0, course.width, course.height);

  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < course.height; y += 12) ctx.fillRect(0, y, course.width, 1);

  drawSand();

  const [hx, hy] = course.hole;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(hx + 2, hy + 2, HOLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hx, hy, HOLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  drawWalls();
  drawMovers();

  if (!sunk) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (aiming && aimEnd && !isMoving() && !sunk) {
    const dx = ball.x - aimEnd.x;
    const dy = ball.y - aimEnd.y;
    const dist = Math.min(Math.hypot(dx, dy), MAX_DRAG);
    const angle = Math.atan2(dy, dx);
    const ex = ball.x + Math.cos(angle) * dist;
    const ey = ball.y + Math.sin(angle) * dist;
    const t = dist / MAX_DRAG;
    const g = Math.round(255 * (1 - t));
    ctx.strokeStyle = `rgba(255,${g},${g},0.85)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

loadCourse(0);

(function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
})();
