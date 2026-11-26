const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const INF = 1000000;

const Move = Object.freeze({
  Up: 0,
  Down: 1,
  Left: 2,
  Right: 3,
  None: 4,
});

const MOVES = [Move.Up, Move.Down, Move.Left, Move.Right];

function moveName(m) {
  switch (m) {
    case Move.Up:
      return "Up";
    case Move.Down:
      return "Down";
    case Move.Left:
      return "Left";
    case Move.Right:
      return "Right";
    default:
      return "None";
  }
}

function opposite(m) {
  switch (m) {
    case Move.Up:
      return Move.Down;
    case Move.Down:
      return Move.Up;
    case Move.Left:
      return Move.Right;
    case Move.Right:
      return Move.Left;
    default:
      return Move.None;
  }
}

function validateBoard(b) {
  if (!Array.isArray(b) || b.length !== 9) {
    return { ok: false, error: "El tablero debe tener exactamente 9 valores." };
  }
  const seen = new Uint8Array(9);
  for (let i = 0; i < 9; ++i) {
    const v = b[i];
    if (!Number.isInteger(v) || v < 0 || v > 8) {
      return {
        ok: false,
        error: "Cada casilla debe ser un entero entre 0 y 8.",
      };
    }
    if (seen[v] !== 0) {
      return { ok: false, error: "Valor duplicado en el tablero: " + v + "." };
    }
    seen[v] = 1;
  }
  return { ok: true, error: "" };
}

function assertValidBoard(b) {
  const check = validateBoard(b);
  if (!check.ok) {
    throw new Error(check.error);
  }
}

function parseBoardInput(text) {
  const cleaned = text.replace(/[\[\]]/g, " ").trim();
  if (cleaned.length === 0) {
    return { ok: false, board: null, error: "Ingresa 9 numeros del 0 al 8." };
  }
  const tokens = cleaned.split(/[\s,;]+/).filter(Boolean);
  if (tokens.length !== 9) {
    return {
      ok: false,
      board: null,
      error:
        "Se requieren exactamente 9 numeros separados por espacios o comas.",
    };
  }
  const board = [];
  for (let i = 0; i < 9; ++i) {
    if (!/^\d+$/.test(tokens[i])) {
      return {
        ok: false,
        board: null,
        error: "Token invalido: " + tokens[i] + ".",
      };
    }
    board.push(Number(tokens[i]));
  }
  const check = validateBoard(board);
  if (!check.ok) {
    return { ok: false, board: null, error: check.error };
  }
  return { ok: true, board, error: "" };
}

function distance1D(a, b) {
  return a > b ? a - b : b - a;
}

function isGoal(b) {
  for (let i = 0; i < 9; ++i) {
    if (b[i] !== GOAL[i]) return false;
  }
  return true;
}

function blankIndex(b) {
  for (let i = 0; i < 9; ++i) {
    if (b[i] === 0) return i;
  }
  return -1;
}

function applyMove(b, m) {
  const blank = blankIndex(b);
  if (blank < 0) return null;
  const row = (blank / 3) | 0;
  const col = blank % 3;
  let target = -1;

  switch (m) {
    case Move.Up:
      if (row === 0) return null;
      target = blank - 3;
      break;
    case Move.Down:
      if (row === 2) return null;
      target = blank + 3;
      break;
    case Move.Left:
      if (col === 0) return null;
      target = blank - 1;
      break;
    case Move.Right:
      if (col === 2) return null;
      target = blank + 1;
      break;
    default:
      return null;
  }

  const out = b.slice();
  out[blank] = out[target];
  out[target] = 0;
  return out;
}

function moveForTileClick(b, tileIndex) {
  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex > 8)
    return Move.None;
  const blank = blankIndex(b);
  if (blank < 0 || tileIndex === blank) return Move.None;
  const bRow = (blank / 3) | 0;
  const bCol = blank % 3;
  const tRow = (tileIndex / 3) | 0;
  const tCol = tileIndex % 3;

  if (tRow === bRow - 1 && tCol === bCol) return Move.Up;
  if (tRow === bRow + 1 && tCol === bCol) return Move.Down;
  if (tRow === bRow && tCol === bCol - 1) return Move.Left;
  if (tRow === bRow && tCol === bCol + 1) return Move.Right;
  return Move.None;
}

