(function () {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rectContainsPoint(r, p, pad) {
    return p[0] >= r[0] - pad && p[0] <= r[0] + r[2] + pad &&
           p[1] >= r[1] - pad && p[1] <= r[1] + r[3] + pad;
  }

  function rectsOverlap(a, b, pad) {
    return !(a[0] + a[2] + pad < b[0] || b[0] + b[2] + pad < a[0] ||
             a[1] + a[3] + pad < b[1] || b[1] + b[3] + pad < a[1]);
  }

  function isReachable(course) {
    const cell = 10;
    const r = 10;
    const cw = Math.ceil(course.width / cell);
    const ch = Math.ceil(course.height / cell);
    const blocked = new Uint8Array(cw * ch);
    const idx = (cx, cy) => cy * cw + cx;

    for (let cx = 0; cx < cw; cx++) {
      for (let cy = 0; cy < ch; cy++) {
        const x = cx * cell, y = cy * cell;
        if (x < 20 + r || y < 20 + r ||
            x > course.width - 20 - r || y > course.height - 20 - r) {
          blocked[idx(cx, cy)] = 1;
        }
      }
    }
    for (const [wx, wy, ww, wh] of course.walls) {
      const x1 = Math.max(0, Math.floor((wx - r) / cell));
      const y1 = Math.max(0, Math.floor((wy - r) / cell));
      const x2 = Math.min(cw, Math.ceil((wx + ww + r) / cell));
      const y2 = Math.min(ch, Math.ceil((wy + wh + r) / cell));
      for (let cx = x1; cx < x2; cx++) {
        for (let cy = y1; cy < y2; cy++) blocked[idx(cx, cy)] = 1;
      }
    }

    const sx = Math.floor(course.ball[0] / cell);
    const sy = Math.floor(course.ball[1] / cell);
    const tx = Math.floor(course.hole[0] / cell);
    const ty = Math.floor(course.hole[1] / cell);
    if (blocked[idx(sx, sy)] || blocked[idx(tx, ty)]) return false;

    const visited = new Uint8Array(cw * ch);
    const queue = [sx, sy];
    visited[idx(sx, sy)] = 1;
    let head = 0;
    while (head < queue.length) {
      const cx = queue[head++], cy = queue[head++];
      if (cx === tx && cy === ty) return true;
      const ns = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dx, dy] of ns) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        if (blocked[idx(nx, ny)] || visited[idx(nx, ny)]) continue;
        visited[idx(nx, ny)] = 1;
        queue.push(nx, ny);
      }
    }
    return false;
  }

  function generateHole(rng, holeNum, difficulty) {
    const W = 800, H = 500;
    const ball = [
      80 + rng() * 80,
      80 + rng() * (H - 160),
    ];
    const hole = [
      W - 80 - rng() * 80,
      80 + rng() * (H - 160),
    ];

    const walls = [];
    const targetWalls = Math.min(5, 1 + Math.floor(difficulty + rng() * 2));
    for (let i = 0; i < targetWalls * 3 && walls.length < targetWalls; i++) {
      const vertical = rng() < 0.6;
      const ww = vertical ? 20 : 60 + rng() * 200;
      const wh = vertical ? 60 + rng() * 220 : 20;
      const wx = 180 + rng() * (W - 360 - ww);
      const wy = 60 + rng() * (H - 120 - wh);
      const r = [wx, wy, ww, wh];
      if (rectContainsPoint(r, ball, 30)) continue;
      if (rectContainsPoint(r, hole, 30)) continue;
      let bad = false;
      for (const w of walls) if (rectsOverlap(r, w, 30)) { bad = true; break; }
      if (!bad) walls.push(r);
    }

    const sand = [];
    const targetSand = Math.floor(rng() * (difficulty + 1));
    for (let i = 0; i < targetSand * 3 && sand.length < targetSand; i++) {
      const sw = 60 + rng() * 80;
      const sh = 50 + rng() * 60;
      const sx = 100 + rng() * (W - 200 - sw);
      const sy = 60 + rng() * (H - 120 - sh);
      const r = [sx, sy, sw, sh];
      if (rectContainsPoint(r, ball, 20)) continue;
      if (rectContainsPoint(r, hole, 20)) continue;
      sand.push(r);
    }

    const movers = [];
    const wantMover = holeNum >= 2 && rng() < 0.4 + difficulty * 0.15;
    if (wantMover) {
      for (let attempt = 0; attempt < 10 && movers.length === 0; attempt++) {
        const vertical = rng() < 0.5;
        const length = 60 + rng() * 80;
        const range = 120 + rng() * 200;
        const period = 200 + rng() * 160;
        const mw = vertical ? 20 : length;
        const mh = vertical ? length : 20;
        const axis = vertical ? 'y' : 'x';
        const mx = 240 + rng() * (W - 480 - mw);
        const my = 60 + rng() * (H - 120 - mh - (axis === 'y' ? range : 0));
        const seed = [mx, my, mw, mh];
        if (rectContainsPoint(seed, ball, 30)) continue;
        if (rectContainsPoint(seed, hole, 30)) continue;
        let bad = false;
        for (const w of walls) if (rectsOverlap(seed, w, 20)) { bad = true; break; }
        if (bad) continue;
        movers.push({ rect: seed, axis, range, period, phase: rng() });
      }
    }

    const dist = Math.hypot(hole[0] - ball[0], hole[1] - ball[1]);
    const obstacleScore = walls.length * 0.7 + sand.length * 0.4 + movers.length * 1.2;
    const par = Math.max(2, Math.min(6, Math.round(dist / 280 + obstacleScore + 1)));

    return {
      name: `Random #${holeNum}`,
      par,
      width: W,
      height: H,
      ball,
      hole,
      walls,
      sand,
      movers,
    };
  }

  function generateCourse(seed, count) {
    const rng = mulberry32(seed);
    const holes = [];
    count = count || 5;
    for (let i = 0; i < count; i++) {
      const difficulty = i / Math.max(1, count - 1);
      let chosen = null;
      for (let attempt = 0; attempt < 40; attempt++) {
        const h = generateHole(rng, i + 1, difficulty);
        if (isReachable(h)) { chosen = h; break; }
      }
      if (!chosen) {
        chosen = {
          name: `Random #${i + 1}`,
          par: 2, width: 800, height: 500,
          ball: [100, 250], hole: [700, 250],
          walls: [], sand: [], movers: [],
        };
      }
      holes.push(chosen);
    }
    return holes;
  }

  window.Procedural = { generateCourse, hashString };
})();
