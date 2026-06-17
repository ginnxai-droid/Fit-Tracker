// ─────────────────────────────────────────────────────────────────────────────
// charts.js — Chart.js rendering module for FitTriglyceride Tracker
// ─────────────────────────────────────────────────────────────────────────────

import { getProfile, getDateStr, getDaysBetween } from './data.js';
import { calculateGoalTrajectory, getConsolidatedDailyLogs } from './scoring.js';

/* ── Chart instance registry ─────────────────────────────────────────────── */
const chartInstances = new Map();

/* ── Color palettes ──────────────────────────────────────────────────────── */
const DARK_THEME = {
  text: '#b0b8c8',
  grid: 'rgba(255,255,255,0.06)',
  tooltipBg: 'rgba(20, 22, 30, 0.95)',
  tooltipBorder: 'rgba(255,255,255,0.1)',
  primary: 'rgba(99, 135, 255, 1)',
  primaryFade: 'rgba(99, 135, 255, 0.05)',
  success: 'rgba(52, 211, 153, 1)',
  successFade: 'rgba(52, 211, 153, 0.15)',
  warning: 'rgba(251, 191, 36, 1)',
  warningFade: 'rgba(251, 191, 36, 0.15)',
  danger: 'rgba(248, 113, 113, 1)',
  dangerFade: 'rgba(248, 113, 113, 0.15)',
  info: 'rgba(96, 165, 250, 1)',
  infoFade: 'rgba(96, 165, 250, 0.15)',
  targetZone: 'rgba(52, 211, 153, 0.08)',
  targetBorder: 'rgba(52, 211, 153, 0.3)',
  startLine: 'rgba(248, 113, 113, 0.5)',
  avgLine: 'rgba(251, 191, 36, 0.7)',
  emptyText: '#6b7280',
};

const LIGHT_THEME = {
  text: '#374151',
  grid: 'rgba(0,0,0,0.06)',
  tooltipBg: 'rgba(255, 255, 255, 0.95)',
  tooltipBorder: 'rgba(0,0,0,0.1)',
  primary: 'rgba(59, 91, 219, 1)',
  primaryFade: 'rgba(59, 91, 219, 0.05)',
  success: 'rgba(16, 185, 129, 1)',
  successFade: 'rgba(16, 185, 129, 0.12)',
  warning: 'rgba(217, 158, 0, 1)',
  warningFade: 'rgba(217, 158, 0, 0.12)',
  danger: 'rgba(220, 38, 38, 1)',
  dangerFade: 'rgba(220, 38, 38, 0.12)',
  info: 'rgba(37, 99, 235, 1)',
  infoFade: 'rgba(37, 99, 235, 0.12)',
  targetZone: 'rgba(16, 185, 129, 0.08)',
  targetBorder: 'rgba(16, 185, 129, 0.35)',
  startLine: 'rgba(220, 38, 38, 0.45)',
  avgLine: 'rgba(217, 158, 0, 0.6)',
  emptyText: '#9ca3af',
};

let currentTheme = DARK_THEME;

/* ── Chart.js default configuration ──────────────────────────────────────── */

export function configureChartDefaults() {
  Chart.defaults.color = '#b0b8c8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(20, 22, 30, 0.95)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
  Chart.defaults.elements.point.radius = 3;
  Chart.defaults.elements.point.hoverRadius = 6;
  Chart.defaults.elements.line.tension = 0.4;
  Chart.defaults.elements.line.borderWidth = 2.5;
  Chart.defaults.elements.bar.borderRadius = 6;
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
}

/* ── Theme toggling ──────────────────────────────────────────────────────── */

export function updateChartTheme(isDark) {
  currentTheme = isDark ? DARK_THEME : LIGHT_THEME;

  Chart.defaults.color = currentTheme.text;
  Chart.defaults.borderColor = currentTheme.grid;
  Chart.defaults.plugins.tooltip.backgroundColor = currentTheme.tooltipBg;
  Chart.defaults.plugins.tooltip.borderColor = currentTheme.tooltipBorder;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Create a vertical linear gradient for canvas fills.
 */
function createGradient(ctx, colorTop, colorBottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);
  return gradient;
}

