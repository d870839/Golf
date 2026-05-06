import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const HOLE_COUNT = 9;

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todaySeed() {
  return window.Procedural.hashString(todayStr());
}

function getDailyCourses() {
  return window.Procedural.generateCourse(todaySeed(), HOLE_COUNT);
}

const cfg = window.FIREBASE_CONFIG;
const isConfigured = !!(cfg && cfg.projectId && cfg.projectId !== 'REPLACE_ME');

let db = null;
if (isConfigured) {
  try {
    const app = initializeApp(cfg);
    db = getFirestore(app);
  } catch (e) {
    console.error('Firebase init failed:', e);
  }
}

async function submitScore(name, score) {
  if (!db) throw new Error('Leaderboard not configured');
  await addDoc(collection(db, 'scores'), {
    name,
    score,
    date: todayStr(),
    seed: todaySeed(),
    ts: serverTimestamp(),
  });
}

async function fetchTop(n) {
  if (!db) return [];
  const q = query(
    collection(db, 'scores'),
    where('date', '==', todayStr()),
    orderBy('score', 'asc'),
    limit(n || 5),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

const dom = {
  panel: document.getElementById('leaderboard'),
  date: document.getElementById('lb-date'),
  body: document.getElementById('lb-body'),
  empty: document.getElementById('lb-empty'),
  warning: document.getElementById('lb-warning'),
  submit: document.getElementById('submit-panel'),
  name: document.getElementById('player-name'),
  submitBtn: document.getElementById('submit-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  status: document.getElementById('submit-status'),
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function refreshLeaderboard() {
  dom.date.textContent = todayStr();
  if (!isConfigured) {
    dom.warning.textContent = 'Leaderboard not configured. See README for Firebase setup.';
    dom.warning.hidden = false;
    dom.empty.hidden = true;
    dom.body.innerHTML = '';
    return;
  }
  dom.warning.hidden = true;
  try {
    const top = await fetchTop(5);
    if (top.length === 0) {
      dom.body.innerHTML = '';
      dom.empty.hidden = false;
    } else {
      dom.empty.hidden = true;
      dom.body.innerHTML = top.map((s, i) => `
        <tr>
          <td class="rank">${i + 1}.</td>
          <td class="name">${escapeHtml(s.name)}</td>
          <td class="score">${s.score}</td>
        </tr>
      `).join('');
    }
  } catch (e) {
    dom.warning.textContent = `Leaderboard error: ${e.message}`;
    dom.warning.hidden = false;
  }
}

function start() {
  dom.panel.hidden = false;
  refreshLeaderboard();
}

function stop() {
  dom.panel.hidden = true;
  dom.submit.hidden = true;
  dom.status.textContent = '';
}

function showSubmit(score) {
  dom.submit.hidden = false;
  dom.submit.dataset.score = String(score);
  dom.status.textContent = '';
  if (!dom.name.value) {
    dom.name.value = localStorage.getItem('playerName') || '';
  }
  if (!isConfigured) {
    dom.status.textContent = 'Configure Firebase to submit.';
  }
}

dom.submitBtn.addEventListener('click', async () => {
  const name = dom.name.value.trim();
  const score = parseInt(dom.submit.dataset.score, 10);
  if (!name) { dom.status.textContent = 'Enter your name first.'; return; }
  if (!Number.isFinite(score)) { dom.status.textContent = 'No score to submit.'; return; }
  if (!isConfigured) { dom.status.textContent = 'Firebase not configured.'; return; }
  localStorage.setItem('playerName', name);
  dom.submitBtn.disabled = true;
  dom.status.textContent = 'Submitting...';
  try {
    await submitScore(name, score);
    dom.status.textContent = 'Submitted!';
    await refreshLeaderboard();
  } catch (e) {
    dom.status.textContent = `Error: ${e.message}`;
  } finally {
    dom.submitBtn.disabled = false;
  }
});

dom.refreshBtn.addEventListener('click', refreshLeaderboard);

window.Daily = {
  isConfigured,
  todayStr,
  todaySeed,
  getDailyCourses,
  start,
  stop,
  showSubmit,
};