function forEachMove(b, fn) {
  for (let i = 0; i < 4; ++i) {
    const m = MOVES[i];
    const next = applyMove(b, m);
    if (next !== null) {
      if (!fn(next, m)) return false;
    }
  }
  return true;
}

function solvable(b) {
  assertValidBoard(b);
  let inversions = 0;
  for (let i = 0; i < 9; ++i) {
    if (b[i] === 0) continue;
    for (let j = i + 1; j < 9; ++j) {
      if (b[j] !== 0 && b[i] > b[j]) ++inversions;
    }
  }
  return inversions % 2 === 0;
}

function manhattan(b) {
  let total = 0;
  for (let i = 0; i < 9; ++i) {
    const tile = b[i];
    if (tile === 0) continue;
    const goal = tile - 1;
    total +=
      distance1D((i / 3) | 0, (goal / 3) | 0) + distance1D(i % 3, goal % 3);
  }
  return total;
}

function boardHash(b) {
  let code = 0;
  let multiplier = 1;
  for (let i = 0; i < 9; ++i) {
    code += b[i] * multiplier;
    multiplier *= 9;
  }
  return code;
}

function createMetrics() {
  return {
    expanded: 0,
    generated: 0,
    maxFrontier: 0,
    ms: 0,
    note(n) {
      if (n > this.maxFrontier) this.maxFrontier = n;
    },
  };
}

function createResult() {
  return {
    solved: false,
    cost: 0,
    path: [],
    metrics: createMetrics(),
  };
}

class MinHeap {
  constructor(compare) {
    this.data = [];
    this.compare = compare;
  }

  size() {
    return this.data.length;
  }

  empty() {
    return this.data.length === 0;
  }

  push(val) {
    this.data.push(val);
    let i = this.data.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.compare(this.data[i], this.data[p])) break;
      const tmp = this.data[i];
      this.data[i] = this.data[p];
      this.data[p] = tmp;
      i = p;
    }
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      const n = this.data.length;
      while (true) {
        let best = i;
        const l = (i << 1) + 1;
        const r = l + 1;
        if (l < n && this.compare(this.data[l], this.data[best])) best = l;
        if (r < n && this.compare(this.data[r], this.data[best])) best = r;
        if (best === i) break;
        const tmp = this.data[i];
        this.data[i] = this.data[best];
        this.data[best] = tmp;
        i = best;
      }
    }
    return top;
  }
}

function fOf(n) {
  return n.g + n.h;
}

function buildPath(nodes, index) {
  const path = [];
  while (nodes[index].parent !== -1) {
    path.push(nodes[index].move);
    index = nodes[index].parent;
  }
  path.reverse();
  return path;
}

function gbfs(start) {
  assertValidBoard(start);
  const r = createResult();
  r.metrics.generated = 1;

  if (isGoal(start)) {
    r.solved = true;
    return r;
  }
  if (!solvable(start)) return r;

  const nodes = [
    { state: start, parent: -1, move: Move.None, g: 0, h: manhattan(start) },
  ];
  const frontier = new MinHeap((a, b) => {
    if (nodes[a].h !== nodes[b].h) return nodes[a].h < nodes[b].h;
    return nodes[a].g < nodes[b].g;
  });
  frontier.push(0);
  r.metrics.note(frontier.size());

  const closed = new Set();

  while (!frontier.empty()) {
    const cur = frontier.pop();
    const curKey = boardHash(nodes[cur].state);
    if (closed.has(curKey)) continue;
    closed.add(curKey);
    ++r.metrics.expanded;

    if (isGoal(nodes[cur].state)) {
      r.solved = true;
      r.cost = nodes[cur].g;
      r.path = buildPath(nodes, cur);
      break;
    }

    const current = nodes[cur].state;
    const parentG = nodes[cur].g;
    forEachMove(current, (next, mv) => {
      if (closed.has(boardHash(next))) return true;
      ++r.metrics.generated;
      nodes.push({
        state: next,
        parent: cur,
        move: mv,
        g: parentG + 1,
        h: manhattan(next),
      });
      frontier.push(nodes.length - 1);
      return true;
    });
    r.metrics.note(frontier.size());
  }
  return r;
}

