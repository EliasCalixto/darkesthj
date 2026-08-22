// ---------- Constants ----------

const RESUMEN_COLUMNS = [
  "Cash",
  "Total Papa",
  "Cash Total",
  "Tot. Savings",
  "Tot. Income",
  "Tot. Expenses",
];

const CATEGORY_COLORS = {
  Savings: "#8dbad6",
  Setup: "#9bc2e7",
  Studies: "#8ea9db",
  Home: "#abb9d4",
  Personal: "#7a9cc6",
  Enjoy: "#b9f5c4",
  Losses: "#fd9a9a",
  Fixed: "#f8ccad",
  Cashout: "#fef2cb",
};

// Orden en que las categorías salen en donut, barras, líneas y chips. Replica
// el panel "Groups" de Notion; si allá se reordena o se agrega una categoría,
// hay que reflejarlo aquí. Ojo: sumByCategoryOrdered() descarta los gastos cuya
// categoría no esté en esta lista, así que una categoría nueva que falte aquí
// desaparece de los gráficos sin aviso.
const CATEGORY_ORDER = [
  "Savings",
  "Setup",
  "Studies",
  "Home",
  "Personal",
  "Enjoy",
  "Losses",
  "Fixed",
  "Cashout",
];

// Categorías que se juntan en una sola barra, SOLO en el gráfico de totales por
// categoría (renderExpenseSumBars). El donut, la evolución mensual, los chips y
// la tabla las siguen tratando por separado, que es donde interesa el detalle.
// La barra agrupada ocupa la posición y el color del primer miembro según
// CATEGORY_ORDER, y el tooltip desglosa cuánto pone cada uno.
const SUM_BARS_GROUPS = [["Home", "Personal"]];

const DARK_GRAY = "#3a3a3c";
const MUTED_GRAY = "#6e6e73"; // for soft labels in legends / small text
const DONUT_LABEL_COLOR = "#4a4a4d"; // donut percentage labels: a bit darker for readability
const BAR_LABEL_COLOR = "#5a5a5e"; // numbers above bars
const SOFT_RED = "#fd9a9a"; // Losses pastel
const SOFT_GREEN = "#b9f5c4"; // Enjoy pastel