/**
 * Filter daily logs to the requested range.
 * @param {Array} logs  — sorted daily log entries
 * @param {string} range — '7d' | '30d' | '12w' | 'all'
 * @returns {Array}
 */
function filterByRange(logs, range) {
  if (!logs || logs.length === 0) return [];
  if (range === 'all') return logs;

  const now = new Date();
  let cutoff;

  switch (range) {
    case '7d':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case '30d':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    case '12w':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 84);
      break;
    default:
      return logs;
  }

  const cutoffStr = getDateStr(cutoff);
  return logs.filter((log) => log.date >= cutoffStr);
}

/**
 * Safely retrieve or create a canvas 2D context.
 * Returns null if the element doesn't exist.
 */
function getCanvasCtx(canvasId) {
  const el = document.getElementById(canvasId);
  if (!el) return null;
  return el.getContext('2d');
}

/**
 * Destroy an existing chart instance for a given canvas ID.
 */
function destroyChart(canvasId) {
  if (chartInstances.has(canvasId)) {
    chartInstances.get(canvasId).destroy();
    chartInstances.delete(canvasId);
  }
}

/**
 * Draw a centered "No data yet" message on the canvas.
 */
function drawEmptyState(ctx, canvasId) {
  destroyChart(canvasId);
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.fillStyle = currentTheme.emptyText;
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No data yet', canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

/**
 * Format date labels for chart axes (e.g. "Jun 8").
 */
function formatLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculate a simple moving average.
 */
function movingAverage(data, window) {
  return data.map((_, i, arr) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1).filter((v) => v != null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
}

/**
 * Common animation config.
 */
function animationConfig() {
  return {
    duration: 800,
    easing: 'easeOutQuart',
  };
}

/* ═════════════════════════════════════════════════════════════════════════════
   1. WEIGHT TREND CHART
   ═════════════════════════════════════════════════════════════════════════ */

export function renderWeightChart(canvasId, range = '30d') {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const logs = filterByRange(allLogs, range).filter((l) => l.weight_kg != null);

  if (logs.length < 2) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const labels = logs.map((l) => formatLabel(l.date));
  const weights = logs.map((l) => l.weight_kg);

  const profile = getProfile() || {};
  const startWeight = profile.start_weight_kg || 90;
  const targetLow = profile.target_weight_kg || 80;
  const targetHigh = targetLow + 2; // 80–82

  const gradient = createGradient(ctx, currentTheme.primary, currentTheme.primaryFade);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Weight (kg)',
          data: weights,
          borderColor: currentTheme.primary,
          backgroundColor: gradient,
          fill: true,
          pointBackgroundColor: currentTheme.primary,
          pointBorderColor: currentTheme.primary,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          title: { display: true, text: 'kg', color: currentTheme.text },
          grid: { color: currentTheme.grid },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        annotation: {
          annotations: {
            targetZone: {
              type: 'box',
              yMin: targetLow,
              yMax: targetHigh,
              backgroundColor: currentTheme.targetZone,
              borderColor: currentTheme.targetBorder,
              borderWidth: 1,
              label: {
                display: true,
                content: 'Target Zone',
                position: 'start',
                color: currentTheme.success,
                font: { size: 10, weight: '600' },
              },
            },
            startLine: {
              type: 'line',
              yMin: startWeight,
              yMax: startWeight,
              borderColor: currentTheme.startLine,
              borderWidth: 1.5,
              borderDash: [6, 4],
              label: {
                display: true,
                content: `Start ${startWeight} kg`,
                position: 'end',
                color: currentTheme.danger,
                font: { size: 10 },
                backgroundColor: 'transparent',
              },
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => `${tooltipItem.parsed.y.toFixed(1)} kg`,
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/* ═════════════════════════════════════════════════════════════════════════════
   2. WAIST TREND CHART
   ═════════════════════════════════════════════════════════════════════════ */

export function renderWaistChart(canvasId, range = '30d') {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const logs = filterByRange(allLogs, range).filter((l) => l.waist_in != null);

  if (logs.length < 2) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const labels = logs.map((l) => formatLabel(l.date));
  const waists = logs.map((l) => l.waist_in);

  const profile = getProfile() || {};
  const startWaist = profile.start_waist_in || 38;
  const targetLow = profile.target_waist_in || 34;
  const targetHigh = targetLow + 1; // 34–35

  const gradient = createGradient(ctx, currentTheme.info, currentTheme.infoFade);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Waist (in)',
          data: waists,
          borderColor: currentTheme.info,
          backgroundColor: gradient,
          fill: true,
          pointBackgroundColor: currentTheme.info,
          pointBorderColor: currentTheme.info,
          spanGaps: true, // connect across missing data
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          title: { display: true, text: 'inches', color: currentTheme.text },
          grid: { color: currentTheme.grid },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        annotation: {
          annotations: {
            targetZone: {
              type: 'box',
              yMin: targetLow,
              yMax: targetHigh,
              backgroundColor: currentTheme.targetZone,
              borderColor: currentTheme.targetBorder,
              borderWidth: 1,
              label: {
                display: true,
                content: 'Target Zone',
                position: 'start',
                color: currentTheme.success,
                font: { size: 10, weight: '600' },
              },
            },
            startLine: {
              type: 'line',
              yMin: startWaist,
              yMax: startWaist,
              borderColor: currentTheme.startLine,
              borderWidth: 1.5,
              borderDash: [6, 4],
              label: {
                display: true,
                content: `Start ${startWaist}"`,
                position: 'end',
                color: currentTheme.danger,
                font: { size: 10 },
                backgroundColor: 'transparent',
              },
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => `${tooltipItem.parsed.y.toFixed(1)}"`,
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/* ═════════════════════════════════════════════════════════════════════════════
   3. STEPS TREND CHART
   ═════════════════════════════════════════════════════════════════════════ */

export function renderStepsChart(canvasId, range = '30d') {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const logs = filterByRange(allLogs, range).filter((l) => l.steps != null);

  if (logs.length === 0) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const TARGET_STEPS = 8000;
  const AMBER_THRESHOLD = 5000;

  const labels = logs.map((l) => formatLabel(l.date));
  const steps = logs.map((l) => l.steps);

  // Per-bar coloring
  const barColors = steps.map((s) => {
    if (s >= TARGET_STEPS) return currentTheme.success;
    if (s >= AMBER_THRESHOLD) return currentTheme.warning;
    return currentTheme.danger;
  });

  const barBgColors = steps.map((s) => {
    if (s >= TARGET_STEPS) return currentTheme.successFade;
    if (s >= AMBER_THRESHOLD) return currentTheme.warningFade;
    return currentTheme.dangerFade;
  });

  const avg = steps.reduce((a, b) => a + b, 0) / steps.length;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Steps',
          data: steps,
          backgroundColor: barColors,
          borderColor: barColors,
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Steps', color: currentTheme.text },
          grid: { color: currentTheme.grid },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        annotation: {
          annotations: {
            targetLine: {
              type: 'line',
              yMin: TARGET_STEPS,
              yMax: TARGET_STEPS,
              borderColor: currentTheme.success,
              borderWidth: 1.5,
              borderDash: [6, 4],
              label: {
                display: true,
                content: `Target ${TARGET_STEPS.toLocaleString()}`,
                position: 'end',
                color: currentTheme.success,
                font: { size: 10, weight: '600' },
                backgroundColor: 'transparent',
              },
            },
            avgLine: {
              type: 'line',
              yMin: avg,
              yMax: avg,
              borderColor: currentTheme.avgLine,
              borderWidth: 1.5,
              borderDash: [3, 3],
              label: {
                display: true,
                content: `Avg ${Math.round(avg).toLocaleString()}`,
                position: 'start',
                color: currentTheme.warning,
                font: { size: 10 },
                backgroundColor: 'transparent',
              },
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => `${tooltipItem.parsed.y.toLocaleString()} steps`,
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/* ═════════════════════════════════════════════════════════════════════════════
   4. PROTEIN TREND CHART
   ═════════════════════════════════════════════════════════════════════════ */

export function renderProteinChart(canvasId, range = '30d') {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const logs = filterByRange(allLogs, range).filter((l) => l.protein_g != null);

  if (logs.length === 0) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const TARGET_PROTEIN = 95;
  const AMBER_THRESHOLD = 80;

  const labels = logs.map((l) => formatLabel(l.date));
  const proteins = logs.map((l) => l.protein_g);

  const barColors = proteins.map((p) => {
    if (p >= TARGET_PROTEIN) return currentTheme.success;
    if (p >= AMBER_THRESHOLD) return currentTheme.warning;
    return currentTheme.danger;
  });

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Protein (g)',
          data: proteins,
          backgroundColor: barColors,
          borderColor: barColors,
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Grams', color: currentTheme.text },
          grid: { color: currentTheme.grid },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        annotation: {
          annotations: {
            targetLine: {
              type: 'line',
              yMin: TARGET_PROTEIN,
              yMax: TARGET_PROTEIN,
              borderColor: currentTheme.success,
              borderWidth: 1.5,
              borderDash: [6, 4],
              label: {
                display: true,
                content: `Target ${TARGET_PROTEIN}g`,
                position: 'end',
                color: currentTheme.success,
                font: { size: 10, weight: '600' },
                backgroundColor: 'transparent',
              },
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => `${tooltipItem.parsed.y.toFixed(0)}g protein`,
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/* ═════════════════════════════════════════════════════════════════════════════
   5. WORKOUT COMPLETION HEATMAP
   ═════════════════════════════════════════════════════════════════════════ */

export function renderWorkoutHeatmap(canvasId, range = '30d') {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const logs = filterByRange(allLogs, range);

  if (logs.length === 0) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const labels = logs.map((l) => formatLabel(l.date));

  // Determine bar color per day: green = completed workout, blue = mobility, gray = missed
  const values = logs.map(() => 1); // uniform height
  const barColors = logs.map((l) => {
    if (l.workout_completed) {
      const type = (l.workout_type || '').toLowerCase();
      if (type.includes('mobility') || type.includes('stretch') || type.includes('recovery')) {
        return currentTheme.info; // mobility day
      }
      return currentTheme.success; // workout completed
    }
    return currentTheme.grid; // missed
  });

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Workout',
          data: values,
          backgroundColor: barColors,
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 4,
          barPercentage: 0.85,
          categoryPercentage: 0.9,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          display: false,
          max: 1.2,
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (tooltipItem) => {
              const log = logs[tooltipItem.dataIndex];
              if (!log.workout_completed) return 'Missed';
              const type = log.workout_type || 'Workout';
              return `✓ ${type}`;
            },
          },
        },
        legend: {
          display: true,
          labels: {
            generateLabels: () => [
              {
                text: 'Workout',
                fillStyle: currentTheme.success,
                strokeStyle: 'transparent',
                lineWidth: 0,
              },
              {
                text: 'Mobility',
                fillStyle: currentTheme.info,
                strokeStyle: 'transparent',
                lineWidth: 0,
              },
              {
                text: 'Missed',
                fillStyle: currentTheme.grid,
                strokeStyle: 'transparent',
                lineWidth: 0,
              },
            ],
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/* ═════════════════════════════════════════════════════════════════════════════
   6. COMPLIANCE SCORE CHART
   ═════════════════════════════════════════════════════════════════════════ */

export function renderComplianceChart(canvasId, range = '30d') {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const logs = filterByRange(allLogs, range).filter((l) => l.score != null);

  if (logs.length === 0) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const labels = logs.map((l) => formatLabel(l.date));
  const scores = logs.map((l) => l.score);
  const ma7 = movingAverage(scores, 7);

  // Zone-based point coloring
  const pointColors = scores.map((s) => {
    if (s >= 85) return currentTheme.success;
    if (s >= 70) return currentTheme.info;
    if (s >= 55) return currentTheme.warning;
    return currentTheme.danger;
  });

  const gradient = createGradient(ctx, currentTheme.primary, currentTheme.primaryFade);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Daily Score',
          data: scores,
          borderColor: currentTheme.primary,
          backgroundColor: gradient,
          fill: true,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: 3,
          order: 2,
        },
        {
          label: '7-Day Average',
          data: ma7,
          borderColor: currentTheme.warning,
          backgroundColor: 'transparent',
          fill: false,
          borderDash: [5, 3],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          order: 1,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: 'Score', color: currentTheme.text },
          grid: { color: currentTheme.grid },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: currentTheme.text },
        },
        annotation: {
          annotations: {
            greenZone: {
              type: 'box',
              yMin: 85,
              yMax: 100,
              backgroundColor: currentTheme.successFade,
              borderWidth: 0,
            },
            blueZone: {
              type: 'box',
              yMin: 70,
              yMax: 85,
              backgroundColor: currentTheme.infoFade,
              borderWidth: 0,
            },
            amberZone: {
              type: 'box',
              yMin: 55,
              yMax: 70,
              backgroundColor: currentTheme.warningFade,
              borderWidth: 0,
            },
            redZone: {
              type: 'box',
              yMin: 0,
              yMax: 55,
              backgroundColor: currentTheme.dangerFade,
              borderWidth: 0,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => {
              const val = tooltipItem.parsed.y;
              let zone = 'High-Risk';
              if (val >= 85) zone = 'Excellent';
              else if (val >= 70) zone = 'Good';
              else if (val >= 55) zone = 'Needs Correction';
              return `${val}/100 — ${zone}`;
            },
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/* ═════════════════════════════════════════════════════════════════════════════
   7. GOAL TRAJECTORY CHART
   ═════════════════════════════════════════════════════════════════════════ */

export function renderTrajectoryChart(canvasId) {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const profile = getProfile() || {};
  const startWeight = profile.start_weight_kg || 90;
  const targetWeight = profile.target_weight_kg || 81;
  const totalWeeks = 12;

  // Expected trajectory: linear decline from start to target
  const trajectory = calculateGoalTrajectory
    ? calculateGoalTrajectory()
    : null;

  // Fallback: generate linear trajectory manually
  const expectedLabels = [];
  const expectedWeights = [];
  for (let w = 0; w <= totalWeeks; w++) {
    expectedLabels.push(`Wk ${w}`);
    expectedWeights.push(
      +(startWeight - ((startWeight - targetWeight) / totalWeeks) * w).toFixed(1)
    );
  }

  // Actual weight data mapped to weeks
  const allLogs = getConsolidatedDailyLogs();
  const weightLogs = allLogs.filter((l) => l.weight_kg != null);

  if (weightLogs.length === 0) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const firstDate = new Date(weightLogs[0].date + 'T00:00:00');
  const actualWeights = expectedLabels.map((_, weekIdx) => {
    const weekStart = new Date(firstDate);
    weekStart.setDate(weekStart.getDate() + weekIdx * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekLogs = weightLogs.filter((l) => {
      const d = new Date(l.date + 'T00:00:00');
      return d >= weekStart && d <= weekEnd;
    });

    if (weekLogs.length === 0) return null;
    return +(weekLogs.reduce((s, l) => s + l.weight_kg, 0) / weekLogs.length).toFixed(1);
  });

  // Use trajectory data if available
  const trajectoryLabels = trajectory ? trajectory.map((t) => t.label) : expectedLabels;
  const trajectoryWeights = trajectory ? trajectory.map((t) => t.expected) : expectedWeights;
  const trajectoryActual = trajectory ? trajectory.map((t) => t.actual) : actualWeights;

  const gradient = createGradient(ctx, currentTheme.primary, currentTheme.primaryFade);

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trajectoryLabels,
      datasets: [
        {
          label: 'Expected',
          data: trajectoryWeights,
          borderColor: currentTheme.text,
          backgroundColor: 'transparent',
          borderDash: [8, 4],
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: currentTheme.text,
          fill: false,
          order: 2,
        },
        {
          label: 'Actual',
          data: trajectoryActual,
          borderColor: currentTheme.primary,
          backgroundColor: gradient,
          fill: true,
          pointBackgroundColor: currentTheme.primary,
          pointBorderColor: currentTheme.primary,
          spanGaps: true,
          order: 1,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          title: { display: true, text: 'kg', color: currentTheme.text },
          grid: { color: currentTheme.grid },
          suggestedMin: targetWeight - 2,
          suggestedMax: startWeight + 1,
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: currentTheme.text },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => {
              const ds = tooltipItem.dataset.label;
              const val = tooltipItem.parsed.y;
              return val != null ? `${ds}: ${val} kg` : `${ds}: —`;
            },
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/* ═════════════════════════════════════════════════════════════════════════════
   8. CLEAN FOOD STREAK CHART
   ═════════════════════════════════════════════════════════════════════════ */

export function renderStreakChart(canvasId, range = '30d') {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const logs = filterByRange(allLogs, range);

  if (logs.length === 0) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const labels = logs.map((l) => formatLabel(l.date));

  // A day is "clean" if no biscuits, no sweets, and no namkeen
  const cleanDays = logs.map(
    (l) => (l.no_biscuits && l.no_sweets && l.no_namkeen) ? 1 : 0
  );

  const barColors = cleanDays.map((c) =>
    c === 1 ? currentTheme.success : currentTheme.danger
  );

  // Calculate longest streak
  let longestStreak = 0;
  let longestStreakEnd = 0;
  let currentStreak = 0;
  cleanDays.forEach((c, i) => {
    if (c === 1) {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakEnd = i;
      }
    } else {
      currentStreak = 0;
    }
  });

  const annotations = {};
  if (longestStreak > 0) {
    const streakStart = longestStreakEnd - longestStreak + 1;
    annotations.streakBox = {
      type: 'box',
      xMin: streakStart - 0.5,
      xMax: longestStreakEnd + 0.5,
      backgroundColor: currentTheme.successFade,
      borderColor: currentTheme.targetBorder,
      borderWidth: 1,
      label: {
        display: true,
        content: `Best streak: ${longestStreak} days`,
        position: 'start',
        color: currentTheme.success,
        font: { size: 10, weight: '600' },
        backgroundColor: 'transparent',
      },
    };
  }

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Clean Day',
          data: cleanDays,
          backgroundColor: barColors,
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 4,
          barPercentage: 0.85,
          categoryPercentage: 0.9,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          display: false,
          max: 1.3,
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        annotation: { annotations },
        tooltip: {
          callbacks: {
            label: (tooltipItem) =>
              tooltipItem.parsed.y === 1 ? '✓ Clean' : '✗ Not clean',
          },
        },
        legend: {
          display: true,
          labels: {
            generateLabels: () => [
              {
                text: 'Clean',
                fillStyle: currentTheme.success,
                strokeStyle: 'transparent',
                lineWidth: 0,
              },
              {
                text: 'Not Clean',
                fillStyle: currentTheme.danger,
                strokeStyle: 'transparent',
                lineWidth: 0,
              },
            ],
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/**
 * Render a mixed correlation chart showing Steps (bars) and Triglycerides (line)
 */
export function renderCorrelationChart(canvasId, range = '30d') {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const logs = filterByRange(allLogs, range);

  if (logs.length === 0) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const labels = logs.map((l) => formatLabel(l.date));
  const steps = logs.map((l) => l.steps || 0);
  const triglycerides = logs.map((l) => l.triglycerides_val);

  // Check if we have any valid data to show
  const hasSteps = steps.some(s => s > 0);
  const hasTriglycerides = triglycerides.some(t => t != null);

  if (!hasSteps && !hasTriglycerides) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const chart = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Steps',
          data: steps,
          backgroundColor: currentTheme.success,
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 6,
          yAxisID: 'y',
          barPercentage: 0.6,
        },
        {
          type: 'line',
          label: 'Triglycerides (mg/dL)',
          data: triglycerides,
          borderColor: currentTheme.info,
          backgroundColor: 'transparent',
          pointBackgroundColor: currentTheme.info,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
          tension: 0.35,
          yAxisID: 'y2',
          spanGaps: true,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          title: { display: true, text: 'Steps', color: currentTheme.text },
          grid: { color: currentTheme.grid },
        },
        y2: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: false,
          title: { display: true, text: 'Triglycerides (mg/dL)', color: currentTheme.text },
          grid: { drawOnChartArea: false },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: currentTheme.text,
            boxWidth: 12,
            font: { size: 11 },
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/**
 * Render a beautiful biometric steps trend bar chart on the dashboard
 */
export function renderDashboardTrendChart(canvasId) {
  const ctx = getCanvasCtx(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);

  const allLogs = getConsolidatedDailyLogs();
  const last7Logs = allLogs.slice(-7);

  if (last7Logs.length === 0) {
    drawEmptyState(ctx, canvasId);
    return;
  }

  const labels = last7Logs.map((l) => formatLabel(l.date));
  const steps = last7Logs.map((l) => l.steps || 0);

  // Gradient background for bars
  let gradientFill = currentTheme.primary;
  try {
    gradientFill = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradientFill.addColorStop(0, '#3b82f6');
    gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.15)');
  } catch (err) {
    console.warn("Could not create gradient for dashboardTrendChart", err);
  }

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Steps',
          data: steps,
          backgroundColor: gradientFill,
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      animation: animationConfig(),
      scales: {
        y: {
          display: false,
          beginAtZero: true,
        },
        x: {
          grid: { display: false },
          ticks: {
            color: currentTheme.text,
            font: { size: 10 },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => `${tooltipItem.parsed.y.toLocaleString()} steps`,
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
}

/* ═════════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Render all charts with the given range.
 */
export function renderAllCharts(range = '30d') {
  configureChartDefaults();

  renderWeightChart('weightChart', range);
  renderWaistChart('waistChart', range);
  renderStepsChart('stepsChart', range);
  renderProteinChart('proteinChart', range);
  renderWorkoutHeatmap('workoutHeatmap', range);
  renderComplianceChart('complianceChart', range);
  renderTrajectoryChart('trajectoryChart');
  renderStreakChart('streakChart', range);
  renderCorrelationChart('correlationChart', range);
  renderDashboardTrendChart('dashboardTrendChart');
}

/**
 * Destroy all active chart instances.
 */
export function destroyAllCharts() {
  for (const [canvasId, chart] of chartInstances) {
    chart.destroy();
  }
  chartInstances.clear();
}

/**
 * Toggle theme for all charts and re-render.
 * @param {boolean} isDark — true for dark theme, false for light
 */
export function updateChartsTheme(isDark) {
  updateChartTheme(isDark);

  // Re-render all existing charts with new colors
  const existingCanvasIds = [...chartInstances.keys()];
  destroyAllCharts();

  // Re-render each chart that was previously active
  for (const canvasId of existingCanvasIds) {
    const el = document.getElementById(canvasId);
    if (!el) continue;

    // Determine which render function to call based on canvas ID
    const range = el.dataset.range || '30d';
    switch (canvasId) {
      case 'weightChart':
        renderWeightChart(canvasId, range);
        break;
      case 'waistChart':
        renderWaistChart(canvasId, range);
        break;
      case 'stepsChart':
        renderStepsChart(canvasId, range);
        break;
      case 'proteinChart':
        renderProteinChart(canvasId, range);
        break;
      case 'workoutHeatmap':
        renderWorkoutHeatmap(canvasId, range);
        break;
      case 'complianceChart':
        renderComplianceChart(canvasId, range);
        break;
      case 'trajectoryChart':
        renderTrajectoryChart(canvasId);
        break;
      case 'streakChart':
        renderStreakChart(canvasId, range);
        break;
      case 'correlationChart':
        renderCorrelationChart(canvasId, range);
        break;
      case 'dashboardTrendChart':
        renderDashboardTrendChart(canvasId);
        break;
      default:
        break;
    }
  }
}