function aStar(start) {
  assertValidBoard(start);
  const r = createResult();
  r.metrics.generated = 1;

  if (isGoal(start)) {
    r.solved = true;
    return r;
  }
  if (!solvable(start)) return r;

  const nodes = [
    { state: start, parent: -1, move: Move.None, g: 0, h: manhattan(start) },
  ];
  const frontier = new MinHeap((a, b) => {
    const fa = fOf(nodes[a]);
    const fb = fOf(nodes[b]);
    if (fa !== fb) return fa < fb;
    return nodes[a].h < nodes[b].h;
  });
  frontier.push(0);
  r.metrics.note(frontier.size());

  const bestG = new Map();
  bestG.set(boardHash(start), 0);

  while (!frontier.empty()) {
    const cur = frontier.pop();
    const curKey = boardHash(nodes[cur].state);
    const knownCur = bestG.get(curKey);
    if (knownCur === undefined || knownCur !== nodes[cur].g) continue;
    ++r.metrics.expanded;

    if (isGoal(nodes[cur].state)) {
      r.solved = true;
      r.cost = nodes[cur].g;
      r.path = buildPath(nodes, cur);
      break;
    }

    const current = nodes[cur].state;
    const parentG = nodes[cur].g;
    forEachMove(current, (next, mv) => {
      const tentative = parentG + 1;
      const nextKey = boardHash(next);
      const known = bestG.get(nextKey);
      if (known !== undefined && known <= tentative) return true;

      bestG.set(nextKey, tentative);
      ++r.metrics.generated;
      nodes.push({
        state: next,
        parent: cur,
        move: mv,
        g: tentative,
        h: manhattan(next),
      });
      frontier.push(nodes.length - 1);
      return true;
    });
    r.metrics.note(frontier.size());
  }
  return r;
}

function idaStar(start) {
  assertValidBoard(start);
  const r = createResult();
  r.metrics.generated = 1;

  if (isGoal(start)) {
    r.solved = true;
    return r;
  }
  if (!solvable(start)) return r;

  r.metrics.generated = 0;
  let bound = manhattan(start);

  while (bound < INF) {
    ++r.metrics.generated;

    const seen = new Map();
    seen.set(boardHash(start), 0);
    const path = [];
    let nextBound = INF;
    let solution = INF;

    function dfs(s, g, limit) {
      const f = g + manhattan(s);
      ++r.metrics.expanded;

      if (f > limit) {
        if (f < nextBound) nextBound = f;
        return INF;
      }
      if (isGoal(s)) return g;

      forEachMove(s, (next, mv) => {
        const ng = g + 1;
        const nextKey = boardHash(next);
        const known = seen.get(nextKey);
        if (known !== undefined && known <= ng) return true;

        seen.set(nextKey, ng);
        ++r.metrics.generated;
        path.push(mv);
        r.metrics.note(path.length);

        const outcome = dfs(next, ng, limit);
        if (outcome !== INF) {
          solution = outcome;
          return false;
        }
        path.pop();
        return true;
      });
      return solution;
    }

    const outcome = dfs(start, 0, bound);
    if (outcome !== INF) {
      r.solved = true;
      r.cost = outcome;
      r.path = path;
      break;
    }
    if (nextBound >= INF) break;
    bound = nextBound;
  }
  return r;
}