const state = {
  data: null,
  expenses: [],
  incomes: [],
  // Empty set means "no filter" (show all categories). Clicking a chip
  // adds it to the focus set; clicking an active chip removes it.
  selectedCategories: new Set(),
  period: "this-month",
  sort: { exp: { key: null, dir: -1 }, inc: { key: null, dir: -1 } },
  charts: {},
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function isMobile() { return window.innerWidth < 640; }

function formatPeriodLabel() {
  const now = new Date();
  const mo = (d) => d.toLocaleString(undefined, { month: "long", year: "numeric" });
  switch (state.period) {
    case "this-week":  return "This week";
    case "this-month": return mo(now);
    case "last-month": return mo(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    case "3m":         return "Last 3 months";
    case "6m":         return "Last 6 months";
    case "year":       return String(now.getFullYear());
    case "last-year":  return String(now.getFullYear() - 1);
    default: return "All time";
  }
}

function categoryTextColor(bgHex) {
  const r = parseInt(bgHex.slice(1,3), 16) / 255;
  const g = parseInt(bgHex.slice(3,5), 16) / 255;
  const b = parseInt(bgHex.slice(5,7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `hsl(0,0%,28%)`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
    case g: h = ((b - r) / d + 2) * 60; break;
    default: h = ((r - g) / d + 4) * 60;
  }
  return `hsl(${Math.round(h)},${Math.round(s * 60)}%,28%)`;
}

// ---------- Utils ----------

function setStatus(msg, isError = false) {
  const el = $("#status");
  if (!msg) {
    el.classList.remove("show");
    return;
  }
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  if (!isError) setTimeout(() => el.classList.remove("show"), 3000);
}

function fmtMoney(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : parseLocalDate(d);
  if (!dt || Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isoLocal(d) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(s) {
  // Notion dates like "2026-04-15" should be treated as local-midnight,
  // not UTC-midnight, otherwise filters drop entries near month boundaries
  // due to the user's UTC offset.
  if (!s) return null;
  const match = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRowDate(row, key) {
  const v = row[key];
  if (!v) return null;
  const raw = typeof v === "object" ? v.start : v;
  return parseLocalDate(raw);
}

function findDb(title) {
  return (state.data?.databases || []).find(
    (d) => (d.title || "").toLowerCase() === title.toLowerCase(),
  );
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysInRange(from, to) {
  const days = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur <= end) {
    days.push(dayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ---------- Data load ----------

async function loadData() {
  setStatus("Loading data.json…");
  try {
    const res = await fetch(`./data.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (isEncryptedEnvelope(payload)) {
      state.data = await unlockEncrypted(payload);
    } else {
      state.data = payload;
    }
    onDataReady();
    setStatus("");
  } catch (e) {
    console.error(e);
    setStatus(
      "Could not load data.json. Has the 'Sync Notion data' workflow run yet?",
      true,
    );
  }
}

// ---------- Encryption ----------

const PASSPHRASE_KEY = "monitor_passphrase";

function isEncryptedEnvelope(p) {
  return (
    p && typeof p === "object" && p.v === 1 && p.kdf === "pbkdf2-sha256" &&
    typeof p.iters === "number" && p.salt && p.iv && p.ct
  );
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

async function deriveAesKey(passphrase, salt, iterations) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decryptEnvelope(envelope, passphrase) {
  const salt = b64ToBuf(envelope.salt);
  const iv = b64ToBuf(envelope.iv);
  const ct = b64ToBuf(envelope.ct);
  const key = await deriveAesKey(passphrase, salt, envelope.iters);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct,
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function unlockEncrypted(envelope) {
  // First try the cached passphrase (silent unlock).
  const cached = localStorage.getItem(PASSPHRASE_KEY);
  if (cached) {
    try {
      return await decryptEnvelope(envelope, cached);
    } catch (_) {
      localStorage.removeItem(PASSPHRASE_KEY);
    }
  }
  return showAuthModalUntilUnlocked(envelope);
}

function showAuthModalUntilUnlocked(envelope) {
  return new Promise((resolve) => {
    const modal = $("#auth-modal");
    const form = $("#auth-form");
    const input = $("#passphrase-input");
    const remember = $("#remember-passphrase");
    const submitBtn = $("#auth-submit");
    const errorEl = $("#auth-error");

    modal.hidden = false;
    errorEl.textContent = "";
    setTimeout(() => input.focus(), 50);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const passphrase = input.value;
      if (!passphrase) return;
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = "Decrypting…";
      errorEl.textContent = "";
      try {
        const data = await decryptEnvelope(envelope, passphrase);
        if (remember.checked) {
          localStorage.setItem(PASSPHRASE_KEY, passphrase);
        } else {
          localStorage.removeItem(PASSPHRASE_KEY);
        }
        modal.hidden = true;
        input.value = "";
        submitBtn.textContent = originalLabel;
        submitBtn.disabled = false;
        resolve(data);
      } catch (err) {
        submitBtn.textContent = originalLabel;
        submitBtn.disabled = false;
        errorEl.textContent = "Incorrect passphrase";
        input.select();
      }
    };
  });
}

function onDataReady() {
  const { generated_at } = state.data;
  if (generated_at) {
    // Última consulta a Notion (cuándo se sincronizó data.json). Mismo formato
    // que el dashboard de Health y siempre en hora de Perú (America/Lima,
    // UTC−5), sin importar la zona horaria del visitante.
    const formatted = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Lima",
    }).format(new Date(generated_at));
    $("#generated-at").textContent = `Actualizado: ${formatted} (Perú)`;
  }

  const expDb = findDb("Expenses");
  const incDb = findDb("Incomes");

  if (!expDb || !incDb) {
    const missing = [!expDb && "Expenses", !incDb && "Incomes"].filter(Boolean).join(", ");
    setStatus(`Missing databases: ${missing}`, true);
  }

  state.expenses = (expDb?.rows || []).map((r) => ({
    id: r._id,
    url: r._url,
    name: r.Name || "",
    category: r.Category || "—",
    date: getRowDate(r, "Date Created"),
    price: typeof r.Price === "number" ? r.Price : 0,
  }));

  state.incomes = (incDb?.rows || []).map((r) => ({
    id: r._id,
    url: r._url,
    name: r.Name || "",
    date: getRowDate(r, "Date Received"),
    income: typeof r.Income === "number" ? r.Income : 0,
  }));

  buildCategoryChips();
  renderResumen();
  applyAndRender();
}

// ---------- Resumen ----------

function renderResumen() {
  const grid = $("#resumen-grid");
  const titleEl = $("#resumen-title");
  grid.innerHTML = "";

  const db = findDb("New database") || findDb("Resumen");
  if (!db || !db.rows || db.rows.length === 0) {
    titleEl.textContent = "Resumen";
    return;
  }

  const row = db.rows[0];
  titleEl.textContent = row.Name || "Resumen";

  for (const col of RESUMEN_COLUMNS) {
    const value = row[col];
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    grid.appendChild(resumenCard(col, value));
  }
}

function resumenCard(label, value) {
  // Border keeps the semantic color; value text is the same dark for every
  // card so the row reads as one unit.
  const el = document.createElement("div");
  el.className = "kpi";

  let borderColor = MUTED_GRAY;

  if (label === "Tot. Savings") {
    borderColor = CATEGORY_COLORS.Savings;
  } else if (label === "Tot. Income") {
    borderColor = CATEGORY_COLORS.Enjoy;
  } else if (label === "Tot. Expenses") {
    borderColor = CATEGORY_COLORS.Losses;
  }

  el.style.borderLeftColor = borderColor;
  el.innerHTML = `
    <div class="kpi-label">${escapeHtml(label)}</div>
    <div class="kpi-value">${fmtMoney(value)}</div>
  `;
  return el;
}

// ---------- Category chips ----------

function buildCategoryChips() {
  const present = new Set(state.expenses.map((e) => e.category).filter(Boolean));
  const ordered = [
    ...CATEGORY_ORDER.filter((c) => present.has(c)),
    ...[...present].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  // Start with no focus: empty set = show all.
  state.selectedCategories = new Set();

  const wrap = $("#category-chips");
  wrap.innerHTML = "";
  for (const cat of ordered) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip off"; // off = inactive by default
    chip.dataset.cat = cat;
    chip.textContent = cat;
    chip.style.background = CATEGORY_COLORS[cat] || "#cccccc";
    chip.addEventListener("click", () => toggleCategoryFocus(cat));
    wrap.appendChild(chip);
  }
}

// Enfoque por categoría, compartido por los chips y por las leyendas del donut
// y de la evolución mensual. Conjunto vacío = sin filtro, se ven todas.
function toggleCategoryFocus(cat) {
  if (!cat || !CATEGORY_ORDER.includes(cat)) return;
  if (state.selectedCategories.has(cat)) state.selectedCategories.delete(cat);
  else state.selectedCategories.add(cat);
  syncCategoryChips();
  applyAndRender();
}

// Los chips son la representación visible del enfoque; al cambiarlo desde una
// leyenda hay que repintarlos o quedarían desincronizados.
function syncCategoryChips() {
  for (const chip of document.querySelectorAll("#category-chips .chip")) {
    chip.classList.toggle("off", !state.selectedCategories.has(chip.dataset.cat));
  }
}

// Reemplaza el onClick por defecto de Chart.js en las leyendas, que oculta la
// serie pulsada. Aquí hace lo contrario: enfoca esa categoría en todo el panel.
const focusLegendOnClick = (getCategory) => (_e, item) => {
  toggleCategoryFocus(getCategory(item));
};

// ---------- Period filter ----------

function computePeriod() {
  const now = new Date();
  switch (state.period) {
    case "this-week": {
      // Monday-anchored week.
      const dow = (now.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
      const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6, 23, 59, 59);
      return { from, to };
    }
    case "this-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case "last-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    case "3m":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case "6m":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case "year":
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    case "last-year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    case "all":
    default:
      return { from: null, to: null };
  }
}

function inPeriod(date, from, to) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

// ---------- Filter + dispatch ----------

function applyAndRender() {
  const label = formatPeriodLabel();
  const tag = label ? ` — ${label}` : "";
  const epEl = document.getElementById("exp-period");
  const ipEl = document.getElementById("inc-period");
  if (epEl) epEl.textContent = tag;
  if (ipEl) ipEl.textContent = tag;

  const { from, to } = computePeriod();
  const noCategoryFilter = state.selectedCategories.size === 0;
  const filteredExpenses = state.expenses.filter((e) => {
    if (!inPeriod(e.date, from, to)) return false;
    if (noCategoryFilter) return true;
    return state.selectedCategories.has(e.category);
  });
  const filteredIncomes = state.incomes.filter((i) => inPeriod(i.date, from, to));

  renderExpenseDonut(filteredExpenses);
  renderExpenseSumBars(filteredExpenses);
  renderExpenseEvolution(filteredExpenses, { from, to });
  renderExpenseTable(filteredExpenses);

  renderIncomeYearly();

  // Monthly income chart shows context beyond the selected period:
  // - "all time" → all incomes, no date bounds
  // - short periods (this week/month/year) → full current year for context
  // - longer periods → exactly the selected period
  let incMonthlyIncomes, incMonthlyFrom, incMonthlyTo, incMonthlyLabel;
  if (state.period === "all") {
    incMonthlyIncomes = state.incomes;
    incMonthlyFrom = null;
    incMonthlyTo = null;
    incMonthlyLabel = "— all time";
  } else if (["this-week", "this-month", "year"].includes(state.period)) {
    const y = new Date().getFullYear();
    incMonthlyFrom = new Date(y, 0, 1);
    incMonthlyTo = new Date(y, 11, 31, 23, 59, 59);
    incMonthlyIncomes = state.incomes.filter((i) => inPeriod(i.date, incMonthlyFrom, incMonthlyTo));
    incMonthlyLabel = "— this year";
  } else {
    incMonthlyIncomes = filteredIncomes;
    incMonthlyFrom = from;
    incMonthlyTo = to;
    incMonthlyLabel = "— filtered";
  }
  const incMonthlyLabelEl = document.getElementById("inc-monthly-label");
  if (incMonthlyLabelEl) incMonthlyLabelEl.textContent = incMonthlyLabel;

  renderIncomeMonthly(incMonthlyIncomes, { from: incMonthlyFrom, to: incMonthlyTo });
  renderIncomeTable(filteredIncomes);
}

function destroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    state.charts[key] = null;
  }
}

// ---------- Expense charts ----------

function sumByCategoryOrdered(expenses) {
  const totals = new Map(CATEGORY_ORDER.map((c) => [c, 0]));
  for (const e of expenses) {
    if (!CATEGORY_ORDER.includes(e.category)) continue;
    totals.set(e.category, (totals.get(e.category) || 0) + e.price);
  }
  return totals;
}

function renderExpenseDonut(expenses) {
  destroyChart("expDonut");

  const totals = sumByCategoryOrdered(expenses);
  // Keep order but drop zero slices so the donut isn't cluttered.
  const labels = [];
  const values = [];
  const colors = [];
  for (const cat of CATEGORY_ORDER) {
    const v = totals.get(cat) || 0;
    if (v <= 0) continue;
    labels.push(cat);
    values.push(v);
    colors.push(CATEGORY_COLORS[cat]);
  }

  const total = values.reduce((a, b) => a + b, 0);

  const ctx = document.getElementById("exp-donut");
  state.charts.expDonut = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: isMobile(),
      aspectRatio: 1.5,
      cutout: "55%",
      plugins: {
        legend: {
          position: "right",
          // En el donut cada leyenda es una porción: su texto ES la categoría.
          onClick: focusLegendOnClick((item) => item.text),
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 8,
            boxHeight: 8,
            padding: isMobile() ? 8 : 10,
            font: { size: isMobile() ? 12 : 14 },
          },
        },
        tooltip: {
          callbacks: {
            label: (c) =>
              `${c.label}: ${fmtMoney(c.parsed)} (${((c.parsed / total) * 100).toFixed(1)}%)`,
          },
        },
        datalabels: {
          display: (ctx) => {
            const v = ctx.dataset.data[ctx.dataIndex];
            return total > 0 && (v / total) * 100 >= 4;
          },
          color: DONUT_LABEL_COLOR,
          font: { weight: "400", size: 13 },
          formatter: (v) => `${((v / total) * 100).toFixed(1)}%`,
          anchor: "center",
          align: "center",
        },
      },
    },
    plugins: [window.ChartDataLabels].filter(Boolean),
  });
}

function renderExpenseSumBars(expenses) {
  destroyChart("expSumBars");

  const totals = sumByCategoryOrdered(expenses);

  // Recorre el orden normal, pero al llegar al primer miembro de un grupo emite
  // una sola barra con la suma y salta el resto de miembros.
  const labels = [];
  const values = [];
  const colors = [];
  const barMembers = []; // miembros de cada barra; solo para el tooltip
  const absorbed = new Set();

  for (const cat of CATEGORY_ORDER) {
    if (absorbed.has(cat)) continue;
    const group = SUM_BARS_GROUPS.find((g) => g.includes(cat));
    const members = group ?? [cat];
    for (const m of members) absorbed.add(m);
    labels.push(members.join(" + "));
    values.push(members.reduce((sum, m) => sum + (totals.get(m) || 0), 0));
    colors.push(CATEGORY_COLORS[members[0]]);
    barMembers.push(members.length > 1 ? members : null);
  }

  const ctx = document.getElementById("exp-sum-bars");
  state.charts.expSumBars = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Total",
          data: values,
          backgroundColor: colors,
          borderRadius: 4,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `${c.label}: ${fmtMoney(c.parsed.y)}`,
            // En la barra agrupada, desglosa cuánto pone cada categoría.
            afterLabel: (c) => {
              const members = barMembers[c.dataIndex];
              if (!members) return undefined;
              return members.map((m) => `   ${m}: ${fmtMoney(totals.get(m) || 0)}`);
            },
          },
        },
        datalabels: {
          display: (ctx) => (ctx.dataset.data[ctx.dataIndex] || 0) > 0,
          anchor: "end",
          align: "top",
          offset: 4,
          color: BAR_LABEL_COLOR,
          font: { size: 12, weight: "400" },
          formatter: (v) => fmtMoney(v),
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: isMobile() ? 11 : 13 }, maxRotation: 45, minRotation: 30 },
        },
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => fmtMoney(v), font: { size: isMobile() ? 11 : 13 } },
        },
      },
    },
    plugins: [window.ChartDataLabels].filter(Boolean),
  });
}

function monthsInRange(from, to, expenses) {
  // If period bounds exist, list every month between them.
  // Else (All time), derive from the data so we don't get gaps.
  const months = new Set();
  if (from && to) {
    const start = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (start <= end) {
      months.add(monthKey(start));
      start.setMonth(start.getMonth() + 1);
    }
  } else {
    for (const e of expenses) {
      if (e.date) months.add(monthKey(e.date));
    }
  }
  return [...months].sort();
}

function renderExpenseEvolution(expenses, { from, to }) {
  destroyChart("expEvolution");

  const selectedCats = state.selectedCategories.size === 0
    ? [...CATEGORY_ORDER]
    : CATEGORY_ORDER.filter((c) => state.selectedCategories.has(c));

  // Use daily buckets for single-month periods so the chart shows per-day data.
  const isDaily = ["this-month", "last-month"].includes(state.period) && from && to;
  const labels = isDaily ? daysInRange(from, to) : monthsInRange(from, to, expenses);
  const getKey = isDaily ? (e) => dayKey(e.date) : (e) => monthKey(e.date);

  const byCatKey = {};
  for (const cat of selectedCats) byCatKey[cat] = Object.fromEntries(labels.map((k) => [k, 0]));
  for (const e of expenses) {
    if (!e.date) continue;
    if (!byCatKey[e.category]) continue;
    const k = getKey(e);
    if (k in byCatKey[e.category]) byCatKey[e.category][k] += e.price;
  }

  const LINE_COLOR_OVERRIDES = { Cashout: "#d4a844" };
  const datasets = selectedCats.map((cat) => {
    const color = LINE_COLOR_OVERRIDES[cat] || CATEGORY_COLORS[cat];
    return {
    label: cat,
    data: labels.map((k) => byCatKey[cat][k] || 0),
    borderColor: color,
    backgroundColor: color + "55",
    pointBackgroundColor: color,
    pointRadius: isDaily ? 2 : 3,
    tension: 0.3,
    fill: false,
    borderWidth: 2,
    };
  });

  const xTickCallback = isDaily
    ? function (value) {
        const label = this.getLabelForValue(value);
        return String(parseInt(label.split("-")[2], 10));
      }
    : function (value) {
        const label = this.getLabelForValue(value);
        const [y, m] = label.split("-");
        return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      };

  const ctx = document.getElementById("exp-evolution");
  state.charts.expEvolution = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          // En la evolución cada leyenda es un dataset por categoría.
          onClick: focusLegendOnClick((item) => item.text),
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 5,
            boxHeight: 5,
            padding: 10,
            font: { size: isMobile() ? 11 : 13 },
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            title: isDaily
              ? (items) => {
                  const d = new Date(items[0].label + "T00:00:00");
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                }
              : undefined,
            label: (c) => `${c.dataset.label}: ${fmtMoney(c.parsed.y)}`,
          },
        },
        datalabels: { display: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: isMobile() ? 8 : (isDaily ? 16 : 20),
            maxRotation: isDaily ? 0 : 45,
            minRotation: 0,
            font: { size: isMobile() ? 11 : 13 },
            callback: xTickCallback,
          },
        },
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => fmtMoney(v), font: { size: isMobile() ? 11 : 13 } },
        },
      },
    },
  });
}

// ---------- Income charts ----------

function renderIncomeYearly() {
  destroyChart("incYearly");

  const byYear = new Map();
  for (const i of state.incomes) {
    if (!i.date) continue;
    const y = i.date.getFullYear();
    byYear.set(y, (byYear.get(y) || 0) + i.income);
  }
  const years = [...byYear.keys()].sort();
  const values = years.map((y) => byYear.get(y));

  const ctx = document.getElementById("inc-yearly");
  state.charts.incYearly = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years.map((y) => String(y)),
      datasets: [
        {
          label: "Income",
          data: values,
          backgroundColor: CATEGORY_COLORS.Enjoy,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => fmtMoney(c.parsed.y) } },
        datalabels: {
          display: (ctx) => (ctx.dataset.data[ctx.dataIndex] || 0) > 0,
          anchor: "end",
          align: "top",
          offset: 4,
          color: BAR_LABEL_COLOR,
          font: { size: 12, weight: "400" },
          formatter: (v) => fmtMoney(v),
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (v) => fmtMoney(v) } },
      },
    },
    plugins: [window.ChartDataLabels].filter(Boolean),
  });
}

function renderIncomeMonthly(incomes, { from, to }) {
  destroyChart("incMonthly");

  const months = monthsInRange(from, to, incomes.map((i) => ({ date: i.date })));
  const byMonth = Object.fromEntries(months.map((m) => [m, 0]));
  for (const i of incomes) {
    if (!i.date) continue;
    const k = monthKey(i.date);
    if (!(k in byMonth)) byMonth[k] = 0;
    byMonth[k] += i.income;
  }
  const labels = Object.keys(byMonth).sort();
  const values = labels.map((m) => byMonth[m]);

  const lineColor = "#5fbb7d"; // darker variant of Enjoy for line visibility

  const ctx = document.getElementById("inc-monthly");
  state.charts.incMonthly = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: values,
          borderColor: lineColor,
          backgroundColor: CATEGORY_COLORS.Enjoy + "66",
          pointBackgroundColor: lineColor,
          pointRadius: 3,
          tension: 0.3,
          fill: true,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: { label: (c) => fmtMoney(c.parsed.y) },
        },
        datalabels: { display: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: isMobile() ? 6 : 20,
            maxRotation: 45,
            minRotation: 30,
            font: { size: isMobile() ? 11 : 13 },
            callback: function (value) {
              const label = this.getLabelForValue(value);
              const [y, m] = label.split("-");
              return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              });
            },
          },
        },
        y: { beginAtZero: true, ticks: { callback: (v) => fmtMoney(v) } },
      },
    },
  });
}

// ---------- Tables ----------

function sortRows(rows, key, dir, getters) {
  if (!key) return rows;
  const get = getters[key];
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va instanceof Date && vb instanceof Date) return (va - vb) * dir;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

function buildSortableTable(tableSel, sortKey, columns, rows, getters, opts = {}) {
  const sortState = state.sort[sortKey];
  const sorted = sortRows(rows, sortState.key, sortState.dir, getters);

  const thead = $(`${tableSel} thead`);
  const tbody = $(`${tableSel} tbody`);

  thead.innerHTML =
    "<tr>" +
    columns
      .map((col) => {
        let cls = "";
        if (sortState.key === col.key)
          cls = sortState.dir === 1 ? "sorted-asc" : "sorted-desc";
        if (col.num) cls += " num";
        return `<th data-key="${col.key}" class="${cls.trim()}">${col.label}</th>`;
      })
      .join("") +
    "</tr>";

  tbody.innerHTML = sorted
    .map(
      (r) =>
        "<tr>" +
        columns
          .map((col) => `<td class="${col.num ? "num" : ""}">${col.render(r)}</td>`)
          .join("") +
        "</tr>",
    )
    .join("");

  thead.querySelectorAll("th").forEach((th) => {
    th.onclick = () => {
      const k = th.dataset.key;
      if (sortState.key === k) sortState.dir = -sortState.dir;
      else {
        sortState.key = k;
        sortState.dir = 1;
      }
      applyAndRender();
    };
  });

  if (opts.countEl) {
    $(opts.countEl).textContent = `${sorted.length} ${opts.countLabel || "rows"}`;
  }
}

function renderExpenseTable(expenses) {
  const getters = {
    date: (r) => r.date,
    name: (r) => r.name,
    category: (r) => r.category,
    price: (r) => r.price,
  };
  const columns = [
    { key: "date", label: "Date", num: false, render: (r) => fmtDate(r.date) },
    {
      key: "category",
      label: "Category",
      num: false,
      render: (r) => {
        const bg = CATEGORY_COLORS[r.category] || "#dddddd";
        const fg = categoryTextColor(bg);
        return `<span class="category-tag" style="background:${bg};color:${fg}">${escapeHtml(r.category)}</span>`;
      },
    },
    {
      key: "name",
      label: "Name",
      num: false,
      render: (r) =>
        r.url
          ? `<a href="${r.url}" target="_blank" rel="noreferrer">${escapeHtml(r.name)}</a>`
          : escapeHtml(r.name),
    },
    { key: "price", label: "Price", num: true, render: (r) => fmtMoney(r.price) },
  ];
  buildSortableTable("#exp-table", "exp", columns, expenses, getters, {
    countEl: "#exp-count",
    countLabel: "expenses",
  });
}

function renderIncomeTable(incomes) {
  const getters = {
    date: (r) => r.date,
    name: (r) => r.name,
    income: (r) => r.income,
  };
  const columns = [
    { key: "date", label: "Date", num: false, render: (r) => fmtDate(r.date) },
    {
      key: "name",
      label: "Name",
      num: false,
      render: (r) =>
        r.url
          ? `<a href="${r.url}" target="_blank" rel="noreferrer">${escapeHtml(r.name)}</a>`
          : escapeHtml(r.name),
    },
    { key: "income", label: "Income", num: true, render: (r) => fmtMoney(r.income) },
  ];
  buildSortableTable("#inc-table", "inc", columns, incomes, getters, {
    countEl: "#inc-count",
    countLabel: "incomes",
  });
}

// ---------- Listeners ----------

function attachFilterListeners() {
  $("#period").addEventListener("change", (e) => {
    state.period = e.target.value;
    applyAndRender();
  });
  $("#reset-filters").addEventListener("click", () => {
    state.period = "this-month";
    $("#period").value = "this-month";
    state.selectedCategories = new Set();
    $$("#category-chips .chip").forEach((c) => c.classList.add("off"));
    applyAndRender();
  });
  $("#refresh").addEventListener("click", loadData);
  attachPageSwitcher();
}

// Despliega un menú (Finance ⇄ Health) al pulsar el título, para saltar rápido
// de un panel al otro.
function attachPageSwitcher() {
  const btn = $("#page-switcher-btn");
  const menu = $("#page-switcher-menu");
  if (!btn || !menu) return;

  const open = () => {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };
  const toggle = () => (menu.hidden ? open() : close());

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    } else if (e.key === "Escape") {
      close();
    }
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) close();
  });
}

// ---------- Bootstrap ----------

// iOS/macOS PWAs can stay frozen in the background for a long time and
// resume without re-running any JS — so refetch fresh data whenever the
// app regains visibility (e.g. switching back to it from the home screen).
function attachVisibilityRefresh() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.data) {
      loadData();
    }
  });
}

function bootstrap() {
  attachFilterListeners();
  attachVisibilityRefresh();
  const tryLoad = () => {
    if (typeof Chart === "undefined") {
      setTimeout(tryLoad, 50);
      return;
    }
    // datalabels is optional but lets the donut show percentages
    if (window.ChartDataLabels && Chart.registry?.plugins?.get?.("datalabels") == null) {
      try {
        Chart.register(window.ChartDataLabels);
      } catch (_) {}
    }
    // Default off everywhere; we opt-in per chart.
    if (Chart.defaults?.plugins) {
      Chart.defaults.plugins.datalabels = Chart.defaults.plugins.datalabels || {};
      Chart.defaults.plugins.datalabels.display = false;
      Chart.defaults.plugins.tooltip.titleFont  = { size: 14, weight: "600" };
      Chart.defaults.plugins.tooltip.bodyFont   = { size: 13 };
      Chart.defaults.plugins.tooltip.padding    = 12;
      Chart.defaults.plugins.tooltip.boxWidth   = 12;
      Chart.defaults.plugins.tooltip.boxHeight  = 12;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
    }
    loadData();
  };
  tryLoad();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
