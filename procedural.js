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

  function simulateShot(course, theta, power, maxFrames) {
    const W = course.width, H = course.height, T = 20;
    const walls = [
      [0, 0, W, T], [0, H - T, W, T], [0, 0, T, H], [W - T, 0, T, H],
      ...(course.walls || []),
    ];
    const segments = course.segments || [];
    const sand = course.sand || [];
    const hole = course.hole;
    const BR = 10, HR = 14, SINK = 4.5, FR = 0.985, SFR = 0.88, MIN = 0.05;

    let bx = course.ball[0], by = course.ball[1];
    let bvx = Math.cos(theta) * power;
    let bvy = Math.sin(theta) * power;

    for (let f = 0; f < maxFrames; f++) {
      bx += bvx; by += bvy;
      let onSand = false;
      for (const [sx, sy, sw, sh] of sand) {
        if (bx >= sx && bx <= sx + sw && by >= sy && by <= sy + sh) { onSand = true; break; }
      }
      const fric = onSand ? SFR : FR;
      bvx *= fric; bvy *= fric;
      for (const [rx, ry, rw, rh] of walls) {
        const cx = Math.max(rx, Math.min(bx, rx + rw));
        const cy = Math.max(ry, Math.min(by, ry + rh));
        const dx = bx - cx, dy = by - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < BR * BR) {
          const d = Math.sqrt(d2) || 0.0001;
          const nx = dx / d, ny = dy / d;
          bx += nx * (BR - d); by += ny * (BR - d);
          const dot = bvx * nx + bvy * ny;
          if (dot < 0) { bvx -= 2 * dot * nx; bvy -= 2 * dot * ny; bvx *= 0.8; bvy *= 0.8; }
        }
      }
      for (const [x1, y1, x2, y2, thickness] of segments) {
        const r = BR + thickness / 2;
        const sdx = x2 - x1, sdy = y2 - y1;
        const len2 = sdx * sdx + sdy * sdy || 1;
        let st = ((bx - x1) * sdx + (by - y1) * sdy) / len2;
        st = Math.max(0, Math.min(1, st));
        const px = x1 + st * sdx, py = y1 + st * sdy;
        const ddx = bx - px, ddy = by - py;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 0.0001;
          const nx = ddx / d, ny = ddy / d;
          bx += nx * (r - d); by += ny * (r - d);
          const dot = bvx * nx + bvy * ny;
          if (dot < 0) { bvx -= 2 * dot * nx; bvy -= 2 * dot * ny; bvx *= 0.8; bvy *= 0.8; }
        }
      }
      const dhx = bx - hole[0], dhy = by - hole[1];
      const sp2 = bvx * bvx + bvy * bvy;
      if (dhx * dhx + dhy * dhy < HR * HR && sp2 < SINK * SINK) return true;
      if (sp2 < MIN * MIN) return false;
    }
    return false;
  }

  function canHoleInOne(course) {
    const MAX_DRAG = 180;
    const POWER_PER_PIXEL = 0.08;
    const MAX_POWER = MAX_DRAG * POWER_PER_PIXEL;
    const W = course.width, H = course.height;
    const bx = course.ball[0], by = course.ball[1];
    const angles = 90;
    const powers = [4, 7, 10, 13, MAX_POWER];
    for (let a = 0; a < angles; a++) {
      const theta = (a / angles) * 2 * Math.PI;
      // Player drags opposite to shot direction. Drag must stay inside canvas.
      const ddx = -Math.cos(theta), ddy = -Math.sin(theta);
      let edgeDist = Infinity;
      if (ddx > 0.0001) edgeDist = Math.min(edgeDist, (W - bx) / ddx);
      else if (ddx < -0.0001) edgeDist = Math.min(edgeDist, -bx / ddx);
      if (ddy > 0.0001) edgeDist = Math.min(edgeDist, (H - by) / ddy);
      else if (ddy < -0.0001) edgeDist = Math.min(edgeDist, -by / ddy);
      const effMaxDrag = Math.min(MAX_DRAG, edgeDist);
      const effMaxPower = effMaxDrag * POWER_PER_PIXEL;
      for (const p of powers) {
        if (p > effMaxPower) continue;
        if (simulateShot(course, theta, p, 400)) return true;
      }
    }
    return false;
  }

  function losBlocked(ball, hole, walls, segments, ballR) {
    const dx = hole[0] - ball[0], dy = hole[1] - ball[1];
    const len = Math.hypot(dx, dy);
    const steps = Math.max(20, Math.ceil(len / 5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = ball[0] + t * dx;
      const py = ball[1] + t * dy;
      for (const [wx, wy, ww, wh] of walls) {
        const cx = Math.max(wx, Math.min(px, wx + ww));
        const cy = Math.max(wy, Math.min(py, wy + wh));
        if (Math.hypot(px - cx, py - cy) < ballR) return true;
      }
      for (const [x1, y1, x2, y2, thickness] of segments) {
        const sdx = x2 - x1, sdy = y2 - y1;
        const slen2 = sdx * sdx + sdy * sdy || 1;
        let st = ((px - x1) * sdx + (py - y1) * sdy) / slen2;
        st = Math.max(0, Math.min(1, st));
        const sxx = x1 + st * sdx, syy = y1 + st * sdy;
        if (Math.hypot(px - sxx, py - syy) < ballR + thickness / 2) return true;
      }
    }
    return false;
  }

  function pointInCorridor(p, ball, hole, width) {
    const dx = hole[0] - ball[0], dy = hole[1] - ball[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return true;
    const t = ((p[0] - ball[0]) * dx + (p[1] - ball[1]) * dy) / len2;
    if (t < -0.05 || t > 1.05) return false;
    const px = ball[0] + t * dx, py = ball[1] + t * dy;
    return Math.hypot(p[0] - px, p[1] - py) < width;
  }

  function blockSegment(blocked, cell, r, cw, ch, seg) {
    const [x1, y1, x2, y2, thickness] = seg;
    const radius = thickness / 2 + r;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.ceil(len / (cell * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const fx = x1 + (dx * i) / steps;
      const fy = y1 + (dy * i) / steps;
      const c1 = Math.max(0, Math.floor((fx - radius) / cell));
      const c2 = Math.min(cw, Math.ceil((fx + radius) / cell));
      const r1 = Math.max(0, Math.floor((fy - radius) / cell));
      const r2 = Math.min(ch, Math.ceil((fy + radius) / cell));
      for (let cx = c1; cx < c2; cx++) {
        for (let cy = r1; cy < r2; cy++) {
          const ccx = cx * cell + cell / 2;
          const ccy = cy * cell + cell / 2;
          if (Math.hypot(ccx - fx, ccy - fy) <= radius) {
            blocked[cy * cw + cx] = 1;
          }
        }
      }
    }
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
    for (const seg of (course.segments || [])) {
      blockSegment(blocked, cell, r, cw, ch, seg);
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
    const CORRIDOR = 150;
    const ball = [
      80 + rng() * 80,
      80 + rng() * (H - 160),
    ];
    const hole = [
      W - 80 - rng() * 80,
      80 + rng() * (H - 160),
    ];

    const walls = [];
    const segments = [];
    const targetWalls = Math.min(4, 1 + Math.floor(difficulty + rng() * 2));
    for (let i = 0; i < targetWalls * 4 && walls.length < targetWalls; i++) {
      const vertical = rng() < 0.6;
      const ww = vertical ? 20 : 60 + rng() * 200;
      const wh = vertical ? 60 + rng() * 220 : 20;
      const wx = 60 + rng() * (W - 120 - ww);
      const wy = 60 + rng() * (H - 120 - wh);
      const r = [wx, wy, ww, wh];
      const center = [wx + ww / 2, wy + wh / 2];
      if (!pointInCorridor(center, ball, hole, CORRIDOR)) continue;
      if (rectContainsPoint(r, ball, 30)) continue;
      if (rectContainsPoint(r, hole, 30)) continue;
      let bad = false;
      for (const w of walls) if (rectsOverlap(r, w, 30)) { bad = true; break; }
      if (!bad) walls.push(r);
    }

    const targetSegments = rng() < 0.3 + difficulty * 0.5 ? 1 + Math.floor(rng() * 2) : 0;
    for (let i = 0; i < targetSegments * 6 && segments.length < targetSegments; i++) {
      const cx = 80 + rng() * (W - 160);
      const cy = 80 + rng() * (H - 160);
      const angle = rng() * Math.PI;
      const length = 80 + rng() * 180;
      const half = length / 2;
      const dx = Math.cos(angle) * half;
      const dy = Math.sin(angle) * half;
      const x1 = cx - dx, y1 = cy - dy;
      const x2 = cx + dx, y2 = cy + dy;
      if (!pointInCorridor([cx, cy], ball, hole, CORRIDOR)) continue;
      if (Math.min(x1, x2) < 30 || Math.max(x1, x2) > W - 30) continue;
      if (Math.min(y1, y2) < 30 || Math.max(y1, y2) > H - 30) continue;
      if (Math.hypot(x1 - ball[0], y1 - ball[1]) < 50) continue;
      if (Math.hypot(x2 - ball[0], y2 - ball[1]) < 50) continue;
      if (Math.hypot(x1 - hole[0], y1 - hole[1]) < 50) continue;
      if (Math.hypot(x2 - hole[0], y2 - hole[1]) < 50) continue;
      segments.push([x1, y1, x2, y2, 16]);
    }

    const sand = [];
    const targetSand = Math.floor(rng() * (difficulty + 1));
    for (let i = 0; i < targetSand * 4 && sand.length < targetSand; i++) {
      const sw = 60 + rng() * 80;
      const sh = 50 + rng() * 60;
      const sx = 60 + rng() * (W - 120 - sw);
      const sy = 60 + rng() * (H - 120 - sh);
      const r = [sx, sy, sw, sh];
      const center = [sx + sw / 2, sy + sh / 2];
      if (!pointInCorridor(center, ball, hole, CORRIDOR)) continue;
      if (rectContainsPoint(r, ball, 20)) continue;
      if (rectContainsPoint(r, hole, 20)) continue;
      sand.push(r);
    }

    const movers = [];
    const wantMover = holeNum >= 2 && rng() < 0.4 + difficulty * 0.15;
    if (wantMover) {
      for (let attempt = 0; attempt < 12 && movers.length === 0; attempt++) {
        const vertical = rng() < 0.5;
        const length = 60 + rng() * 80;
        const range = 120 + rng() * 200;
        const period = 200 + rng() * 160;
        const mw = vertical ? 20 : length;
        const mh = vertical ? length : 20;
        const axis = vertical ? 'y' : 'x';
        const mx = 60 + rng() * (W - 120 - mw - (axis === 'x' ? range : 0));
        const my = 60 + rng() * (H - 120 - mh - (axis === 'y' ? range : 0));
        const seed = [mx, my, mw, mh];
        const midCenter = [
          mx + mw / 2 + (axis === 'x' ? range / 2 : 0),
          my + mh / 2 + (axis === 'y' ? range / 2 : 0),
        ];
        if (!pointInCorridor(midCenter, ball, hole, CORRIDOR + 40)) continue;
        if (rectContainsPoint(seed, ball, 30)) continue;
        if (rectContainsPoint(seed, hole, 30)) continue;
        let bad = false;
        for (const w of walls) if (rectsOverlap(seed, w, 20)) { bad = true; break; }
        if (bad) continue;
        movers.push({ rect: seed, axis, range, period, phase: rng() });
      }
    }

    const dist = Math.hypot(hole[0] - ball[0], hole[1] - ball[1]);
    const obstacleScore = walls.length * 0.7 + sand.length * 0.4 + movers.length * 1.2 + segments.length * 0.6;
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
      segments,
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
      for (let attempt = 0; attempt < 80; attempt++) {
        const h = generateHole(rng, i + 1, difficulty);
        if (!isReachable(h)) continue;
        if (canHoleInOne(h)) { chosen = h; break; }
      }
      if (!chosen) {
        chosen = {
          name: `Random #${i + 1}`,
          par: 2, width: 800, height: 500,
          ball: [400, 250], hole: [550, 250],
          walls: [], sand: [], segments: [], movers: [],
        };
      }
      holes.push(chosen);
    }
    return holes;
  }

  window.Procedural = { generateCourse, hashString };
})();