function createMt19937(seed) {
  const N = 624;
  const M = 397;
  const MATRIX_A = 0x9908b0df;
  const UPPER_MASK = 0x80000000;
  const LOWER_MASK = 0x7fffffff;
  const mt = new Uint32Array(N);
  let mti = N;

  mt[0] = seed >>> 0;
  for (let i = 1; i < N; ++i) {
    const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
    mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
  }

  return function nextUint32() {
    let y;
    if (mti >= N) {
      for (let kk = 0; kk < N - M; ++kk) {
        y = (mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK);
        mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      }
      for (let kk = N - M; kk < N - 1; ++kk) {
        y = (mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK);
        mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      }
      y = (mt[N - 1] & UPPER_MASK) | (mt[0] & LOWER_MASK);
      mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
      mti = 0;
    }
    y = mt[mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  };
}

function uniformInt(rng, maxInclusive) {
  const range = maxInclusive + 1;
  const limit = Math.floor(0x100000000 / range) * range;
  let r = rng();
  while (r >= limit) {
    r = rng();
  }
  return r % range;
}

function scramble(seed, steps) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error("La semilla debe ser un entero entre 0 y 4294967295.");
  }
  if (!Number.isInteger(steps) || steps < 0 || steps > 500) {
    throw new Error("Los pasos deben ser un entero entre 0 y 500.");
  }
  let s = GOAL.slice();
  let last = Move.None;
  const rng = createMt19937(seed);

  for (let i = 0; i < steps; ++i) {
    const legal = [];
    forEachMove(s, (_, mv) => {
      if (mv !== opposite(last)) legal.push(mv);
      return true;
    });
    const chosen = legal[uniformInt(rng, legal.length - 1)];
    s = applyMove(s, chosen);
    last = chosen;
  }
  return s;
}

function buildInstances() {
  const v = [{ name: "meta_0", board: GOAL.slice() }];
  const steps = [2, 6, 12, 20];
  for (let i = 0; i < 4; ++i) {
    v.push({
      name: "semilla_" + (100 + i) + "_pasos_" + steps[i],
      board: scramble(100 + i, steps[i]),
    });
  }
  v.push({ name: "sin_solucion", board: [2, 1, 3, 4, 5, 6, 7, 8, 0] });
  return v;
}

const ALGORITHMS = {
  GBFS: gbfs,
  "A*": aStar,
  "IDA*": idaStar,
};

const tileButtons = [];

const state = {
  startBoard: GOAL.slice(),
  board: GOAL.slice(),
  history: [],
  solution: null,
  solutionStep: 0,
  playTimer: null,
  benchmarkRunning: false,
  benchmarkRunId: 0,
};

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "dark" : "light",
  );
  const btn = document.getElementById("theme-btn");
  if (btn) {
    btn.textContent = isDark ? "Tema: Oscuro" : "Tema: Claro";
    btn.setAttribute("aria-pressed", String(isDark));
  }
  try {
    localStorage.setItem("puzzle_theme", isDark ? "dark" : "light");
  } catch (_) {}
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("puzzle_theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch (_) {}
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function stopPlayback() {
  if (state.playTimer !== null) {
    clearInterval(state.playTimer);
    state.playTimer = null;
  }
  updatePlaybackUI();
}

function renderSolutionPath() {
  const pathEl = document.getElementById("solution-path");
  pathEl.innerHTML = "";
  const sol = state.solution;
  if (!sol) return;

  for (let i = 0; i < sol.path.length; ++i) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "step-pill";
    btn.textContent = i + 1 + ". " + moveName(sol.path[i]);
    btn.addEventListener("click", () => {
      stopPlayback();
      goToSolutionStep(i + 1);
    });
    pathEl.appendChild(btn);
  }
}

function clearSolution() {
  stopPlayback();
  state.solution = null;
  state.solutionStep = 0;
  document.getElementById("solver-status").textContent =
    "Listo para resolver el tablero actual.";
  document.getElementById("metric-cost").textContent = "-";
  document.getElementById("metric-expanded").textContent = "-";
  document.getElementById("metric-generated").textContent = "-";
  document.getElementById("metric-frontier").textContent = "-";
  document.getElementById("metric-ms").textContent = "-";
  renderSolutionPath();
  updatePlaybackUI();
}

function setBoardError(msg) {
  document.getElementById("board-error").textContent = msg;
}

function initBoardDOM() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";
  tileButtons.length = 0;

  for (let i = 0; i < 9; ++i) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile";
    btn.addEventListener("click", () => {
      const mv = moveForTileClick(state.board, i);
      if (mv !== Move.None) {
        const wasFocused = document.activeElement === btn;
        const blankBefore = blankIndex(state.board);
        if (tryUserMove(mv) && wasFocused && blankBefore >= 0) {
          tileButtons[blankBefore].focus();
        }
      }
    });
    tileButtons.push(btn);
    boardEl.appendChild(btn);
  }
}

function renderBoard() {
  for (let i = 0; i < 9; ++i) {
    const val = state.board[i];
    const btn = tileButtons[i];

    if (val === 0) {
      btn.className = "tile tile-blank";
      btn.disabled = true;
      btn.setAttribute("aria-label", "Espacio vacio");
      btn.textContent = "";
    } else {
      let cls = "tile";
      if (val === i + 1) cls += " tile-correct";
      const mv = moveForTileClick(state.board, i);
      if (mv !== Move.None) cls += " tile-movable";
      btn.className = cls;
      btn.disabled = false;
      btn.textContent = String(val);
      btn.setAttribute(
        "aria-label",
        "Ficha " + val + (mv !== Move.None ? ", movible" : ""),
      );
    }
  }

  document.getElementById("board-moves").textContent =
    "Movimientos: " + state.history.length;
  document.getElementById("board-manhattan").textContent =
    "Manhattan: " + manhattan(state.board);

  const isSolvable = solvable(state.board);
  const solvableEl = document.getElementById("board-solvable");
  solvableEl.textContent = isSolvable ? "Resoluble" : "Sin solucion";
  solvableEl.className = "badge " + (isSolvable ? "badge-ok" : "badge-err");

  const goalReached = isGoal(state.board);
  const goalEl = document.getElementById("board-goal");
  goalEl.textContent = goalReached ? "Meta alcanzada" : "En curso";
  goalEl.className = "badge " + (goalReached ? "badge-goal" : "");

  const undoDisabled =
    state.history.length === 0 ||
    (state.solution !== null && state.solutionStep > 0);
  document.getElementById("undo-btn").disabled = undoDisabled;
  document.getElementById("custom-board-input").value = state.board.join(" ");
}

function loadNewBoard(board) {
  assertValidBoard(board);
  clearSolution();
  setBoardError("");
  state.startBoard = board.slice();
  state.board = board.slice();
  state.history = [];
  renderBoard();
}

function tryUserMove(mv) {
  const next = applyMove(state.board, mv);
  if (next === null) return false;
  if (state.solution !== null && state.solutionStep > 0) {
    for (let i = 0; i < state.solutionStep; ++i) {
      state.history.push(state.solution.states[i].slice());
    }
  }
  clearSolution();
  setBoardError("");
  state.history.push(state.board.slice());
  state.board = next;
  renderBoard();
  return true;
}

function updatePlaybackUI() {
  const sol = state.solution;
  const total = sol ? sol.path.length : 0;
  const step = state.solutionStep;

  document.getElementById("play-start-btn").disabled = !sol || step === 0;
  document.getElementById("play-prev-btn").disabled = !sol || step === 0;
  document.getElementById("play-next-btn").disabled = !sol || step >= total;
  document.getElementById("play-end-btn").disabled = !sol || step >= total;
  document.getElementById("play-toggle-btn").disabled = !sol || total === 0;
  document.getElementById("play-toggle-btn").textContent =
    state.playTimer !== null ? "Pausar" : "Reproducir";
  document.getElementById("play-step-label").textContent =
    "Paso " + step + " / " + total;

  const pills = document.getElementById("solution-path").children;
  for (let i = 0; i < pills.length; ++i) {
    pills[i].classList.toggle("step-pill-active", i + 1 === step);
  }
}

function goToSolutionStep(step) {
  if (!state.solution) return;
  const clamped = Math.max(0, Math.min(step, state.solution.states.length - 1));
  state.solutionStep = clamped;
  state.board = state.solution.states[clamped].slice();
  renderBoard();
  updatePlaybackUI();
}

function solveCurrentBoard() {
  stopPlayback();
  setBoardError("");
  const algoName = document.getElementById("algo-select").value;
  const algoFn = ALGORITHMS[algoName];
  if (!algoFn) return;

  const t0 = performance.now();
  const res = algoFn(state.board);
  const elapsed = performance.now() - t0;

  document.getElementById("metric-cost").textContent = res.solved
    ? String(res.cost)
    : "---";
  document.getElementById("metric-expanded").textContent = String(
    res.metrics.expanded,
  );
  document.getElementById("metric-generated").textContent = String(
    res.metrics.generated,
  );
  document.getElementById("metric-frontier").textContent = String(
    res.metrics.maxFrontier,
  );
  document.getElementById("metric-ms").textContent = elapsed.toFixed(3);

  if (!res.solved) {
    state.solution = null;
    state.solutionStep = 0;
    document.getElementById("solver-status").textContent =
      algoName + ": tablero sin solucion.";
    renderSolutionPath();
    updatePlaybackUI();
    return;
  }

  const states = [state.board.slice()];
  let cur = state.board.slice();
  for (let i = 0; i < res.path.length; ++i) {
    cur = applyMove(cur, res.path[i]);
    states.push(cur);
  }

  state.solution = {
    algo: algoName,
    path: res.path,
    states,
  };
  state.solutionStep = 0;

  if (res.path.length === 0) {
    document.getElementById("solver-status").textContent =
      algoName + ": el tablero ya esta en la meta.";
  } else {
    document.getElementById("solver-status").textContent =
      algoName + ": solucion encontrada en " + res.cost + " pasos.";
  }
  renderSolutionPath();
  updatePlaybackUI();
}

function togglePlayback() {
  if (!state.solution || state.solution.path.length === 0) return;
  if (state.playTimer !== null) {
    stopPlayback();
    return;
  }
  if (state.solutionStep >= state.solution.path.length) {
    goToSolutionStep(0);
  }
  state.playTimer = setInterval(() => {
    if (!state.solution || state.solutionStep >= state.solution.path.length) {
      stopPlayback();
      return;
    }
    goToSolutionStep(state.solutionStep + 1);
    if (state.solutionStep >= state.solution.path.length) {
      stopPlayback();
    }
  }, 300);
  updatePlaybackUI();
}

function parseStrictInt(raw) {
  const trimmed = String(raw).trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const val = Number(trimmed);
  return Number.isSafeInteger(val) ? val : null;
}

function runBenchmark() {
  if (state.benchmarkRunning) return;

  const repsRaw = document.getElementById("reps-input").value;
  const reps = parseStrictInt(repsRaw);
  const statusEl = document.getElementById("benchmark-status");

  if (reps === null || reps < 1 || reps > 50) {
    statusEl.textContent =
      "Repeticiones invalidas: usa un entero entre 1 y 50.";
    return;
  }

  state.benchmarkRunning = true;
  const runId = ++state.benchmarkRunId;
  const runBtn = document.getElementById("run-btn");
  runBtn.disabled = true;
  statusEl.textContent =
    "Ejecutando benchmark (" + reps + " repeticiones por caso)...";

  const tbody = document.getElementById("results-body");
  tbody.innerHTML = "";

  const instances = buildInstances();
  const tasks = [];
  for (const instance of instances) {
    for (const algoName of ["GBFS", "A*", "IDA*"]) {
      tasks.push({ instance, algoName, algoFn: ALGORITHMS[algoName] });
    }
  }

  let idx = 0;

  function nextTask() {
    if (runId !== state.benchmarkRunId) return;
    if (idx >= tasks.length) {
      state.benchmarkRunning = false;
      runBtn.disabled = false;
      statusEl.textContent =
        "Benchmark completado (" + reps + " repeticiones por caso).";
      return;
    }

    const task = tasks[idx++];
    let sample = null;
    let totalMs = 0;

    for (let rep = 0; rep < reps; ++rep) {
      const t0 = performance.now();
      const r = task.algoFn(task.instance.board);
      const t1 = performance.now();
      const elapsed = t1 - t0;
      totalMs += elapsed;
      if (rep === 0) {
        sample = r;
      }
    }

    const tr = document.createElement("tr");

    const tdAlgo = document.createElement("td");
    tdAlgo.textContent = task.algoName;
    tr.appendChild(tdAlgo);

    const tdInst = document.createElement("td");
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "link-btn";
    loadBtn.textContent = task.instance.name;
    loadBtn.addEventListener("click", () => loadNewBoard(task.instance.board));
    tdInst.appendChild(loadBtn);
    tr.appendChild(tdInst);

    const numValues = [
      sample.solved ? String(sample.cost) : "---",
      String(sample.metrics.expanded),
      String(sample.metrics.generated),
      String(sample.metrics.maxFrontier),
      (totalMs / reps).toFixed(3),
    ];

    for (const val of numValues) {
      const td = document.createElement("td");
      td.className = "num";
      td.textContent = val;
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
    setTimeout(nextTask, 0);
  }

  setTimeout(nextTask, 0);
}

function initInstancesDropdown() {
  const select = document.getElementById("instance-select");
  const instances = buildInstances();
  select.innerHTML = "";
  for (let i = 0; i < instances.length; ++i) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = instances[i].name;
    select.appendChild(opt);
  }
  return instances;
}

function triggerScramble() {
  const seed = parseStrictInt(document.getElementById("seed-input").value);
  const steps = parseStrictInt(document.getElementById("steps-input").value);
  if (seed === null || seed < 0 || seed > 0xffffffff) {
    setBoardError("La semilla debe ser un entero entre 0 y 4294967295.");
    return;
  }
  if (steps === null || steps < 0 || steps > 500) {
    setBoardError("Los pasos deben ser un entero entre 0 y 500.");
    return;
  }
  loadNewBoard(scramble(seed, steps));
}

function triggerCustomBoard() {
  const parsed = parseBoardInput(
    document.getElementById("custom-board-input").value,
  );
  if (!parsed.ok) {
    setBoardError(parsed.error);
    return;
  }
  loadNewBoard(parsed.board);
}

document.addEventListener("DOMContentLoaded", () => {
  const instances = initInstancesDropdown();
  initBoardDOM();

  applyTheme(getInitialTheme());
  const themeBtn = document.getElementById("theme-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  document.getElementById("undo-btn").addEventListener("click", () => {
    if (state.history.length === 0) return;
    if (state.solution !== null && state.solutionStep > 0) return;
    stopPlayback();
    state.solution = null;
    state.solutionStep = 0;
    renderSolutionPath();
    state.board = state.history.pop();
    setBoardError("");
    renderBoard();
    updatePlaybackUI();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    loadNewBoard(state.startBoard);
  });

  document.getElementById("goal-btn").addEventListener("click", () => {
    loadNewBoard(GOAL);
  });

  document
    .getElementById("scramble-btn")
    .addEventListener("click", triggerScramble);
  document.getElementById("seed-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerScramble();
  });
  document.getElementById("steps-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerScramble();
  });

  document.getElementById("load-instance-btn").addEventListener("click", () => {
    const idx = parseStrictInt(
      document.getElementById("instance-select").value,
    );
    if (idx === null || idx < 0 || idx >= instances.length) return;
    loadNewBoard(instances[idx].board);
  });

  document
    .getElementById("load-custom-btn")
    .addEventListener("click", triggerCustomBoard);
  document
    .getElementById("custom-board-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") triggerCustomBoard();
    });

  document
    .getElementById("solve-btn")
    .addEventListener("click", solveCurrentBoard);
  document.getElementById("play-start-btn").addEventListener("click", () => {
    stopPlayback();
    goToSolutionStep(0);
  });
  document.getElementById("play-prev-btn").addEventListener("click", () => {
    stopPlayback();
    goToSolutionStep(state.solutionStep - 1);
  });
  document.getElementById("play-next-btn").addEventListener("click", () => {
    stopPlayback();
    goToSolutionStep(state.solutionStep + 1);
  });
  document.getElementById("play-end-btn").addEventListener("click", () => {
    if (!state.solution) return;
    stopPlayback();
    goToSolutionStep(state.solution.path.length);
  });
  document
    .getElementById("play-toggle-btn")
    .addEventListener("click", togglePlayback);

  document.getElementById("run-btn").addEventListener("click", runBenchmark);
  document.getElementById("reps-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") runBenchmark();
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const activeTag = document.activeElement
      ? document.activeElement.tagName
      : "";
    if (
      activeTag === "INPUT" ||
      activeTag === "TEXTAREA" ||
      activeTag === "SELECT"
    )
      return;

    let mv = Move.None;
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        mv = Move.Down;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        mv = Move.Up;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        mv = Move.Right;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        mv = Move.Left;
        break;
      default:
        return;
    }
    e.preventDefault();
    tryUserMove(mv);
  });

  renderBoard();
  updatePlaybackUI();
  runBenchmark();
});

// basado en main.cpp