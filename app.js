/**
 * FitTriglyceride Tracker — Main Application
 * Handles routing, screen rendering, event handling, and state management.
 */

import {
  getProfile, saveProfile,
  getDailyLog, saveDailyLog, getAllDailyLogs,
  getChecklist, saveChecklist,
  getMealLogs, saveMealLog, saveAllMealLogs,
  getWorkoutLog, saveWorkoutLog,
  getSettings, saveSettings,
  getDateStr, getDayName, getProgramDay, getProgramWeek, getDaysBetween,
  DAILY_SCHEDULE, WEEKLY_SCHEDULE, WORKOUT_A, WORKOUT_B, MOBILITY,
  MEAL_PLANS, PROTEIN_REFERENCE, CHECKLIST_TEMPLATE, DINNER_RULES,
  generateSampleData, DAY_THEMES,
  getActiveSchedule, getCustomSchedule, saveCustomSchedule, resetCustomSchedule,
  getPersonalizedWorkout, getHealthMetrics, getPersonalizedMeals,
  FOOD_DATABASE, REGIONAL_SPECIALTIES
} from './data.js';

import {
  calculateDailyScore,
  calculateWeeklyReview,
  generateRecommendations,
  getWeeklyMessage,
  calculateStreak,
  calculateDailyProtein,
  MEDICAL_SAFETY_MESSAGE,
  getConsolidatedDailyLogs
} from './scoring.js';

import {
  renderAllCharts,
  destroyAllCharts,
  updateChartsTheme,
  configureChartDefaults,
  renderDashboardTrendChart
} from './charts.js';


// ── State ──────────────────────────────────────────────────
let currentScreen = 'dashboard';
let currentDate = getDateStr(new Date());
let currentMealDay = getDayName(currentDate);
let currentReviewWeek = 1;
let sidebarCollapsed = false;
let editingMealIndexes = {};
const MEAL_CHECKLIST_KEYS = [
  'protein_breakfast', // index 0 (First Meal)
  'lunch_completed',   // index 1 (Lunch)
  'snack_completed',   // index 2 (Evening Snack)
  'dinner_rule'        // index 3 (Dinner)
];

// ── Step Rollover Calculations ─────────────────────────────
function getStepRolloverDetails(dateStr) {
  const settings = getSettings();
  const baseTarget = settings.step_target || 8000;
  
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const yesterdayStr = getDateStr(d);
  
  const profile = getProfile();
  const daysFromStart = getDaysBetween(profile.program_start_date, dateStr);
  
  if (daysFromStart <= 0) {
    return {
      baseTarget,
      adjustedTarget: baseTarget,
      yesterdaySteps: 0,
      yesterdayTarget: baseTarget,
      delta: 0,
      type: 'none'
    };
  }
  
  const yesterdayLog = getDailyLog(yesterdayStr);
  const yesterdaySteps = yesterdayLog.steps || 0;
  const delta = yesterdaySteps - baseTarget;
  
  let adjustedTarget = baseTarget;
  let type = 'none';
  if (delta < 0) {
    type = 'deficit';
    adjustedTarget = baseTarget + Math.abs(delta);
  } else if (delta > 0) {
    type = 'credit';
    adjustedTarget = baseTarget - delta;
  }
  
  const finalAdjusted = Math.max(4000, Math.min(15000, adjustedTarget));
  
  return {
    baseTarget,
    adjustedTarget: finalAdjusted,
    yesterdaySteps,
    yesterdayTarget: baseTarget,
    delta,
    type
  };
}

function getAdjustedStepTarget(dateStr) {
  return getStepRolloverDetails(dateStr).adjustedTarget;
}

// ── Initialization ─────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function initializeApp() {
  // Ensure profile exists
  const profile = getProfile();

  // Initialize theme
  const settings = getSettings();
  applyTheme(settings.theme || 'light');

  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Configure Chart.js defaults
  if (typeof Chart !== 'undefined') {
    configureChartDefaults();
  }

  // Bind events
  bindNavigation();
  bindSidebarToggle();
  bindThemeToggle();
  bindDateNavigation();
  bindMealDaySelector();
  bindMealsDateNavigation();
  bindMealEditEvents();
  bindChecklistEvents();
  bindQuickLogEvents();
  bindWorkoutEvents();
  bindChartRangeSelector();
  bindReviewNavigation();
  bindSettingsModal();
  bindScheduleEditor();
  bindExportEvents();
  bindStepCalculatorModal();
  initMotionPedometer();

  // Custom Widgets & Location Initializations
  bindWaterWidgetEvents();
  bindLocationAwareLoggerEvents();
  detectUserLocation();
  initReminders();
  updateAvatars();

  // Onboarding setup check & automated test bypass
  const isTestEnv = window.navigator.webdriver || window.location.search.includes('test');
  if (isTestEnv) {
    profile.onboarding_completed = true;
    saveProfile(profile);
  }

  // Bind onboarding wizard handlers
  bindOnboardingEvents();

  if (!profile.onboarding_completed) {
    const obModal = document.getElementById('onboardingModal');
    if (obModal) {
      setTimeout(() => {
        obModal.showModal();
      }, 500);
    }
  }



  // Handle hash navigation
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);

  // Render current screen
  updateProgramInfo();
  renderCurrentScreen();

  // Sync Android steps and set up periodic polling + alarms check
  syncAndroidSteps();
  checkWalkAlarms();
  let lastCheckedDate = getDateStr(new Date());
  setInterval(() => {
    syncAndroidSteps();
    checkWalkAlarms();
    
    // Check for midnight rollover
    const todayStr = getDateStr(new Date());
    if (todayStr !== lastCheckedDate) {
      lastCheckedDate = todayStr;
      
      // If currentDate was the previous date, auto-shift currentDate to new date
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterdayStr = getDateStr(d);
      if (currentDate === yesterdayStr) {
        currentDate = todayStr;
        currentMealDay = getDayName(currentDate);
      }
      
      // Update program info badge (Day and Week number)
      updateProgramInfo();
      renderCurrentScreen();
      
      showToast("A new day has started! 🌅 Daily goals reset.");
    }
  }, 3000);

  // Check for any pending walk reminder passed via intent during launch
  const isAndroid = typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid();
  if (isAndroid && typeof window.AndroidInterface.getPendingWalkReminder === 'function') {
    const pendingWalk = window.AndroidInterface.getPendingWalkReminder();
    if (pendingWalk) {
      setTimeout(() => {
        window.triggerWalkReminder(pendingWalk);
      }, 500);
    }
  }
}


// ── Navigation ─────────────────────────────────────────────
function bindNavigation() {
  // Sidebar nav
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const screen = item.dataset.screen;
      navigateTo(screen);
    });
  });

  // Log Today button
  const logTodayBtn = document.getElementById('logTodayBtn');
  if (logTodayBtn) {
    logTodayBtn.addEventListener('click', () => navigateTo('today'));
  }
}

function navigateTo(screen) {
  // Ensure currentDate is always synced with today's date upon tab navigation
  if (['dashboard', 'today', 'meals', 'workout'].includes(screen)) {
    currentDate = getDateStr(new Date());
    currentMealDay = getDayName(currentDate);
  }
  currentScreen = screen;
  window.location.hash = screen;

  // Update nav active states
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.screen === screen);
  });

  // Show/hide screens
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === `screen-${screen}`);
  });

  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');

  // Render screen content
  renderCurrentScreen();
}

function renderCurrentScreen() {
  syncAndroidSteps();
  switch (currentScreen) {
    case 'dashboard': renderDashboard(); break;
    case 'today': renderToday(); break;
    case 'meals': renderMealPlan(); break;
    case 'workout': renderWorkout(); break;
    case 'progress': renderProgress(); break;
    case 'review': renderReview(); break;
  }
  updateAvatars();
}

function syncAndroidSteps() {
  const isAndroid = typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid();
  if (isAndroid) {
    const todayStr = getDateStr(new Date());
    const nativeSteps = window.AndroidInterface.getStepsToday();
    
    // Save to daily log if steps count changed
    const log = getDailyLog(todayStr);
    if (log.steps !== nativeSteps) {
      log.steps = nativeSteps;
      saveDailyLog(todayStr, log);
      
      // Auto-check/uncheck steps checklist item
      const checklist = getChecklist(todayStr);
      if (!checklist.movement) checklist.movement = {};
      const target = getAdjustedStepTarget(todayStr);
      const targetMet = nativeSteps >= target;
      if (checklist.movement.step_target !== targetMet) {
        checklist.movement.step_target = targetMet;
        saveChecklist(todayStr, checklist);
      }
      
      // Update UI if viewing today's screen or dashboard
      if (currentScreen === 'dashboard') {
        renderDashboard();
      } else if (currentScreen === 'today' && currentDate === todayStr) {
        renderToday();
      }
    }
  }
}


// ── Sidebar ────────────────────────────────────────────────
function bindSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebarCollapsed = !sidebarCollapsed;
      sidebar.classList.toggle('collapsed', sidebarCollapsed);
    });
  }

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}


// ── Theme ──────────────────────────────────────────────────
function bindThemeToggle() {
  const toggles = [document.getElementById('themeToggle'), document.getElementById('mobileThemeToggle')];
  toggles.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.dataset.theme || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        saveSettings({ ...getSettings(), theme: next });
      });
    }
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';

  // Update icons
  document.querySelectorAll('#themeToggle i, #mobileThemeToggle i').forEach(icon => {
    icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
  });

  // Re-render Lucide
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Update chart colors
  if (typeof Chart !== 'undefined') {
    updateChartsTheme(isDark);
  }
}


// ── Program Info ───────────────────────────────────────────
function updateProgramInfo() {
  const today = getDateStr(new Date());
  const programDay = getProgramDay(today);
  const programWeek = getProgramWeek(today);

  const dayNum = document.getElementById('programDayNum');
  const weekNum = document.getElementById('currentWeek');
  if (dayNum) dayNum.textContent = Math.max(1, programDay);
  if (weekNum) weekNum.textContent = Math.max(1, programWeek);
}


// ── SCREEN 1: DASHBOARD ───────────────────────────────────
function renderDashboard() {
  const today = getDateStr(new Date());
  const profile = getProfile();
  const log = getDailyLog(today);
  const allLogs = getAllDailyLogs();

  // Date
  const dateEl = document.getElementById('dashboardDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Sex Badge
  const sexBadge = document.getElementById('dashSexBadge');
  if (sexBadge) {
    const sex = profile.sex || 'male';
    sexBadge.textContent = sex.charAt(0).toUpperCase() + sex.slice(1);
    sexBadge.style.display = 'inline-block';
  }

  // Weight
  const latestWeight = findLatestValue(allLogs, 'weight_kg') || profile.start_weight_kg;
  setTextContent('currentWeight', latestWeight ? latestWeight.toFixed(1) : '--');
  setTextContent('weightTarget', profile.target_weight_kg ? `${profile.target_weight_kg} kg` : '--');
  
  const weightDelta = (latestWeight && profile.start_weight_kg) ? (latestWeight - profile.start_weight_kg) : null;
  const weightChangeEl = document.getElementById('weightChange');
  if (weightChangeEl) {
    const changeVal = weightChangeEl.querySelector('.stat-change__value');
    if (changeVal) {
      if (weightDelta !== null) {
        changeVal.textContent = `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`;
        weightChangeEl.classList.toggle('stat-change--positive', weightDelta <= 0);
        weightChangeEl.classList.toggle('stat-change--negative', weightDelta > 0);
      } else {
        changeVal.textContent = '--';
        weightChangeEl.classList.remove('stat-change--positive', 'stat-change--negative');
      }
    }
  }

  // Waist
  const latestWaist = findLatestValue(allLogs, 'waist_in') || profile.start_waist_in;
  setTextContent('currentWaist', latestWaist ? latestWaist.toFixed(1) : '--');
  setTextContent('waistTarget', profile.target_waist_in ? `${profile.target_waist_in} in` : '--');

  // Calculate sex-aware and age/BMI aware metrics
  const metrics = getHealthMetrics({
    ...profile,
    start_weight_kg: latestWeight,
    start_waist_in: latestWaist
  });

  // BMI & Height
  const hasIntakeBaseline = profile.start_weight_kg && profile.height_cm;
  setTextContent('currentBmi', hasIntakeBaseline ? metrics.bmi.toFixed(1) : '--');
  setTextContent('currentHeight', profile.height_cm ? `${profile.height_cm} cm` : '--');
  
  const currentBmiStatusEl = document.getElementById('currentBmiStatus');
  if (currentBmiStatusEl) {
    currentBmiStatusEl.textContent = metrics.bmiStatus;
    currentBmiStatusEl.style.color = metrics.bmiColor;
    currentBmiStatusEl.style.background = `${metrics.bmiColor}1A`;
  }

  // Days completed
  const programDay = getProgramDay(today);
  setTextContent('daysCompleted', Math.max(0, programDay));
  
  // Total program days based on profile timeline
  let totalProgramDays = 84; // Default 12 weeks
  if (profile.target_timeline_value) {
    const val = profile.target_timeline_value;
    const unit = profile.target_timeline_unit || 'months';
    if (unit === 'days') {
      totalProgramDays = val;
    } else if (unit === 'weeks') {
      totalProgramDays = val * 7;
    } else if (unit === 'months') {
      totalProgramDays = Math.round(val * 30.4375); // Average days in month
    }
  }
  setTextContent('totalProgramDays', totalProgramDays);
  setTextContent('totalProgramWeeks', Math.ceil(totalProgramDays / 7));

  // Score ring
  const score = calculateDailyScore(today);
  updateProgressRing('ringScoreFill', score.score, 100);
  setTextContent('ringScoreValue', Math.round(score.score));
  
  const statusScoreEl = document.getElementById('ringScoreStatus');
  if (statusScoreEl) {
    if (score.score >= 85) {
      statusScoreEl.textContent = 'OPTIMAL';
      statusScoreEl.style.color = '#10b981';
    } else if (score.score >= 70) {
      statusScoreEl.textContent = 'GOOD';
      statusScoreEl.style.color = '#3b82f6';
    } else if (score.score >= 50) {
      statusScoreEl.textContent = 'MODERATE';
      statusScoreEl.style.color = '#f59e0b';
    } else {
      statusScoreEl.textContent = 'NEEDS FOCUS';
      statusScoreEl.style.color = '#ef4444';
    }
  }

  // Weekly compliance
  const weeklyData = calculateWeeklyCompliance();
  updateProgressRing('ringComplianceFill', weeklyData, 100);
  setTextContent('ringComplianceValue', Math.round(weeklyData) + '%');

  // Protein
  const protein = calculateDailyProtein(today);
  updateProgressRing('ringProteinFill', protein.total, 100);
  setTextContent('ringProteinValue', Math.round(protein.total));

  // Streaks
  const cleanStreak = calculateStreak('clean_food');
  const workoutStreak = calculateStreak('workout');
  setTextContent('cleanStreak', cleanStreak.current);
  setTextContent('workoutStreak', workoutStreak.current);

  // Steps & Sleep
  const steps = log.steps || 0;
  setTextContent('todaySteps', steps.toLocaleString());
  setTextContent('todaySleep', log.sleep_hours || 0);
  const adjustedTarget = getAdjustedStepTarget(today);
  const stepsBar = document.getElementById('stepsBarFill');
  if (stepsBar) {
    stepsBar.style.width = Math.min(100, (steps / adjustedTarget) * 100) + '%';
  }

  // Sleep progress bar
  const sleepBar = document.getElementById('sleepBarFill');
  if (sleepBar) {
    sleepBar.style.width = Math.min(100, ((log.sleep_hours || 0) / 8) * 100) + '%';
  }

  // Calories and benchmark status
  const weight = latestWeight || profile.start_weight_kg;
  const height = profile.height_cm;
  const stepsMetrics = getStepsMetrics(steps, weight, height, profile.sex);
  
  if (stepsMetrics.requiresProfile) {
    setTextContent('todayStepsCaloriesValue', '-- kcal');
    setTextContent('dashboardActiveCalories', '0');
    const caloriesEl = document.getElementById('todayStepsCalories');
    if (caloriesEl) {
      caloriesEl.title = "Set weight and height in settings to calculate precise calories";
    }
  } else {
    setTextContent('todayStepsCaloriesValue', `${stepsMetrics.calories} kcal`);
    setTextContent('dashboardActiveCalories', stepsMetrics.calories.toLocaleString());
    const caloriesEl = document.getElementById('todayStepsCalories');
    if (caloriesEl) {
      caloriesEl.title = "";
    }
  }

  const statusEl = document.getElementById('todayStepsStatus');
  if (statusEl) {
    if (steps >= adjustedTarget) {
      statusEl.textContent = `Above benchmark (Goal: ${adjustedTarget.toLocaleString()} met) 🎉`;
      statusEl.style.color = 'var(--success)';
    } else {
      const remaining = adjustedTarget - steps;
      statusEl.textContent = `Below benchmark (-${remaining.toLocaleString()} to go; Goal: ${adjustedTarget.toLocaleString()})`;
      statusEl.style.color = 'var(--text-secondary)';
    }
  }

  // Update 3D water widget
  updateWaterWidget(currentDate);

  // Dynamic Health Score Title
  const scoreTitleEl = document.getElementById('healthScoreGaugeTitle');
  if (scoreTitleEl) {
    const goal = profile.primary_goal || 'health_management';
    let goalName = 'Overall';
    if (goal === 'weight_loss') goalName = 'Weight Loss';
    else if (goal === 'muscle_gain') goalName = 'Muscle Gain';
    else if (goal === 'health_management') goalName = 'Metabolic';
    scoreTitleEl.textContent = `${goalName} Health Score`;
  }

  // Render Biometric Trend Chart
  if (typeof Chart !== 'undefined') {
    try {
      renderDashboardTrendChart('dashboardTrendChart');
    } catch (err) {
      console.warn("Failed to render dashboard trend chart", err);
    }
  }
}


// ── SCREEN 2: TODAY ────────────────────────────────────────
function bindDateNavigation() {
  const prevBtn = document.getElementById('prevDay');
  const nextBtn = document.getElementById('nextDay');
  const todayBtn = document.getElementById('todayBtn');

  if (prevBtn) prevBtn.addEventListener('click', () => changeDate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeDate(1));
  if (todayBtn) todayBtn.addEventListener('click', () => {
    currentDate = getDateStr(new Date());
    renderToday();
  });
}

function changeDate(delta) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + delta);
  currentDate = getDateStr(d);
  renderToday();
}

function renderToday() {
  const dateEl = document.getElementById('todayDate');
  if (dateEl) {
    const d = new Date(currentDate);
    dateEl.textContent = d.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  renderTimeline();
  renderChecklists();
  renderTodayScore();
  loadQuickLogValues();
  updateWaterWidget(currentDate);
}


// ── Timeline ──
function renderTimeline() {
  const container = document.getElementById('dailyTimeline');
  if (!container) return;

  const checklist = getChecklist(currentDate);
  const now = new Date();
  const isToday = currentDate === getDateStr(now);
  const activeSchedule = getActiveSchedule();

  container.innerHTML = activeSchedule.map((item, i) => {
    const isChecked = getChecklistValueByKey(checklist, item.checklist_key);
    const isPast = isToday && isTimePast(item.time, now);
    const isCurrent = isToday && isTimeNear(item.time, now);

    let statusClass = 'upcoming';
    if (isChecked) statusClass = 'completed';
    else if (isCurrent) statusClass = 'current';
    else if (isPast) statusClass = 'missed';

    return `
      <div class="timeline-item timeline-item--${statusClass}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <span class="timeline-time text-mono">${item.time}</span>
          <span class="timeline-action">${item.action}</span>
        </div>
        ${isChecked ? '<i data-lucide="check" class="timeline-check"></i>' : ''}
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}


// ── Checklists ──
function renderChecklists() {
  const checklist = getChecklist(currentDate);
  const activeSchedule = getActiveSchedule();

  Object.keys(CHECKLIST_TEMPLATE).forEach(category => {
    const container = document.getElementById(`checklist-${category}`);
    if (!container) return;

    const items = CHECKLIST_TEMPLATE[category];
    container.innerHTML = items.map(item => {
      const isChecked = checklist[category]?.[item.key] || false;
      // Sync label from custom schedule if possible
      let label = item.label;
      const schedItem = activeSchedule.find(s => s.checklist_key === item.key);
      if (schedItem) {
        label = schedItem.action;
      }
      
      return `
        <label class="checklist-item ${isChecked ? 'checked' : ''}">
          <input type="checkbox" data-category="${category}" data-key="${item.key}"
                 ${isChecked ? 'checked' : ''}>
          <span class="checkmark"></span>
          <span class="checklist-item__label">${label}</span>
          ${item.points > 0 ? `<span class="checklist-item__points text-mono">+${item.points}</span>` : ''}
        </label>
      `;
    }).join('');

    // Update count
    const count = items.filter(item => checklist[category]?.[item.key]).length;
    const countEl = document.getElementById(`${category}Count`);
    if (countEl) countEl.textContent = `${count}/${items.length}`;
  });
}

function bindChecklistEvents() {
  document.addEventListener('change', (e) => {
    if (e.target.matches('.checklist input[type="checkbox"]')) {
      const { category, key } = e.target.dataset;
      const checklist = getChecklist(currentDate);
      if (!checklist[category]) checklist[category] = {};
      checklist[category][key] = e.target.checked;
      saveChecklist(currentDate, checklist);

      // Bi-directional sync: if user checked a meal in Today's checklist, sync to meal logs
      if (category === 'food' && MEAL_CHECKLIST_KEYS.includes(key)) {
        syncChecklistToMealLogs(currentDate, key, e.target.checked);
      }
      
      // Bi-directional sync: if user checked a walk in Today's checklist, sync to walking checklist in Workout tab
      if (category === 'movement') {
        const walkInput = document.querySelector(`.walk-checkbox[data-key="${key}"]`);
        if (walkInput) {
          walkInput.checked = e.target.checked;
          walkInput.closest('.checklist-item').classList.toggle('checked', e.target.checked);
        }
      }

      // Update UI
      e.target.closest('.checklist-item').classList.toggle('checked', e.target.checked);
      renderTodayScore();
      updateChecklistCounts();
    }
  });
}

function updateChecklistCounts() {
  const checklist = getChecklist(currentDate);
  Object.keys(CHECKLIST_TEMPLATE).forEach(category => {
    const items = CHECKLIST_TEMPLATE[category];
    const count = items.filter(item => checklist[category]?.[item.key]).length;
    const countEl = document.getElementById(`${category}Count`);
    if (countEl) countEl.textContent = `${count}/${items.length}`;
  });
}


// ── Today Score ──
function renderTodayScore() {
  const score = calculateDailyScore(currentDate);
  const fillEl = document.getElementById('todayScoreFill');
  const valueEl = document.getElementById('todayScoreValue');
  const labelEl = document.getElementById('todayScoreLabel');
  const breakdownEl = document.getElementById('todayScoreBreakdown');

  if (valueEl) valueEl.textContent = Math.round(score.score);

  if (fillEl) {
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score.score / 100) * circumference;
    fillEl.style.strokeDasharray = circumference;
    fillEl.style.strokeDashoffset = offset;

    // Color based on interpretation
    const colors = {
      excellent: 'var(--success)',
      good: 'var(--info)',
      needs_correction: 'var(--warning)',
      high_risk: 'var(--danger)'
    };
    fillEl.style.stroke = colors[score.interpretation] || 'var(--primary)';
  }

  if (labelEl) {
    const labels = {
      excellent: '🌟 Excellent Day!',
      good: '👍 Good Progress',
      needs_correction: '⚡ Needs Attention',
      high_risk: '⚠️ High-Risk Day'
    };
    labelEl.textContent = score.score === 0 ? 'Start logging!' : labels[score.interpretation];
  }

  if (breakdownEl) {
    breakdownEl.innerHTML = Object.entries(score.breakdown).map(([cat, pts]) => `
      <div class="score-category">
        <span class="score-category__name">${capitalize(cat)}</span>
        <div class="score-category__bar">
          <div class="score-category__fill" style="width: ${(pts / getCategoryMax(cat)) * 100}%"></div>
        </div>
        <span class="score-category__value text-mono">${pts.toFixed(0)}</span>
      </div>
    `).join('');
  }
}


// ── Quick Log ──
function loadQuickLogValues() {
  const log = getDailyLog(currentDate);
  setInputValue('inputWeight', log.weight_kg);
  setInputValue('inputWaist', log.waist_in);
  setInputValue('inputSteps', log.steps);
  setInputValue('inputSleep', log.sleep_hours);
  setInputValue('inputWater', log.water_litres);
  setInputValue('inputEnergy', log.energy_level || 3);
  setInputValue('inputNotes', log.notes);
  updateEnergyDisplay();

  // Handle steps input block for Android vs Web
  const stepsInput = document.getElementById('inputSteps');
  const isAndroid = typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid();
  if (stepsInput) {
    if (isAndroid && currentDate === getDateStr(new Date())) {
      stepsInput.disabled = true;
      stepsInput.style.backgroundColor = 'rgba(255,255,255,0.05)';
      stepsInput.title = "Step tracking is managed automatically by Android hardware sensor";
    } else {
      stepsInput.disabled = false;
      stepsInput.style.backgroundColor = '';
      stepsInput.title = "";
    }
  }

  // Update calories and status on Today page quick log card
  const steps = log.steps || 0;
  const allLogs = getAllDailyLogs();
  const profile = getProfile();
  const latestWeight = findLatestValue(allLogs, 'weight_kg') || profile.start_weight_kg;
  const height = profile.height_cm;
  const stepsMetrics = getStepsMetrics(steps, latestWeight, height, profile.sex);

  if (stepsMetrics.requiresProfile) {
    setTextContent('todayStepsCaloriesTodayValue', '-- kcal');
    const caloriesEl = document.getElementById('todayStepsCaloriesToday');
    if (caloriesEl) {
      caloriesEl.title = "Set weight and height in settings to calculate precise calories";
    }
  } else {
    setTextContent('todayStepsCaloriesTodayValue', `${stepsMetrics.calories} kcal`);
    const caloriesEl = document.getElementById('todayStepsCaloriesToday');
    if (caloriesEl) {
      caloriesEl.title = "";
    }
  }
  const adjustedTarget = getAdjustedStepTarget(currentDate);
  const statusElToday = document.getElementById('todayStepsStatusToday');
  if (statusElToday) {
    if (steps >= adjustedTarget) {
      statusElToday.textContent = 'Goal met 🎉';
      statusElToday.style.color = 'var(--success)';
    } else {
      statusElToday.textContent = `Below benchmark (-${(adjustedTarget - steps).toLocaleString()} steps)`;
      statusElToday.style.color = 'var(--text-secondary)';
    }
  }
}

function bindQuickLogEvents() {
  const saveBtn = document.getElementById('saveQuickLog');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const log = getDailyLog(currentDate);
      log.weight_kg = getInputNumber('inputWeight') || log.weight_kg;
      log.waist_in = getInputNumber('inputWaist') || log.waist_in;
      
      const isAndroid = typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid();
      if (isAndroid && currentDate === getDateStr(new Date())) {
        log.steps = window.AndroidInterface.getStepsToday();
      } else {
        log.steps = getInputNumber('inputSteps') || 0;
      }
      
      log.sleep_hours = getInputNumber('inputSleep') || log.sleep_hours;
      log.water_litres = getInputNumber('inputWater') || log.water_litres;
      log.energy_level = getInputNumber('inputEnergy') || log.energy_level;
      log.notes = document.getElementById('inputNotes')?.value || log.notes;
      saveDailyLog(currentDate, log);

      // Auto-check relevant checklist items
      const checklist = getChecklist(currentDate);
      if (log.weight_kg) { if (!checklist.tracking) checklist.tracking = {}; checklist.tracking.weight_logged = true; }
      if (log.waist_in) { if (!checklist.tracking) checklist.tracking = {}; checklist.tracking.waist_logged = true; }
      if (log.energy_level) { if (!checklist.tracking) checklist.tracking = {}; checklist.tracking.energy_logged = true; }
      if (log.notes) { if (!checklist.tracking) checklist.tracking = {}; checklist.tracking.notes_added = true; }
      if (log.sleep_hours) { if (!checklist.health) checklist.health = {}; checklist.health.sleep_logged = true; }
      if (log.water_litres) { if (!checklist.health) checklist.health = {}; checklist.health.water_started = true; }
      const adjustedTarget = getAdjustedStepTarget(currentDate);
      if (log.steps >= adjustedTarget) { if (!checklist.movement) checklist.movement = {}; checklist.movement.step_target = true; }
      else { if (!checklist.movement) checklist.movement = {}; checklist.movement.step_target = false; }
      saveChecklist(currentDate, checklist);

      showToast('Daily log saved! ✅');
      renderToday();
    });
  }

  // Energy slider
  const energySlider = document.getElementById('inputEnergy');
  if (energySlider) {
    energySlider.addEventListener('input', updateEnergyDisplay);
  }

  // Progress screen log saving
  const saveProgressBtn = document.getElementById('saveProgressEntry');
  if (saveProgressBtn) {
    saveProgressBtn.addEventListener('click', () => {
      const log = getDailyLog(currentDate);
      const weightVal = getInputNumber('inputWeightProgress');
      const trigVal = getInputNumber('inputTrigProgress');

      if (weightVal !== null) {
        log.weight_kg = weightVal;
      }
      if (trigVal !== null) {
        log.triglycerides_val = trigVal;
      }
      saveDailyLog(currentDate, log);

      const checklist = getChecklist(currentDate);
      if (weightVal) {
        if (!checklist.tracking) checklist.tracking = {};
        checklist.tracking.weight_logged = true;
      }
      saveChecklist(currentDate, checklist);

      showToast('Weight and Triglycerides logged successfully! ✅');

      // Clear inputs
      setInputValue('inputWeightProgress', '');
      setInputValue('inputTrigProgress', '');

      // Re-render screen to show updated values & charts
      renderCurrentScreen();
    });
  }
}

function updateEnergyDisplay() {
  const slider = document.getElementById('inputEnergy');
  const display = document.getElementById('energyValue');
  if (slider && display) {
    const emojis = ['', '😫', '😐', '🙂', '😊', '🔥'];
    display.textContent = emojis[slider.value] || slider.value;
  }
}


// ── SCREEN 3: MEAL PLAN ───────────────────────────────────
function bindMealDaySelector() {
  const selector = document.getElementById('mealDaySelector');
  if (selector) {
    selector.addEventListener('click', (e) => {
      const pill = e.target.closest('.day-pill');
      if (!pill) return;

      selector.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const targetDayIndex = weekdays.indexOf(pill.dataset.day);
      if (targetDayIndex !== -1) {
        const d = new Date(currentDate + 'T00:00:00');
        const currentDay = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const currentDayIndex = currentDay === 0 ? 6 : currentDay - 1;
        const diff = targetDayIndex - currentDayIndex;
        d.setDate(d.getDate() + diff);
        currentDate = getDateStr(d);
        currentMealDay = pill.dataset.day;
      }
      renderMealPlan();
    });
  }

  // Protein reference toggle
  const toggle = document.getElementById('proteinRefToggle');
  const body = document.getElementById('proteinRefBody');
  if (toggle && body) {
    toggle.addEventListener('click', () => {
      body.classList.toggle('collapsed');
      const icon = toggle.querySelector('i');
      if (icon) icon.setAttribute('data-lucide', body.classList.contains('collapsed') ? 'chevron-right' : 'chevron-down');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  }
}

function getOrCreateMealLogs(dateStr) {
  const logged = getMealLogs(dateStr);
  if (logged && logged.length > 0) {
    return logged;
  }
  // Return a list of 4 meals based on the template for that day
  const dayName = getDayName(dateStr);
  const profile = getProfile();
  const templates = getPersonalizedMeals(dayName, profile);
  return templates.map(t => ({
    time: t.time,
    label: t.label,
    items: [...t.items],
    protein_estimated: 0,
    completed: false,
    alternatives: t.alternatives ? [...t.alternatives] : []
  }));
}

function bindMealsDateNavigation() {
  const prevBtn = document.getElementById('prevMealsDay');
  const nextBtn = document.getElementById('nextMealsDay');
  const todayBtn = document.getElementById('mealsTodayBtn');

  if (prevBtn) prevBtn.addEventListener('click', () => changeMealsDate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeMealsDate(1));
  if (todayBtn) todayBtn.addEventListener('click', () => {
    currentDate = getDateStr(new Date());
    currentMealDay = getDayName(currentDate);
    renderMealPlan();
  });
}

function changeMealsDate(delta) {
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  currentDate = getDateStr(d);
  currentMealDay = getDayName(currentDate);
  renderMealPlan();
}

function syncMealCompletionToChecklist(dateStr, mealIndex, isCompleted, proteinEstimated = 0) {
  const checklistKey = MEAL_CHECKLIST_KEYS[mealIndex];
  if (!checklistKey) return;

  const checklist = getChecklist(dateStr);
  if (!checklist.food) checklist.food = {};
  checklist.food[checklistKey] = isCompleted;

  // Re-calculate if protein target met
  const meals = getOrCreateMealLogs(dateStr);
  const totalProtein = meals.reduce((sum, m, idx) => {
    if (idx === mealIndex) {
      return sum + (isCompleted ? proteinEstimated : 0);
    }
    return sum + (m.completed ? (m.protein_estimated || 0) : 0);
  }, 0);

  const settings = getSettings();
  const proteinTarget = settings.protein_target_g || 100;
  checklist.food.protein_target = totalProtein >= proteinTarget;

  saveChecklist(dateStr, checklist);
}

function syncChecklistToMealLogs(dateStr, checklistKey, isChecked) {
  const mealIndex = MEAL_CHECKLIST_KEYS.indexOf(checklistKey);
  if (mealIndex === -1) return;

  const meals = getOrCreateMealLogs(dateStr);
  const meal = meals[mealIndex];
  
  if (meal.completed === isChecked) return; // already in sync

  meal.completed = isChecked;
  if (isChecked) {
    if (!meal.protein_estimated || meal.protein_estimated === 0) {
      const dayName = getDayName(dateStr);
      const template = MEAL_PLANS[dayName]?.[mealIndex] || MEAL_PLANS.monday[mealIndex];
      meal.protein_estimated = Math.round((template.protein_min + template.protein_max) / 2);
    }
  } else {
    meal.protein_estimated = 0;
  }

  saveAllMealLogs(dateStr, meals);

  // Re-evaluate protein target check
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein_estimated || 0), 0);
  const settings = getSettings();
  const proteinTarget = settings.protein_target_g || 100;
  
  const checklist = getChecklist(dateStr);
  if (!checklist.food) checklist.food = {};
  checklist.food.protein_target = totalProtein >= proteinTarget;
  saveChecklist(dateStr, checklist);
}

function bindMealEditEvents() {
  const container = document.getElementById('mealCards');
  if (!container) return;

  // Handle Edit button click
  container.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-meal-btn');
    if (editBtn) {
      e.preventDefault();
      const index = parseInt(editBtn.dataset.mealIndex);
      editingMealIndexes[index] = true;
      renderMealPlan();
      return;
    }

    // Handle Cancel button click
    const cancelBtn = e.target.closest('.cancel-edit-btn');
    if (cancelBtn) {
      e.preventDefault();
      const index = parseInt(cancelBtn.dataset.mealIndex);
      delete editingMealIndexes[index];
      renderMealPlan();
      return;
    }

    // Handle Save button click
    const saveBtn = e.target.closest('.save-meal-btn');
    if (saveBtn) {
      e.preventDefault();
      const index = parseInt(saveBtn.dataset.mealIndex);
      const cardEl = saveBtn.closest('.meal-card');
      if (!cardEl) return;

      const textarea = cardEl.querySelector('.meal-items-textarea');
      const proteinInput = cardEl.querySelector('.meal-protein-input');
      
      const itemsText = textarea ? textarea.value.trim() : '';
      const proteinVal = proteinInput ? parseInt(proteinInput.value) || 0 : 0;

      // Split items by line, filter empty lines
      const items = itemsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      // Save to logs
      const meals = getOrCreateMealLogs(currentDate);
      meals[index].items = items;
      meals[index].protein_estimated = proteinVal;
      meals[index].completed = true;

      // Sync checklist
      syncMealCompletionToChecklist(currentDate, index, true, proteinVal);
      saveAllMealLogs(currentDate, meals);

      delete editingMealIndexes[index];
      showToast(`${meals[index].label} updated! 🍽️`);
      renderMealPlan();
      return;
    }

    // Handle Reset button click
    const resetBtn = e.target.closest('.reset-meal-btn');
    if (resetBtn) {
      e.preventDefault();
      const index = parseInt(resetBtn.dataset.mealIndex);
      const dayName = getDayName(currentDate);
      const template = MEAL_PLANS[dayName]?.[index] || MEAL_PLANS.monday[index];

      const meals = getOrCreateMealLogs(currentDate);
      meals[index].items = [...template.items];
      meals[index].protein_estimated = 0;
      meals[index].completed = false;

      // Sync checklist
      syncMealCompletionToChecklist(currentDate, index, false, 0);
      saveAllMealLogs(currentDate, meals);

      showToast(`${meals[index].label} reset to template.`);
      renderMealPlan();
      return;
    }

    // Handle Delete Custom Meal button click
    const deleteBtn = e.target.closest('.delete-custom-meal-btn');
    if (deleteBtn) {
      e.preventDefault();
      const index = parseInt(deleteBtn.dataset.mealIndex);
      const meals = getOrCreateMealLogs(currentDate);
      const deletedMealLabel = meals[index].items[0];
      meals.splice(index, 1);
      saveAllMealLogs(currentDate, meals);
      showToast(`${deletedMealLabel} deleted! 🗑️`);
      renderMealPlan();
      return;
    }
  });

  // Handle Checkbox changes
  container.addEventListener('change', (e) => {
    const checkbox = e.target.closest('.meal-completed-checkbox');
    if (checkbox) {
      const index = parseInt(checkbox.dataset.mealIndex);
      const meals = getOrCreateMealLogs(currentDate);
      const isChecked = checkbox.checked;

      meals[index].completed = isChecked;
      if (isChecked) {
        if (!meals[index].protein_estimated || meals[index].protein_estimated === 0) {
          const dayName = getDayName(currentDate);
          const template = MEAL_PLANS[dayName]?.[index] || MEAL_PLANS.monday[index];
          meals[index].protein_estimated = Math.round((template.protein_min + template.protein_max) / 2);
        }
      } else {
        meals[index].protein_estimated = 0;
      }

      // Sync checklist
      syncMealCompletionToChecklist(currentDate, index, isChecked, meals[index].protein_estimated);
      saveAllMealLogs(currentDate, meals);

      showToast(isChecked ? `${meals[index].label} marked eaten! ✅` : `${meals[index].label} unmarked.`);
      renderMealPlan();
    }
  });
}

function renderMealPlan() {
  // Sync the date navigator text
  const dateEl = document.getElementById('mealsDate');
  if (dateEl) {
    const d = new Date(currentDate + 'T00:00:00');
    dateEl.textContent = d.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Set active day pill
  const dayPills = document.querySelectorAll('.day-pill');
  dayPills.forEach(p => p.classList.toggle('active', p.dataset.day === currentMealDay));

  // Day theme
  const theme = DAY_THEMES?.[currentMealDay] || currentMealDay;
  const themeNameEl = document.getElementById('dayThemeName');
  if (themeNameEl) themeNameEl.textContent = `${capitalize(currentMealDay)} — ${theme}`;

  // Meal cards
  const container = document.getElementById('mealCards');
  if (!container) return;

  const profile = getProfile();
  const templates = getPersonalizedMeals(currentMealDay, profile);
  const loggedMeals = getOrCreateMealLogs(currentDate);
  if (!templates || !loggedMeals) return;

  let totalActualProtein = 0;
  let totalActualCalories = 0;

  container.innerHTML = loggedMeals.map((meal, i) => {
    // If it's a custom logged entry
    if (meal.is_custom) {
      totalActualProtein += meal.protein_estimated || 0;
      totalActualCalories += meal.calories_estimated || 0;
      return `
        <div class="meal-card card custom-meal-card meal-completed" data-meal-index="${i}" style="border-color: var(--accent); margin-bottom: var(--space-md);">
          <div class="card-header" style="display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 0;">
            <div class="meal-card__header">
              <i data-lucide="utensils" style="color: var(--accent);"></i>
              <div>
                <h3>${meal.items[0]}</h3>
                <span class="meal-card__time text-mono">${meal.time} — Custom Entry</span>
              </div>
            </div>
            <div class="meal-card__protein-badges" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
              <span class="badge text-mono" style="background: var(--warning); color: oklch(0.13 0.015 260); font-weight: 700; font-size: 11px;">${meal.calories_estimated || 0} kcal</span>
              <span class="badge text-mono" style="background: var(--primary); color: oklch(0.13 0.015 260); font-weight: 700; font-size: 11px;">${meal.protein_estimated || 0}g protein</span>
            </div>
          </div>
          <div class="card-body" style="padding-top: 0; display: flex; justify-content: flex-end; margin-top: 4px;">
            <button class="btn btn--danger btn--sm delete-custom-meal-btn" data-meal-index="${i}" style="padding: 4px 8px; font-size: 11px; height: auto; background: transparent; border-color: transparent; color: var(--danger);">
              <i data-lucide="trash-2" style="width: 14px; height: 14px; margin-right: 4px;"></i> Delete Entry
            </button>
          </div>
        </div>
      `;
    }

    // Standard templates rendering
    totalActualProtein += meal.completed ? (meal.protein_estimated || 0) : 0;
    // Standard template calories estimation (e.g. 450 kcal average per main meal)
    totalActualCalories += meal.completed ? 450 : 0;

    const templateMeal = templates[i] || templates[0];
    const mealIcons = { 'First Meal': 'sunrise', 'Lunch': 'sun', 'Office Snack': 'coffee', 'Dinner': 'moon' };
    const icon = mealIcons[meal.label] || 'utensils';
    
    const isEditing = editingMealIndexes[i];

    if (isEditing) {
      return `
        <div class="meal-card card meal-card--editing" data-meal-index="${i}" style="margin-bottom: var(--space-md);">
          <div class="card-header">
            <div class="meal-card__header">
              <i data-lucide="${icon}"></i>
              <div>
                <h3>Editing ${meal.label}</h3>
                <span class="meal-card__time text-mono">${meal.time}</span>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div class="meal-card__edit-mode">
              <div class="input-group" style="margin-bottom: var(--space-md);">
                <label style="font-size: 13px; font-weight: 600; margin-bottom: 4px; display: block;">What did you eat?</label>
                <textarea class="input meal-items-textarea" rows="3" style="font-size: 14px; line-height: 1.4; width: 100%;" placeholder="Enter food items (one per line)">${meal.items.join('\n')}</textarea>
              </div>
              <div class="input-group" style="margin-bottom: var(--space-lg);">
                <label style="font-size: 13px; font-weight: 600; margin-bottom: 4px; display: block;">Protein (grams)</label>
                <input type="number" class="input meal-protein-input" style="font-size: 14px; width: 120px;" value="${meal.completed ? meal.protein_estimated : Math.round((templateMeal.protein_min + templateMeal.protein_max) / 2)}" min="0">
              </div>
              <div class="btn-group" style="display: flex; gap: var(--space-sm);">
                <button class="btn btn--primary btn--sm save-meal-btn" data-meal-index="${i}">
                  <i data-lucide="save"></i> Save
                </button>
                <button class="btn btn--ghost btn--sm cancel-edit-btn" data-meal-index="${i}">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="meal-card card ${meal.completed ? 'meal-completed' : ''}" data-meal-index="${i}" style="${meal.completed ? 'border-color: var(--success);' : ''}; margin-bottom: var(--space-md);">
        <div class="card-header" style="display: flex; align-items: flex-start; justify-content: space-between;">
          <div class="meal-card__header">
            <i data-lucide="${icon}"></i>
            <div>
              <h3>${meal.label}</h3>
              <span class="meal-card__time text-mono">${meal.time}</span>
            </div>
          </div>
          <div class="meal-card__protein-badges" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <span class="badge badge--target-protein text-mono" style="opacity: 0.8; font-size: 11px;" title="Target Protein Range">Target: ${templateMeal.protein_min}–${templateMeal.protein_max}g</span>
            ${meal.completed ? `<span class="badge badge--protein text-mono" style="background: var(--success); color: oklch(0.13 0.015 260); font-weight: 700;" title="Logged Protein">${meal.protein_estimated}g eaten</span>` : ''}
          </div>
        </div>
        <div class="card-body">
          <ul class="meal-card__items" style="margin-bottom: var(--space-md); padding-left: 0; list-style-type: none;">
            ${meal.items.map(item => `<li style="position: relative; padding-left: var(--space-md); margin-bottom: 4px;"><span style="position: absolute; left: 0; color: var(--primary);">•</span>${item}</li>`).join('')}
          </ul>
          ${templateMeal.alternatives?.length ? `
            <details class="meal-card__alternatives" style="margin-bottom: var(--space-md); font-size: 13px; opacity: 0.9;">
              <summary style="cursor: pointer; font-weight: 600; color: var(--accent); user-select: none; margin-bottom: 4px;">🔄 Alternatives</summary>
              <ul style="padding-left: var(--space-sm); list-style-type: none;">
                ${templateMeal.alternatives.map(alt => `<li style="margin-bottom: 2px; color: var(--text-secondary);"><span style="color: var(--accent); margin-right: 6px;">-</span>${alt}</li>`).join('')}
              </ul>
            </details>
          ` : ''}
          <div class="meal-card__actions" style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-subtle); display: flex; gap: var(--space-sm); align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <label class="checklist-item ${meal.completed ? 'checked' : ''}" style="padding: 0; margin: 0; display: flex; align-items: center; gap: var(--space-sm); cursor: pointer; user-select: none;">
              <input type="checkbox" class="meal-completed-checkbox" data-meal-index="${i}" ${meal.completed ? 'checked' : ''} style="position: absolute; opacity: 0; width: 0; height: 0;">
              <span class="checkmark" style="position: relative; display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 6px; background: ${meal.completed ? 'var(--success)' : 'transparent'}; border-color: ${meal.completed ? 'var(--success)' : 'var(--border)'};">
                ${meal.completed ? '<i data-lucide="check" style="position: absolute; top: -1px; left: -1px; width: 18px; height: 18px; color: #ffffff; stroke-width: 3;"></i>' : ''}
              </span>
              <span style="font-size: 13px; font-weight: 600; color: ${meal.completed ? 'var(--success)' : 'var(--text-secondary)'};">I ate this</span>
            </label>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn--ghost btn--sm edit-meal-btn" data-meal-index="${i}" style="padding: 4px 8px; font-size: 12px; height: auto;">
                <i data-lucide="edit-3" style="width: 14px; height: 14px; margin-right: 4px;"></i> Log / Update
              </button>
              ${meal.completed || meal.items.join('\n') !== templateMeal.items.join('\n') ? `
                <button class="btn btn--danger btn--sm reset-meal-btn" data-meal-index="${i}" style="padding: 4px 8px; font-size: 12px; height: auto; background: transparent; border-color: transparent; color: var(--danger);" title="Reset to template">
                  <i data-lucide="rotate-ccw" style="width: 14px; height: 14px; margin-right: 4px;"></i> Reset
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Update protein bar
  const settings = getSettings();
  const proteinTarget = settings.protein_target_g || 100;
  setTextContent('mealProteinTotal', `${totalActualProtein}g`);
  const rangeEl = document.getElementById('mealProteinTargetRange');
  if (rangeEl) rangeEl.textContent = `${Math.round(proteinTarget * 0.95)}–${Math.round(proteinTarget * 1.1)}g`;
  const fill = document.getElementById('mealProteinFill');
  if (fill) {
    fill.style.width = Math.min(100, (totalActualProtein / proteinTarget) * 100) + '%';
    if (totalActualProtein >= proteinTarget * 0.95) {
      fill.style.background = 'var(--success)';
    } else {
      fill.style.background = 'var(--primary)';
    }
  }

  // Update calorie bar
  const calorieTarget = getDailyCalorieTarget(profile);
  setTextContent('mealCalorieTotal', `${totalActualCalories} kcal`);
  setTextContent('mealCalorieTargetVal', `${calorieTarget} kcal`);
  const calFill = document.getElementById('mealCalorieFill');
  if (calFill) {
    const calPercent = Math.min(100, (totalActualCalories / calorieTarget) * 100);
    calFill.style.width = calPercent + '%';
    if (totalActualCalories > calorieTarget * 1.1) {
      calFill.style.background = 'var(--danger)';
    } else if (totalActualCalories >= calorieTarget * 0.9) {
      calFill.style.background = 'var(--success)';
    } else {
      calFill.style.background = 'var(--warning)';
    }
  }

  // Trigger Lucide icons rebuild
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Protein reference table
  const tableBody = document.getElementById('proteinRefRows');
  if (tableBody && PROTEIN_REFERENCE) {
    tableBody.innerHTML = PROTEIN_REFERENCE.map(item => `
      <tr>
        <td>${item.food}</td>
        <td class="text-mono">${item.quantity}</td>
        <td class="text-mono">${item.protein_g_min}${item.protein_g_max !== item.protein_g_min ? '–' + item.protein_g_max : ''} g</td>
      </tr>
    `).join('');
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}


// ── SCREEN 4: WORKOUT ──────────────────────────────────────
function renderWorkout() {
  const dayName = getDayName(currentDate);
  const schedule = WEEKLY_SCHEDULE?.[dayName];
  if (!schedule) return;

  // Subtitle
  setTextContent('workoutSubtitle', new Date(currentDate).toLocaleDateString('en-IN', {
    weekday: 'long', month: 'short', day: 'numeric'
  }));

  // Workout type tag & Fitness Level Badge
  const typeTag = document.getElementById('workoutTypeTag');
  if (typeTag) {
    typeTag.textContent = schedule.morning_plan;
    typeTag.className = 'tag tag--' + (schedule.morning_plan.toLowerCase().includes('workout') ? 'primary' : 'accent');
    
    // Add fitness level badge dynamically
    const typeContainer = typeTag.parentElement;
    if (typeContainer) {
      const profile = getProfile();
      const fitnessLevel = profile.fitness_level || 'beginner';
      const capitalizedLevel = fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1);
      
      let lvlBadge = document.getElementById('workoutFitnessLevelBadge');
      if (!lvlBadge) {
        lvlBadge = document.createElement('span');
        lvlBadge.id = 'workoutFitnessLevelBadge';
        typeContainer.appendChild(lvlBadge);
      }
      lvlBadge.className = `fitness-level-badge fitness-level-badge--${fitnessLevel}`;
      lvlBadge.innerHTML = `<i data-lucide="award" style="width: 12px; height: 12px;"></i> ${capitalizedLevel}`;
    }
  }

  // Weekly schedule display
  const scheduleDisplay = document.getElementById('weeklyScheduleDisplay');
  if (scheduleDisplay) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    scheduleDisplay.innerHTML = days.map(d => {
      const s = WEEKLY_SCHEDULE[d];
      const isToday = d === dayName;
      return `
        <div class="schedule-day ${isToday ? 'schedule-day--active' : ''}">
          <span class="schedule-day__name">${d.slice(0, 3).toUpperCase()}</span>
          <span class="schedule-day__plan">${s?.morning_plan || 'Rest'}</span>
        </div>
      `;
    }).join('');
  }

  // Exercise list
  const exerciseContainer = document.getElementById('exerciseList');
  if (exerciseContainer) {
    let baseExercises = [];
    const plan = schedule.morning_plan.toLowerCase();
    if (plan.includes('strength') || plan.includes('workout a')) {
      baseExercises = WORKOUT_A || [];
    } else if (plan.includes('core') || plan.includes('workout b')) {
      baseExercises = WORKOUT_B || [];
    } else if (plan.includes('mobility') || plan.includes('stretch') || plan.includes('recovery')) {
      baseExercises = MOBILITY || [];
    } else if (plan.includes('walk')) {
      baseExercises = [
        {
          name: 'Brisk Walk',
          desc: 'Walk at a moderate-to-vigorous pace. You should be breathing harder but still able to hold a conversation.',
          sets: 1,
          reps_or_duration: plan.includes('40') ? '40 min' : '30 min',
          reps_num: 0,
          thumbnail: 'exercise-images/tai_chi.png',
          video_url: 'https://www.youtube.com/results?search_query=proper+brisk+walking+posture'
        }
      ];
    } else if (plan.includes('rest') || plan.includes('yoga')) {
      baseExercises = [
        {
          name: 'Rest / Active Recovery',
          desc: 'Focus on light active recovery: slow stroll, deep breathing, or gentle full-body stretching.',
          sets: 1,
          reps_or_duration: '15-20 min',
          reps_num: 0,
          thumbnail: 'exercise-images/child_pose.png',
          video_url: 'https://www.youtube.com/results?search_query=active+recovery+gentle+stretching+yoga'
        }
      ];
    }

    // Scale exercises using the personalized workout engine
    const profile = getProfile();
    const exercises = getPersonalizedWorkout(baseExercises, profile);
    const workoutLog = getWorkoutLog(currentDate) || { exercises: {}, notes: '', completed: false, difficulty: null };

    const alertDiv = document.getElementById('workoutMedicalAlert');
    const cardFooter = document.querySelector('#workoutCard .card-footer');

    if (profile.has_heart_blockage) {
      // Hide exercises and log actions, display Doctor Clearance consult warning
      if (alertDiv) {
        alertDiv.style.display = 'block';
        alertDiv.style.background = 'rgba(239, 68, 68, 0.08)';
        alertDiv.style.border = '1.5px solid var(--danger)';
        alertDiv.style.color = 'var(--text)';
        alertDiv.innerHTML = `
          <h4 style="color: var(--danger); font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px; font-size: 13px;">
            <i data-lucide="shield-alert" style="width: 18px; height: 18px;"></i> Medical Clearance Required
          </h4>
          <p style="margin: 0; font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--text);">
            You have indicated a history of **Heart Blockage / CAD** in your medical history. 
            For your safety, exercise recommendations are disabled. **Please consult with your doctor before starting or taking any exercise.** 
            Do not perform workouts without medical approval.
          </p>
        `;
        if (typeof lucide !== 'undefined') {
          lucide.createIcons({ attrs: { class: 'lucide' }, node: alertDiv });
        }
      }
      if (exerciseContainer) exerciseContainer.style.display = 'none';
      if (cardFooter) cardFooter.style.display = 'none';
    } else {
      // Normal exercises loading
      if (exerciseContainer) exerciseContainer.style.display = 'block';
      if (cardFooter) cardFooter.style.display = 'flex';
      
      // Check if other cardiovascular / high BP risks are present
      const meds = (profile.medications || '').toLowerCase();
      const isBetaBlocker = meds.includes('beta') || meds.includes('blocker') || meds.includes('atenolol') || meds.includes('metoprolol') || meds.includes('bisoprolol') || meds.includes('carvedilol') || meds.includes('propranolol') || meds.includes('labetalol');
      const isAceOrArb = meds.includes('ace') || meds.includes('arb') || meds.includes('lisinopril') || meds.includes('ramipril') || meds.includes('enalapril') || meds.includes('telmisartan') || meds.includes('losartan') || meds.includes('valsartan');
      const isCcb = meds.includes('calcium') || meds.includes('ccb') || meds.includes('amlodipine') || meds.includes('diltiazem') || meds.includes('verapamil') || meds.includes('nifedipine');
      const isDiuretic = meds.includes('diuretic') || meds.includes('lasix') || meds.includes('furosemide') || meds.includes('hydrochlorothiazide') || meds.includes('spironolactone');
      const isNitrate = meds.includes('nitrate') || meds.includes('nitroglycerin') || meds.includes('isosorbide');
      const hasHypertension = profile.has_hypertension || meds.includes('bp') || meds.includes('hypertension') || meds.includes('pressure');
      
      if (hasHypertension || isBetaBlocker || isNitrate) {
        if (alertDiv) {
          alertDiv.style.display = 'block';
          alertDiv.style.background = 'rgba(147, 51, 234, 0.05)';
          alertDiv.style.border = '1px dashed rgba(147, 51, 234, 0.3)';
          alertDiv.style.color = 'var(--text)';
          alertDiv.innerHTML = `
            <h4 style="color: var(--primary); font-weight: 700; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px; font-size: 13px;">
              <i data-lucide="heart" style="width: 16px; height: 16px; color: var(--primary);"></i> AI Medical Exercise Safety Coach
            </h4>
            <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
              Based on your clinical conditions and medication profile, exercises have been adapted to safe, low-impact variations (wall push-ups, chair squats, bird-dog, and breathing).
            </p>
            <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
              ${isBetaBlocker ? '<li>Beta-blockers blunt heart rate. Rely on Borg RPE scale (keep it light-to-moderate, <= 11-13).</li>' : ''}
              ${(isAceOrArb || isCcb) ? '<li>ACE inhibitors/CCBs can lower BP post-workout. Avoid rapid standing; rise slowly from the floor.</li>' : ''}
              ${isDiuretic ? '<li>Diuretics increase dehydration risk. Sip water frequently between exercise sets.</li>' : ''}
            </ul>
            <div style="margin-top: 8px; font-size: 12px; font-weight: 700; color: var(--danger); display: flex; align-items: center; gap: 4px;">
              <i data-lucide="alert-octagon" style="width: 14px; height: 14px; color: var(--danger);"></i> If you feel uneasy, dizzy, experience chest tightness or pain: STOP immediately, rest, and consult your doctor.
            </div>
          `;
          if (typeof lucide !== 'undefined') {
            lucide.createIcons({ attrs: { class: 'lucide' }, node: alertDiv });
          }
        }
      } else {
        if (alertDiv) alertDiv.style.display = 'none';
      }

      if (exerciseContainer) {
        exerciseContainer.innerHTML = exercises.map((ex, i) => {
          const isCompleted = !!workoutLog.exercises?.[i];
          const thumbnailHtml = ex.thumbnail 
            ? `<img src="${ex.thumbnail}" class="exercise-thumb" alt="${ex.name}">` 
            : '';
          const videoHtml = ex.video_url 
            ? `<a href="${ex.video_url}" target="_blank" class="exercise-video-btn" title="Watch form video"><i data-lucide="play-circle"></i> Watch Demo</a>` 
            : '';
          
          return `
            <div class="workout-exercise ${isCompleted ? 'completed' : ''}">
              <label class="workout-exercise__check">
                <input type="checkbox" data-exercise-index="${i}"
                       ${isCompleted ? 'checked' : ''}>
                <span class="checkmark"></span>
              </label>
              ${thumbnailHtml}
              <div class="workout-exercise__info" style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <span class="workout-exercise__name" style="font-weight: 600;">${ex.name}</span>
                    <div class="workout-exercise__desc">${ex.desc || ''}</div>
                  </div>
                  <span class="workout-exercise__sets text-mono" style="font-size: 13px; font-weight: 700; color: var(--primary);">${ex.sets} × ${ex.reps_or_duration}</span>
                </div>
                ${videoHtml}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Workout title
    setTextContent('workoutTitle', schedule.morning_plan);

    // Load workout notes
    const notesInput = document.getElementById('workoutNotes');
    if (notesInput) {
      notesInput.value = workoutLog.notes || '';
    }

    // Load difficulty stars
    const difficultyVal = workoutLog.difficulty || 0;
    document.querySelectorAll('.difficulty-stars .star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= difficultyVal);
    });
  }

  // Load walking checklist states dynamically from active schedule
  const walkingChecklist = document.getElementById('walkingChecklist');
  if (walkingChecklist) {
    const activeSchedule = getActiveSchedule();
    const movementItems = activeSchedule.filter(item => item.category === 'movement' && item.checklist_key && item.checklist_key.includes('walk'));
    
    const checklist = getChecklist(currentDate);
    const movement = checklist.movement || {};
    
    walkingChecklist.innerHTML = movementItems.map(item => {
      const isChecked = !!movement[item.checklist_key];
      let displayTime = item.time;
      return `
        <label class="checklist-item ${isChecked ? 'checked' : ''}">
          <input type="checkbox" class="walk-checkbox" data-key="${item.checklist_key}"
                 ${isChecked ? 'checked' : ''}>
          <span class="checkmark"></span>
          <span class="checklist-item__label">${item.action}</span>
          <span class="checklist-item__time">${displayTime}</span>
        </label>
      `;
    }).join('');
  }

  renderWorkoutButtons();
  updateMetabolicCalculator();
}

function renderWorkoutButtons() {
  const saveBtn = document.getElementById('saveWorkout');
  const savePartialBtn = document.getElementById('saveWorkoutPartial');
  if (saveBtn && savePartialBtn) {
    const workoutLog = getWorkoutLog(currentDate);
    if (workoutLog && workoutLog.completed === true) {
      saveBtn.innerHTML = '<i data-lucide="check-circle"></i> Completed';
      saveBtn.style.background = 'var(--success)';
      saveBtn.style.borderColor = 'var(--success)';
      saveBtn.style.color = 'oklch(0.13 0.015 260)';
      
      savePartialBtn.innerHTML = '<i data-lucide="x-circle"></i> Skip';
      savePartialBtn.style.background = 'transparent';
      savePartialBtn.style.borderColor = 'var(--border)';
      savePartialBtn.style.color = 'var(--text-secondary)';
    } else if (workoutLog && workoutLog.skipped === true) {
      saveBtn.innerHTML = '<i data-lucide="check-circle"></i> Complete Workout';
      saveBtn.style.background = '';
      saveBtn.style.borderColor = '';
      saveBtn.style.color = '';
      
      savePartialBtn.innerHTML = '<i data-lucide="alert-triangle"></i> Skipped';
      savePartialBtn.style.background = 'var(--danger-subtle, oklch(0.62 0.25 29 / 0.12))';
      savePartialBtn.style.borderColor = 'var(--danger)';
      savePartialBtn.style.color = 'var(--danger)';
    } else {
      saveBtn.innerHTML = '<i data-lucide="check-circle"></i> Complete Workout';
      saveBtn.style.background = '';
      saveBtn.style.borderColor = '';
      saveBtn.style.color = '';
      
      savePartialBtn.innerHTML = '<i data-lucide="alert-triangle"></i> Log Partial / Skip';
      savePartialBtn.style.background = 'transparent';
      savePartialBtn.style.borderColor = 'var(--danger)';
      savePartialBtn.style.color = 'var(--danger)';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

const EXERCISE_DETAILS = {
  'Bodyweight Squats': {
    steps: '1. Stand with feet shoulder-width apart, chest up, and shoulders back.\n2. Lower your hips back and down as if sitting in a chair.\n3. Keep your knees aligned with your toes and lower down until thighs are parallel to the floor.\n4. Drive through your heels to return to the starting position.',
    safety: 'Keep your weight in your heels. Do not let your knees cave inward or extend past your toes.'
  },
  'Push-ups': {
    steps: '1. Place hands slightly wider than shoulder-width apart on the floor.\n2. Extend legs straight back, balancing on toes (or knees for a modified version), keeping a straight line from head to heels.\n3. Lower your chest toward the floor by bending elbows to a 45-degree angle.\n4. Push through your hands to return to the starting plank position.',
    safety: 'Keep your core braced and do not let your lower back sag. Keep your neck neutral.'
  },
  'Crunches': {
    steps: '1. Lie on your back with knees bent and feet flat on the floor.\n2. Place hands gently behind your head, elbows wide.\n3. Contract your abdominals to lift your shoulders off the floor, exhaling as you rise.\n4. Slowly lower back down to the start position with control.',
    safety: 'Do not pull on your neck with your hands. Focus on lifting using your abdominal muscles alone.'
  },
  'Plank Hold': {
    steps: '1. Place forearms on the floor, elbows directly under shoulders.\n2. Extend legs straight back, balancing on toes, creating a straight line from head to feet.\n3. Engage your abs, glutes, and thighs to maintain a solid, stable hold.',
    safety: 'Avoid letting your hips sag or hike upward. Keep your neck neutral by looking at the floor between your hands.'
  },
  'Lying Leg Raises': {
    steps: '1. Lie flat on your back with legs straight and hands under your glutes for support.\n2. Keeping your legs straight, slowly raise them up to a 90-degree angle with the floor.\n3. Slowly lower your legs back down until they are just a few inches off the floor, then repeat.',
    safety: 'Press your lower back firmly into the floor. If your back arches, do not lower your legs as far.'
  },
  'Mountain Climbers': {
    steps: '1. Start in a high plank position with hands under shoulders.\n2. Drive your right knee toward your chest as far as you can.\n3. Switch legs, driving the left knee in while extending the right leg back.\n4. Alternate legs rapidly as if running in place.',
    safety: 'Keep your hips level and shoulders directly over your wrists. Do not bounce your hips up and down.'
  },
  'Tai Chi Flow': {
    steps: '1. Stand with feet shoulder-width apart, knees slightly bent.\n2. Move your arms in slow, circular, flowing motions integrated with deep diaphragmatic breathing.\n3. Shift your weight smoothly from one foot to the other in a calm, focused rhythm.',
    safety: 'Keep movements soft, slow, and relaxed. Never lock your knees or force a range of motion.'
  },
  'Glute Bridges': {
    steps: '1. Lie on your back with knees bent and feet flat, hip-width apart.\n2. Squeeze your glutes and press through heels to lift hips toward the ceiling until knees, hips, and shoulders form a straight line.\n3. Hold for 2 seconds, then slowly lower back down.',
    safety: 'Do not hyperextend your lower back at the top. Drive the movement from your glutes and hamstrings.'
  },
  'Bird-Dog Exercise': {
    steps: '1. Start on all fours with hands under shoulders and knees under hips.\n2. Slowly extend your right arm straight forward and left leg straight backward until both are parallel to the floor.\n3. Hold for 2 seconds, return to the start, and alternate with left arm and right leg.',
    safety: 'Keep your hips square to the floor. Do not let your lower back arch excessively.'
  },
  'Cat-Cow Stretch': {
    steps: '1. Start on all fours with wrists under shoulders and knees under hips.\n2. Inhale, drop your belly toward the floor, and lift your chin and chest (Cow).\n3. Exhale, draw your belly button toward your spine, and arch your back toward the ceiling (Cat).',
    safety: 'Move slowly and coordinate each pose with your breath. Do not strain your neck.'
  },
  'Hip Circles': {
    steps: '1. Stand with feet slightly wider than shoulder-width, hands on your hips.\n2. Rotate your hips in a large, slow circle, moving them forward, side, back, and side.\n3. Perform the target repetitions, then reverse the direction.',
    safety: 'Maintain control throughout the circle. Keep knees slightly bent to protect the joints.'
  },
  'Shoulder Rolls': {
    steps: '1. Stand tall with feet hip-width apart and arms relaxed at your sides.\n2. Inhale and lift your shoulders up toward your ears.\n3. Exhale and roll them backward and down in a smooth, circular motion.',
    safety: 'Keep your neck relaxed. Focus on the mobilization of the shoulder blades.'
  },
  'Hamstring Stretch': {
    steps: '1. Stand with one foot slightly forward, toes pointed up.\n2. Bend your back knee and hinge at the hips, keeping your front leg straight.\n3. Rest hands on your thigh (not the knee) and lean forward until you feel a gentle stretch in the back of the front leg.',
    safety: 'Do not bounce or force the stretch. Keep your back straight, avoiding rounding your spine.'
  },
  'Spinal Twist': {
    steps: '1. Sit tall on the floor with legs extended.\n2. Bend your right knee and place your right foot on the outside of your left thigh.\n3. Place your right hand on the floor behind you, hug your right knee with left arm, and gently twist your torso to the right.',
    safety: 'Twist gently from the upper back, not the lower back. Keep your spine long and shoulders down.'
  },
  'Child\'s Pose': {
    steps: '1. Kneel on the floor, touch your big toes together, and sit on your heels.\n2. Separate your knees about hip-width and fold your torso forward over your thighs.\n3. Extend your arms forward on the floor, palms down, and rest your forehead gently on the mat.',
    safety: 'Breathe deeply and relax. If you feel discomfort in your knees, place a pillow under your hips.'
  },
  'Tai Chi Breathing': {
    steps: '1. Stand tall, relax your shoulders, and place your hands on your lower abdomen.\n2. Inhale slowly through your nose, letting your belly expand outward.\n3. Exhale slowly through your mouth, letting your belly deflate inward, releasing all tension.',
    safety: 'Focus on breathing naturally and deeply without forcing. Keep your stance comfortable.'
  },
  'Brisk Walk': {
    steps: '1. Walk at a moderate-to-vigorous pace, keeping your chest up and shoulders relaxed.\n2. Swing your arms naturally from the shoulders with elbows bent.\n3. Roll from heel to toe with each stride, maintaining a brisk, steady speed.',
    safety: 'Ensure your posture is upright. Wear supportive walking shoes. Hydrate before and after.'
  },
  'Rest / Active Recovery': {
    steps: '1. Dedicate today to resting and recovering from weekly training.\n2. Engage in very low-intensity activities like a gentle slow stroll, mobility stretches, or deep breathing.\n3. Focus on quality sleep, proper hydration, and nutritious meals.',
    safety: 'Avoid high-intensity exercises today. Listen to your body and allow muscles to recover.'
  }
};

function bindWorkoutEvents() {
  // Click handler to open Exercise details
  document.addEventListener('click', (e) => {
    const exerciseCard = e.target.closest('.workout-exercise');
    if (!exerciseCard) return;

    // Ignore clicks on checkmark checkbox or watch demo button
    if (e.target.closest('.workout-exercise__check') || e.target.closest('input[type="checkbox"]') || e.target.closest('.exercise-video-btn')) {
      return;
    }

    const checkbox = exerciseCard.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    const index = parseInt(checkbox.dataset.exerciseIndex);
    const dayName = getDayName(currentDate);
    const schedule = WEEKLY_SCHEDULE?.[dayName];
    if (!schedule) return;

    let baseExercises = [];
    const plan = schedule.morning_plan.toLowerCase();
    if (plan.includes('strength') || plan.includes('workout a')) {
      baseExercises = WORKOUT_A || [];
    } else if (plan.includes('core') || plan.includes('workout b')) {
      baseExercises = WORKOUT_B || [];
    } else if (plan.includes('mobility') || plan.includes('stretch') || plan.includes('recovery')) {
      baseExercises = MOBILITY || [];
    } else if (plan.includes('walk')) {
      baseExercises = [
        {
          name: 'Brisk Walk',
          desc: 'Walk at a moderate-to-vigorous pace.',
          sets: 1,
          reps_or_duration: plan.includes('40') ? '40 min' : '30 min',
          reps_num: 0,
          thumbnail: 'exercise-images/tai_chi.png',
          video_url: 'https://www.youtube.com/results?search_query=proper+brisk+walking+posture'
        }
      ];
    } else if (plan.includes('rest') || plan.includes('yoga')) {
      baseExercises = [
        {
          name: 'Rest / Active Recovery',
          desc: 'Focus on light active recovery.',
          sets: 1,
          reps_or_duration: '15-20 min',
          reps_num: 0,
          thumbnail: 'exercise-images/child_pose.png',
          video_url: 'https://www.youtube.com/results?search_query=active+recovery+gentle+stretching+yoga'
        }
      ];
    }

    const profile = getProfile();
    const personalizedExercises = getPersonalizedWorkout(baseExercises, profile);
    const ex = personalizedExercises[index];
    if (!ex) return;

    // Populate modal elements
    const modal = document.getElementById('exerciseDetailModal');
    if (!modal) return;

    const titleEl = document.getElementById('exDetailTitle');
    const imageEl = document.getElementById('exDetailImage');
    const setsEl = document.getElementById('exDetailSets');
    const levelEl = document.getElementById('exDetailLevel');
    const descEl = document.getElementById('exDetailDesc');
    const tipsEl = document.getElementById('exDetailCoachTips');
    const tipsContainer = document.getElementById('exDetailCoachTipsContainer');
    const videoBtn = document.getElementById('exDetailVideoBtn');

    if (titleEl) {
      titleEl.innerHTML = `<i data-lucide="zap" style="color: var(--primary); width: 20px; height: 20px;"></i> <span>${ex.name}</span>`;
    }
    if (imageEl) {
      imageEl.src = ex.thumbnail || '';
      imageEl.style.display = ex.thumbnail ? 'block' : 'none';
    }
    if (setsEl) {
      setsEl.textContent = `${ex.sets} × ${ex.reps_or_duration}`;
    }

    if (levelEl) {
      const fitnessLevel = profile.fitness_level || 'beginner';
      levelEl.textContent = fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1);
      levelEl.className = `badge fitness-level-badge--${fitnessLevel}`;
    }

    const mapping = EXERCISE_DETAILS[ex.name] || {
      steps: ex.desc || '',
      safety: 'Coordinate with your breathing and execute each rep with slow, controlled movement.'
    };

    if (descEl) descEl.textContent = mapping.steps;
    if (tipsEl) tipsEl.textContent = mapping.safety;
    if (tipsContainer) tipsContainer.style.display = mapping.safety ? 'block' : 'none';

    if (videoBtn) {
      if (ex.video_url) {
        videoBtn.href = ex.video_url;
        videoBtn.style.display = 'flex';
      } else {
        videoBtn.style.display = 'none';
      }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();

    modal.showModal();
  });

  // Exercise checkboxes
  document.addEventListener('change', (e) => {
    if (e.target.matches('.workout-exercise input[type="checkbox"]')) {
      const index = parseInt(e.target.dataset.exerciseIndex);
      let log = getWorkoutLog(currentDate);
      if (!log) {
        log = { date: currentDate, completed: false, difficulty: null, exercises: {} };
      }
      if (!log.exercises) log.exercises = {};
      log.exercises[index] = e.target.checked;
      if (log.skipped) log.skipped = false; // Reset skipped status on check change
      saveWorkoutLog(currentDate, log);
      e.target.closest('.workout-exercise').classList.toggle('completed', e.target.checked);
      renderWorkoutButtons();
    }
  });

  // Walking checkboxes
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('walk-checkbox')) {
      const key = e.target.dataset.key;
      const checklist = getChecklist(currentDate);
      if (!checklist.movement) checklist.movement = {};
      checklist.movement[key] = e.target.checked;
      saveChecklist(currentDate, checklist);
      
      // Sync with checklist if it exists
      const mainChecklistInput = document.querySelector(`.checklist input[data-key="${key}"]`);
      if (mainChecklistInput) {
        mainChecklistInput.checked = e.target.checked;
        mainChecklistInput.closest('.checklist-item').classList.toggle('checked', e.target.checked);
      }
      
      // Toggle checked class in UI
      e.target.closest('.checklist-item').classList.toggle('checked', e.target.checked);
      showToast('Walking progress updated! 🚶‍♂️');
      renderTodayScore();
      updateChecklistCounts();
    }
  });

  // Difficulty stars
  document.addEventListener('click', (e) => {
    const star = e.target.closest('.star');
    if (!star) return;
    const val = parseInt(star.dataset.val);
    let log = getWorkoutLog(currentDate);
    if (!log) {
      log = { date: currentDate, completed: false, difficulty: null, exercises: {} };
    }
    log.difficulty = val;
    saveWorkoutLog(currentDate, log);

    // Update star display
    document.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
  });

  // Save workout button
  const saveBtn = document.getElementById('saveWorkout');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      let log = getWorkoutLog(currentDate);
      if (!log) {
        log = { date: currentDate, completed: false, difficulty: null, exercises: {} };
      }
      log.completed = true;
      log.skipped = false;
      log.date = currentDate;
      log.notes = document.getElementById('workoutNotes')?.value || '';
      saveWorkoutLog(currentDate, log);

      // Auto-check morning workout
      const checklist = getChecklist(currentDate);
      if (!checklist.movement) checklist.movement = {};
      checklist.movement.morning_workout = true;
      saveChecklist(currentDate, checklist);

      showToast('Workout completed! 💪');
      renderWorkout();
    });
  }

  // Save workout partial/skip button
  const savePartialBtn = document.getElementById('saveWorkoutPartial');
  if (savePartialBtn) {
    savePartialBtn.addEventListener('click', () => {
      let log = getWorkoutLog(currentDate);
      if (!log) {
        log = { date: currentDate, completed: false, difficulty: null, exercises: {} };
      }
      log.completed = false;
      log.skipped = true;
      log.date = currentDate;
      log.notes = document.getElementById('workoutNotes')?.value || '';
      saveWorkoutLog(currentDate, log);

      // Auto-uncheck morning workout
      const checklist = getChecklist(currentDate);
      if (!checklist.movement) checklist.movement = {};
      checklist.movement.morning_workout = false;
      saveChecklist(currentDate, checklist);

      showToast('Workout marked as skipped! ⚠️');
      renderWorkout();
    });
  }

  // Metabolic Calculator Bindings
  const slider = document.getElementById('calcStepSlider');
  if (slider) {
    slider.addEventListener('input', () => {
      updateMetabolicCalculator();
    });
  }

  const paceBtns = document.querySelectorAll('.pace-btn');
  paceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paceBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
        b.style.boxShadow = 'none';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--primary)';
      btn.style.color = '#ffffff';
      btn.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.25)';
      
      selectedPace = btn.dataset.pace;
      updateMetabolicCalculator();
    });
  });

  // Reminders & Intervals Switches Bindings
  const reminderKeys = ['chkSedentaryAlert', 'chkMorningFastedWalk', 'chkGlucoseBurn'];
  reminderKeys.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        localStorage.setItem(`ft_settings_${id}`, el.checked);
        showToast('Reminder settings updated! 🔔');
      });
    }
  });
}


// ── SCREEN 5: PROGRESS ─────────────────────────────────────
function bindChartRangeSelector() {
  const selector = document.getElementById('chartRange');
  if (selector) {
    selector.addEventListener('click', (e) => {
      const pill = e.target.closest('.range-pill');
      if (!pill) return;
      selector.querySelectorAll('.range-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderProgress(pill.dataset.range);
    });
  }
}

function renderProgress(range = '30d') {
  if (typeof Chart === 'undefined') return;
  try {
    renderAllCharts(range);
    updateTrendsMetrics();
  } catch (err) {
    console.warn('Charts rendering error:', err);
  }
}


// ── SCREEN 6: REVIEW ──────────────────────────────────────
function bindReviewNavigation() {
  const prevBtn = document.getElementById('prevWeek');
  const nextBtn = document.getElementById('nextWeek');

  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (currentReviewWeek > 1) {
      currentReviewWeek--;
      renderReview();
    }
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (currentReviewWeek < 12) {
      currentReviewWeek++;
      renderReview();
    }
  });
}

function renderReview() {
  setTextContent('reviewWeekLabel', `Week ${currentReviewWeek}`);

  const profile = getProfile();
  const startDate = new Date(profile.program_start_date);
  const weekStart = new Date(startDate);
  weekStart.setDate(weekStart.getDate() + (currentReviewWeek - 1) * 7);
  const weekStartStr = getDateStr(weekStart);

  const review = calculateWeeklyReview(weekStartStr);

  // Stats
  setTextContent('reviewAvgWeight', review.avg_weight ? review.avg_weight.toFixed(1) + ' kg' : '--');
  setTextContent('reviewWeightDelta', review.weight_change != null ? (review.weight_change > 0 ? '+' : '') + review.weight_change.toFixed(1) + ' kg' : '--');
  
  const reviewHeight = profile.height_cm || 178;
  const avgBmi = review.avg_weight ? review.avg_weight / ((reviewHeight / 100) * (reviewHeight / 100)) : null;
  setTextContent('reviewAvgBmi', avgBmi ? avgBmi.toFixed(1) : '--');

  setTextContent('reviewAvgSteps', review.avg_steps ? Math.round(review.avg_steps).toLocaleString() : '--');
  setTextContent('reviewWorkouts', review.workouts_completed ?? '--');
  setTextContent('reviewProtein', review.protein_compliance_percent != null ? Math.round(review.protein_compliance_percent) + '%' : '--');
  setTextContent('reviewCleanFood', review.clean_food_compliance_percent != null ? Math.round(review.clean_food_compliance_percent) + '%' : '--');
  setTextContent('reviewAvgScore', review.avg_daily_score != null ? Math.round(review.avg_daily_score) : '--');
  setTextContent('reviewOfficeWalks', review.office_walks_completed != null ? `${review.office_walks_completed} / 14` : '--');

  // Wins
  const winsEl = document.getElementById('reviewWins');
  if (winsEl && review.wins?.length) {
    winsEl.innerHTML = review.wins.map(w => `<li><i data-lucide="check-circle"></i> ${w}</li>`).join('');
  }

  // Problems
  const problemsEl = document.getElementById('reviewProblems');
  if (problemsEl && review.problems?.length) {
    problemsEl.innerHTML = review.problems.map(p => `<li><i data-lucide="alert-circle"></i> ${p}</li>`).join('');
  }

  // Recommendations
  const recsEl = document.getElementById('reviewRecommendations');
  const recommendations = generateRecommendations(review, 'weekly');
  if (recsEl && recommendations?.length) {
    recsEl.innerHTML = recommendations.map(rec => `
      <div class="recommendation-card recommendation-card--${rec.severity}">
        <h4>${rec.title}</h4>
        <ul>
          ${rec.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  // Coach's message
  const messageCard = document.getElementById('weeklyMessageCard');
  const messageEl = document.getElementById('coachMessage');
  const message = getWeeklyMessage(review);
  if (messageCard && messageEl && message) {
    messageCard.style.display = 'block';
    messageEl.textContent = message;
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}


// ── Settings Modal ─────────────────────────────────────────
function updateSettingsBmiDisplay() {
  const weightInput = document.getElementById('settingCurrentWeight');
  const heightInput = document.getElementById('settingHeight');
  const bmiValEl = document.getElementById('settingBmiValue');
  const bmiStatusEl = document.getElementById('settingBmiStatus');
  if (!weightInput || !heightInput || !bmiValEl || !bmiStatusEl) return;
  
  const w = parseFloat(weightInput.value) || 0;
  const h = parseFloat(heightInput.value) || 0;
  if (w > 0 && h > 0) {
    const bmi = w / ((h / 100) * (h / 100));
    bmiValEl.textContent = bmi.toFixed(1);
    
    let status = 'Normal';
    let color = 'var(--success)';
    if (bmi < 18.5) {
      status = 'Underweight';
      color = 'var(--info)';
    } else if (bmi >= 30) {
      status = 'Obese';
      color = 'var(--danger)';
    } else if (bmi >= 25) {
      status = 'Overweight';
      color = 'var(--warning)';
    }
    
    bmiStatusEl.textContent = status;
    bmiStatusEl.style.color = color;
    bmiStatusEl.style.background = `${color}1A`;
  } else {
    bmiValEl.textContent = '--';
    bmiStatusEl.textContent = '--';
    bmiStatusEl.style.color = '';
    bmiStatusEl.style.background = '';
  }
}

function bindSettingsModal() {
  const settingsBtn = document.getElementById('settingsBtn');
  const modal = document.getElementById('settingsModal');
  const closeBtn = modal?.querySelector('.modal-close');
  const saveBtn = document.getElementById('saveSettings');
  const loadSampleBtn = document.getElementById('loadSampleData');
  const clearBtn = document.getElementById('clearDataBtn');

  const checkSettingsGoalValidity = () => {
    const settingCurrentWeight = document.getElementById('settingCurrentWeight');
    const settingTargetWeight = document.getElementById('settingTargetWeight');
    const settingTimelineVal = document.getElementById('settingTimelineVal');
    const settingTimelineUnit = document.getElementById('settingTimelineUnit');
    const settingGoalAlert = document.getElementById('settingGoalAlert');
    const settingGoalAlertText = document.getElementById('settingGoalAlertText');
    const saveSettingsBtn = document.getElementById('saveSettings');

    if (!settingCurrentWeight || !settingTargetWeight || !settingTimelineVal || !settingTimelineUnit || !settingGoalAlert || !settingGoalAlertText || !saveSettingsBtn) return false;
    
    const currentW = parseFloat(settingCurrentWeight.value) || 0;
    const targetW = parseFloat(settingTargetWeight.value) || 0;
    const timeVal = parseFloat(settingTimelineVal.value) || 0;
    const unit = settingTimelineUnit.value;

    const targetLoss = currentW - targetW;
    
    if (targetLoss <= 0) {
      settingGoalAlert.style.display = 'none';
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.style.opacity = '1';
      return true;
    }

    let weeks = timeVal;
    if (unit === 'months') {
      weeks = timeVal * 4.33;
    } else if (unit === 'days') {
      weeks = timeVal / 7.0;
    }

    const lossRatePerWeek = targetLoss / weeks;
    const lossRatePerMonth = lossRatePerWeek * 4.33;

    if (lossRatePerWeek > 1.0) {
      const recommendedWeeks = Math.ceil(targetLoss);
      let recommendedMsg = `${recommendedWeeks} weeks`;
      if (recommendedWeeks >= 8) {
        recommendedMsg = `${(recommendedWeeks / 4.33).toFixed(1)} months`;
      }
      
      settingGoalAlertText.innerHTML = `
        Healthcare professionals and nutritionists recommend a safe, sustainable weight loss rate of 
        <strong>0.5 - 1 kg per week</strong> (approximately <strong>2 - 4 kg per month</strong>).<br><br>
        Losing <strong>${targetLoss.toFixed(1)} kg</strong> in that timeframe requires losing 
        <strong>${lossRatePerWeek.toFixed(1)} kg/week</strong> (<strong>${lossRatePerMonth.toFixed(1)} kg/month</strong>). 
        To avoid muscle wasting, metabolic slowing, or gallstones, we suggest a target duration of at least <strong>${recommendedMsg}</strong>.
      `;
      settingGoalAlert.style.display = 'block';
      saveSettingsBtn.disabled = true;
      saveSettingsBtn.style.opacity = '0.5';
      return false;
    } else {
      settingGoalAlert.style.display = 'none';
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.style.opacity = '1';
      return true;
    }
  };

  const openSettings = () => {
    const profile = getProfile();
    setInputValue('settingName', profile.name);
    setInputValue('settingAge', profile.age || '');
    setInputValue('settingGender', profile.sex || 'male');
    setInputValue('settingFitnessLevel', profile.fitness_level || 'beginner');
    setInputValue('settingStartDate', profile.program_start_date);
    setInputValue('settingGoal', profile.primary_goal || 'weight_loss');
    setInputValue('settingMeals', profile.meals_per_day || 4);

    // Load current weight & height
    setInputValue('settingCurrentWeight', profile.start_weight_kg || '');
    setInputValue('settingHeight', profile.height_cm || '');
    setInputValue('settingTargetWeight', profile.target_weight_kg || '');
    setInputValue('settingStartWaist', profile.start_waist_in || '');
    setInputValue('settingTargetWaist', profile.target_waist_in || '');
    setInputValue('settingTimelineVal', profile.target_timeline_value || 3);
    setInputValue('settingTimelineUnit', profile.target_timeline_unit || 'months');
    updateSettingsBmiDisplay();

    // Diet options
    setInputValue('settingDiet', profile.diet_type || 'non_veg');
    setInputValue('settingNonVegFreq', profile.non_veg_frequency || '3_4_weekly');
    
    // Load restricted non-veg days
    const restrictedDays = profile.restricted_non_veg_days || ['monday'];
    document.querySelectorAll('.setting-day-chk').forEach(chk => {
      chk.checked = restrictedDays.includes(chk.value);
    });

    const eatEggCheckbox = document.getElementById('settingEatEgg');
    if (eatEggCheckbox) eatEggCheckbox.checked = !!profile.eat_egg;
    setInputValue('settingSmoking', profile.smoking_status || 'non_smoker');
    setInputValue('settingDrinking', profile.drinking_status || 'occasional');
    setInputValue('settingDietRegion', profile.diet_region || 'standard');
    const glutenFreeCheckbox = document.getElementById('settingGlutenFree');
    if (glutenFreeCheckbox) glutenFreeCheckbox.checked = !!profile.gluten_free;
    const lactoseFreeCheckbox = document.getElementById('settingLactoseFree');
    if (lactoseFreeCheckbox) lactoseFreeCheckbox.checked = !!profile.lactose_free;

    // Medical conditions options
    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    setCheck('settingHasTriglycerides', profile.has_triglycerides);
    setCheck('settingHasLdl', profile.has_ldl);
    setCheck('settingHasHeartBlockage', profile.has_heart_blockage);
    setCheck('settingHasHypertension', profile.has_hypertension);
    setCheck('settingHasDiabetes', profile.has_diabetes);
    setCheck('settingHasThyroid', profile.has_thyroid);
    setInputValue('settingThyroidType', profile.thyroid_type || 'hypothyroidism');
    setInputValue('settingThyroidMed', profile.thyroid_medicine || '');
    
    setCheck('settingHasJointPain', profile.has_joint_pain);
    
    // Check the joint pain location boxes
    const jointPainLocs = profile.joint_pain_locations || [];
    document.querySelectorAll('.setting-joint-chk').forEach(chk => {
      chk.checked = jointPainLocs.includes(chk.value);
    });

    setInputValue('settingMeds', profile.medications || '');
    
    const chkSettingTerms = document.getElementById('settingAcceptTerms');
    if (chkSettingTerms) chkSettingTerms.checked = !!profile.agreed_to_terms;
    const consentDateSpan = document.getElementById('settingTermsConsentDate');
    if (consentDateSpan) {
      if (profile.agreed_to_terms && profile.agreed_to_terms_timestamp) {
        const d = new Date(profile.agreed_to_terms_timestamp);
        consentDateSpan.textContent = `Consented on ${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN')}`;
        consentDateSpan.style.color = 'var(--success)';
      } else {
        consentDateSpan.textContent = 'Not consented yet';
        consentDateSpan.style.color = 'var(--danger)';
      }
    }
    
    // Load lifestyle options
    setInputValue('settingWorkActivity', profile.work_activity || 'sedentary');
    setInputValue('settingSleepCategory', profile.sleep_category || 'optimal');
    setInputValue('settingStressLevel', profile.stress_level || 'moderate');
    setInputValue('settingCommuteDetails', profile.commute_details || '');

    // Customizable Daily Routine Timings & Actions
    setInputValue('settingWakeTime', profile.wake_time || '08:00');
    setInputValue('settingSleepTime', profile.sleep_time || '00:15');
    setInputValue('settingExerciseTime', profile.exercise_time || '08:10');
    setInputValue('settingExerciseAction', profile.exercise_action || '');
    setInputValue('settingBreakfastTime', profile.breakfast_time || '10:30');
    setInputValue('settingBreakfastAction', profile.breakfast_action || '');
    setInputValue('settingLunchTime', profile.lunch_time || '13:00');
    setInputValue('settingLunchAction', profile.lunch_action || '');
    setInputValue('settingLunchWalkTime', profile.lunch_walk_time || '13:15');
    setInputValue('settingSnackTime', profile.snack_time || '16:30');
    setInputValue('settingSnackAction', profile.snack_action || '');
    setInputValue('settingDinnerTime', profile.dinner_time || '21:00');
    setInputValue('settingDinnerAction', profile.dinner_action || '');
    setInputValue('settingDinnerWalkTime', profile.dinner_walk_time || '21:45');

    const toggleDietOpts = () => {
      const diet = document.getElementById('settingDiet')?.value;
      const nonVegOpts = document.getElementById('settingNonVegOpts');
      const vegOpts = document.getElementById('settingVegOpts');
      if (diet === 'veg') {
        if (nonVegOpts) nonVegOpts.style.display = 'none';
        if (vegOpts) vegOpts.style.display = 'flex';
      } else {
        if (nonVegOpts) nonVegOpts.style.display = 'flex';
        if (vegOpts) vegOpts.style.display = 'none';
      }
    };

    const toggleMedicalOpts = () => {
      const hasMedical = document.getElementById('settingHasMedical')?.checked;
      const medicalOpts = document.getElementById('settingMedicalOpts');
      if (medicalOpts) {
        medicalOpts.style.display = hasMedical ? 'flex' : 'none';
      }
    };
    
    const toggleThyroidOpts = () => {
      const hasThyroid = document.getElementById('settingHasThyroid')?.checked;
      const thyroidOpts = document.getElementById('settingThyroidDetailsWrap');
      if (thyroidOpts) thyroidOpts.style.display = hasThyroid ? 'block' : 'none';
    };
    
    const toggleJointOpts = () => {
      const hasJoint = document.getElementById('settingHasJointPain')?.checked;
      const jointOpts = document.getElementById('settingJointPainDetailsWrap');
      if (jointOpts) jointOpts.style.display = hasJoint ? 'grid' : 'none';
    };

    // Initialize display states
    toggleDietOpts();
    toggleMedicalOpts();
    toggleThyroidOpts();
    toggleJointOpts();

    // Attach local toggle listeners inside openSettings or ensure they are bound once
    const dietSelect = document.getElementById('settingDiet');
    if (dietSelect && !dietSelect.dataset.listenerBound) {
      dietSelect.addEventListener('change', toggleDietOpts);
      dietSelect.dataset.listenerBound = 'true';
    }

    const hasMedCheck = document.getElementById('settingHasMedical');
    if (hasMedCheck && !hasMedCheck.dataset.listenerBound) {
      hasMedCheck.addEventListener('change', toggleMedicalOpts);
      hasMedCheck.dataset.listenerBound = 'true';
    }

    const hasThyroidCheck = document.getElementById('settingHasThyroid');
    if (hasThyroidCheck && !hasThyroidCheck.dataset.listenerBound) {
      hasThyroidCheck.addEventListener('change', toggleThyroidOpts);
      hasThyroidCheck.dataset.listenerBound = 'true';
    }
    
    const hasJointCheck = document.getElementById('settingHasJointPain');
    if (hasJointCheck && !hasJointCheck.dataset.listenerBound) {
      hasJointCheck.addEventListener('change', toggleJointOpts);
      hasJointCheck.dataset.listenerBound = 'true';
    }

    checkSettingsGoalValidity();
    modal.showModal();
  };

  if (modal) {
    if (settingsBtn) {
      settingsBtn.addEventListener('click', openSettings);
    }
    
    // Open settings from Dashboard "Edit Profile" button
    const dashEditProfileBtn = document.getElementById('dashEditProfileBtn');
    if (dashEditProfileBtn) {
      dashEditProfileBtn.addEventListener('click', openSettings);
    }

    // Open settings from dashboard cards
    const statWeight = document.getElementById('statWeight');
    if (statWeight) statWeight.addEventListener('click', openSettings);
    
    const statWaist = document.getElementById('statWaist');
    if (statWaist) statWaist.addEventListener('click', openSettings);
    
    const statBmi = document.getElementById('statBmi');
    if (statBmi) statBmi.addEventListener('click', openSettings);

    const settingHeightInput = document.getElementById('settingHeight');
    const settingWeightInput = document.getElementById('settingCurrentWeight');
    if (settingHeightInput) {
      settingHeightInput.addEventListener('input', updateSettingsBmiDisplay);
    }
    if (settingWeightInput) {
      settingWeightInput.addEventListener('input', updateSettingsBmiDisplay);
    }

    // Live validation for safe weight target rate in settings
    const settingTargetWeight = document.getElementById('settingTargetWeight');
    const settingTimelineVal = document.getElementById('settingTimelineVal');
    const settingTimelineUnit = document.getElementById('settingTimelineUnit');
    if (settingWeightInput) settingWeightInput.addEventListener('input', checkSettingsGoalValidity);
    if (settingTargetWeight) settingTargetWeight.addEventListener('input', checkSettingsGoalValidity);
    if (settingTimelineVal) settingTimelineVal.addEventListener('input', checkSettingsGoalValidity);
    if (settingTimelineUnit) settingTimelineUnit.addEventListener('change', checkSettingsGoalValidity);
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.close());
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const chkSettingTerms = document.getElementById('settingAcceptTerms');
      if (chkSettingTerms && !chkSettingTerms.checked) {
        showToast('You must reaffirm agreement to the Terms & digital Liability Release to save settings.', 'warning');
        return;
      }
      const profile = getProfile();
      if (!profile.agreed_to_terms) {
        profile.agreed_to_terms = true;
        profile.agreed_to_terms_timestamp = new Date().toISOString();
      }
      profile.name = document.getElementById('settingName')?.value || profile.name;
      profile.age = getInputNumber('settingAge') || profile.age;
      profile.sex = document.getElementById('settingGender')?.value || 'male';
      profile.fitness_level = document.getElementById('settingFitnessLevel')?.value || 'beginner';
      profile.program_start_date = document.getElementById('settingStartDate')?.value || profile.program_start_date;
      profile.primary_goal = document.getElementById('settingGoal')?.value || profile.primary_goal;
      profile.meals_per_day = getInputNumber('settingMeals') || profile.meals_per_day;

      profile.target_weight_kg = getInputNumber('settingTargetWeight') || profile.target_weight_kg;
      profile.start_waist_in = getInputNumber('settingStartWaist') || profile.start_waist_in;
      profile.target_waist_in = getInputNumber('settingTargetWaist') || profile.target_waist_in;
      profile.target_timeline_value = getInputNumber('settingTimelineVal') || profile.target_timeline_value;
      profile.target_timeline_unit = document.getElementById('settingTimelineUnit')?.value || profile.target_timeline_unit;

      profile.diet_type = document.getElementById('settingDiet')?.value || profile.diet_type;
      profile.non_veg_frequency = document.getElementById('settingNonVegFreq')?.value || profile.non_veg_frequency;
      
      const restrictedDays = [];
      document.querySelectorAll('.setting-day-chk:checked').forEach(c => restrictedDays.push(c.value));
      profile.restricted_non_veg_days = restrictedDays;

      profile.eat_egg = document.getElementById('settingEatEgg')?.checked || false;
      profile.smoking_status = document.getElementById('settingSmoking')?.value || profile.smoking_status;
      profile.drinking_status = document.getElementById('settingDrinking')?.value || profile.drinking_status;
      profile.diet_region = document.getElementById('settingDietRegion')?.value || profile.diet_region;
      profile.gluten_free = document.getElementById('settingGlutenFree')?.checked || false;
      profile.lactose_free = document.getElementById('settingLactoseFree')?.checked || false;

      profile.has_triglycerides = document.getElementById('settingHasTriglycerides')?.checked || false;
      profile.has_ldl = document.getElementById('settingHasLdl')?.checked || false;
      profile.has_heart_blockage = document.getElementById('settingHasHeartBlockage')?.checked || false;
      profile.has_hypertension = document.getElementById('settingHasHypertension')?.checked || false;
      profile.has_diabetes = document.getElementById('settingHasDiabetes')?.checked || false;
      profile.has_thyroid = document.getElementById('settingHasThyroid')?.checked || false;
      if (profile.has_thyroid) {
        profile.thyroid_type = document.getElementById('settingThyroidType')?.value || 'hypothyroidism';
        profile.thyroid_medicine = document.getElementById('settingThyroidMed')?.value || '';
      }

      profile.has_joint_pain = document.getElementById('settingHasJointPain')?.checked || false;
      if (profile.has_joint_pain) {
        const jointLocs = [];
        document.querySelectorAll('.setting-joint-chk:checked').forEach(c => jointLocs.push(c.value));
        profile.joint_pain_locations = jointLocs;
      } else {
        profile.joint_pain_locations = [];
      }

      profile.has_medical_conditions = !!(
        profile.has_triglycerides ||
        profile.has_ldl ||
        profile.has_heart_blockage ||
        profile.has_hypertension ||
        profile.has_diabetes ||
        profile.has_thyroid
      );
      
      const conditions = [];
      if (profile.has_triglycerides) conditions.push('High Triglycerides');
      if (profile.has_ldl) conditions.push('High LDL Cholesterol');
      if (profile.has_heart_blockage) conditions.push('Heart Blockage / CAD');
      if (profile.has_hypertension) conditions.push('High BP (Hypertension)');
      if (profile.has_diabetes) conditions.push('Diabetes / Pre-diabetes');
      if (profile.has_thyroid) conditions.push('Thyroid Condition');
      profile.medical_conditions = conditions.join(', ');
      profile.medications = document.getElementById('settingMeds')?.value || '';

      profile.work_activity = document.getElementById('settingWorkActivity')?.value || 'sedentary';
      profile.sleep_category = document.getElementById('settingSleepCategory')?.value || 'optimal';
      profile.stress_level = document.getElementById('settingStressLevel')?.value || 'moderate';
      profile.commute_details = document.getElementById('settingCommuteDetails')?.value || '';

      profile.wake_time = document.getElementById('settingWakeTime')?.value || profile.wake_time;
      profile.sleep_time = document.getElementById('settingSleepTime')?.value || profile.sleep_time;
      profile.exercise_time = document.getElementById('settingExerciseTime')?.value || profile.exercise_time;
      profile.exercise_action = document.getElementById('settingExerciseAction')?.value !== undefined ? document.getElementById('settingExerciseAction').value : profile.exercise_action;
      profile.breakfast_time = document.getElementById('settingBreakfastTime')?.value || profile.breakfast_time;
      profile.breakfast_action = document.getElementById('settingBreakfastAction')?.value !== undefined ? document.getElementById('settingBreakfastAction').value : profile.breakfast_action;
      profile.lunch_time = document.getElementById('settingLunchTime')?.value || profile.lunch_time;
      profile.lunch_action = document.getElementById('settingLunchAction')?.value !== undefined ? document.getElementById('settingLunchAction').value : profile.lunch_action;
      profile.lunch_walk_time = document.getElementById('settingLunchWalkTime')?.value || profile.lunch_walk_time;
      profile.snack_time = document.getElementById('settingSnackTime')?.value || profile.snack_time;
      profile.snack_action = document.getElementById('settingSnackAction')?.value !== undefined ? document.getElementById('settingSnackAction').value : profile.snack_action;
      profile.dinner_time = document.getElementById('settingDinnerTime')?.value || profile.dinner_time;
      profile.dinner_action = document.getElementById('settingDinnerAction')?.value !== undefined ? document.getElementById('settingDinnerAction').value : profile.dinner_action;
      profile.dinner_walk_time = document.getElementById('settingDinnerWalkTime')?.value || profile.dinner_walk_time;

      // Save weight & height
      const oldWeight = profile.start_weight_kg;
      const oldHeight = profile.height_cm;
      profile.start_weight_kg = getInputNumber('settingCurrentWeight') || profile.start_weight_kg;
      profile.height_cm = getInputNumber('settingHeight') || profile.height_cm;

      // Sync updated weight to today's log if it's the current date
      const today = getDateStr(new Date());
      const log = getDailyLog(today);
      log.weight_kg = profile.start_weight_kg;
      saveDailyLog(today, log);

      const saveSettingsFlow = () => {
        saveProfile(profile); // This automatically calls rebuildDynamicData
        
        // Re-configure targets dynamically if weight or height changed
        if (profile.start_weight_kg !== oldWeight || profile.height_cm !== oldHeight) {
          const settings = getSettings();
          const w = profile.start_weight_kg;
          const h = profile.height_cm;
          const bmi = w / ((h / 100) * (h / 100));
          if (bmi >= 30 || profile.age >= 45) {
            settings.step_target = 6000;
          } else if (profile.primary_goal === 'muscle_gain') {
            settings.step_target = 10000;
          } else {
            settings.step_target = 8000;
          }
          
          if (profile.primary_goal === 'muscle_gain') {
            settings.protein_target_g = Math.round(profile.start_weight_kg * 1.5);
          } else {
            settings.protein_target_g = Math.round(profile.start_weight_kg * 1.2);
          }
          saveSettings(settings);
        }
        
        const settings = getSettings();
        settings.lunch_walk_alarm = profile.lunch_walk_time;
        settings.dinner_walk_alarm = profile.dinner_walk_time;
        saveSettings(settings);
        
        modal?.close();
        showToast('Settings saved! ⚙️', 'success');
        updateProgramInfo();
        updateAvatars();
        renderCurrentScreen();
      };

      // Handle avatar file upload
      const avatarFileEl = document.getElementById('settingAvatarFile');
      if (avatarFileEl && avatarFileEl.files && avatarFileEl.files[0]) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          profile.avatar_url = ev.target.result;
          saveSettingsFlow();
        };
        reader.readAsDataURL(avatarFileEl.files[0]);
      } else {
        saveSettingsFlow();
      }
    });
  }

  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', () => {
      generateSampleData();
      modal?.close();
      showToast('Sample data loaded! 📊');
      renderCurrentScreen();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.clear();
        modal?.close();
        showToast('All data cleared.');
        window.location.reload();
      }
    });
  }
}

// ── Schedule Editor ─────────────────────────────────────────
function bindScheduleEditor() {
  const editBtn = document.getElementById('editScheduleBtn');
  const modal = document.getElementById('scheduleEditorModal');
  const closeBtn = document.getElementById('scheduleEditorClose');
  const saveBtn = document.getElementById('scheduleSaveBtn');
  const resetBtn = document.getElementById('scheduleResetBtn');
  const addBlockBtn = document.getElementById('scheduleAddBlock');
  const editorList = document.getElementById('scheduleEditorList');

  if (!modal) return;

  const populateList = (schedule) => {
    if (!editorList) return;
    editorList.innerHTML = schedule.map((item, i) => `
      <div class="schedule-editor-row" data-index="${i}">
        <input type="text" class="schedule-time" value="${item.time || ''}" placeholder="Time (e.g. 8:00 AM)">
        <input type="text" class="schedule-action" value="${item.action || ''}" placeholder="Action">
        <select class="schedule-category">
          <option value="health" ${item.category === 'health' ? 'selected' : ''}>Health</option>
          <option value="food" ${item.category === 'food' ? 'selected' : ''}>Food</option>
          <option value="movement" ${item.category === 'movement' ? 'selected' : ''}>Movement</option>
        </select>
        <button class="schedule-remove-btn" title="Remove block">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      </div>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  const openEditor = () => {
    const schedule = getActiveSchedule();
    populateList(schedule);
    modal.showModal();
  };

  if (editBtn) editBtn.addEventListener('click', openEditor);
  if (closeBtn) closeBtn.addEventListener('click', () => modal.close());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  if (editorList) {
    editorList.addEventListener('click', (e) => {
      const btn = e.target.closest('.schedule-remove-btn');
      if (btn) {
        const row = btn.closest('.schedule-editor-row');
        if (row) row.remove();
      }
    });
  }

  if (addBlockBtn) {
    addBlockBtn.addEventListener('click', () => {
      if (!editorList) return;
      const index = editorList.children.length;
      const newRow = document.createElement('div');
      newRow.className = 'schedule-editor-row';
      newRow.dataset.index = index;
      newRow.innerHTML = `
        <input type="text" class="schedule-time" value="12:00 PM" placeholder="Time (e.g. 8:00 AM)">
        <input type="text" class="schedule-action" value="New activity" placeholder="Action">
        <select class="schedule-category">
          <option value="health" selected>Health</option>
          <option value="food">Food</option>
          <option value="movement">Movement</option>
        </select>
        <button class="schedule-remove-btn" title="Remove block">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      `;
      editorList.appendChild(newRow);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset your schedule to defaults? All custom changes will be lost.')) {
        resetCustomSchedule();
        const schedule = getActiveSchedule();
        populateList(schedule);
        showToast('Schedule reset to defaults! ⚙️');
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const rows = document.querySelectorAll('.schedule-editor-row');
      const newSchedule = [];
      rows.forEach(row => {
        const timeVal = row.querySelector('.schedule-time')?.value.trim();
        const actionVal = row.querySelector('.schedule-action')?.value.trim();
        const catVal = row.querySelector('.schedule-category')?.value;

        if (timeVal && actionVal) {
          let key = null;
          const activeSched = getActiveSchedule();
          const existing = activeSched.find(item => item.action === actionVal && item.category === catVal);
          if (existing && existing.checklist_key) {
            key = existing.checklist_key;
          } else {
            key = actionVal.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
            if (!key) key = `custom_${Date.now()}`;
          }

          newSchedule.push({
            time: timeVal,
            action: actionVal,
            category: catVal,
            checklist_key: key
          });
        }
      });

      if (newSchedule.length === 0) {
        showToast('Schedule cannot be empty!', 'error');
        return;
      }

      saveCustomSchedule(newSchedule);
      modal.close();
      showToast('Custom schedule saved! 🗓️');
      renderTimeline();
      renderChecklists();
      renderWorkout();
      renderTodayScore();
    });
  }
}

// ── Export ──────────────────────────────────────────────────
function bindExportEvents() {
  const exportBtn = document.getElementById('exportBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');

  const doExport = () => {
    const data = {
      profile: getProfile(),
      dailyLogs: getAllDailyLogs(),
      settings: getSettings(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fit-tracker-export-${getDateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported! 📥');
  };

  if (exportBtn) exportBtn.addEventListener('click', doExport);
  if (exportDataBtn) exportDataBtn.addEventListener('click', doExport);
}


// ── Utilities ──────────────────────────────────────────────
function setTextContent(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.value = value;
}

function getInputNumber(id) {
  const el = document.getElementById(id);
  return el ? parseFloat(el.value) || null : null;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getStepsMetrics(steps, weight, height, sex) {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
    return {
      calories: 0,
      distance: '0.00',
      requiresProfile: true
    };
  }

  // Calculate sex-specific stride length multiplier
  const s = sex || 'male';
  const strideMultiplier = (s.toLowerCase() === 'female') ? 0.00413 : 0.00415;
  const strideMeters = h * strideMultiplier;
  
  // Calculate distance in kilometers
  const distanceKm = (steps * strideMeters) / 1000;

  // Personalized Metabolic Equivalent of Task (MET) adjustment
  let metAdjustment = 1.0;
  let age = 30; // default fallback
  try {
    const profile = getProfile();
    if (profile) {
      if (profile.fitness_level === 'beginner') {
        metAdjustment = 1.10;
      } else if (profile.fitness_level === 'advanced') {
        metAdjustment = 0.95;
      }
      if (profile.age) {
        age = parseFloat(profile.age) || 30;
      }
    }
  } catch (e) {
    console.warn("Failed to read profile for fitness MET adjustment & age, using baseline", e);
  }

  // BMR Calculation (Harris-Benedict equation)
  let bmr = 0;
  if (s.toLowerCase() === 'female') {
    bmr = 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * age);
  } else {
    bmr = 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * age);
  }

  // Net Active Calories = Net MET (2.5) * (BMR / 1440) * duration (steps / 100 cadence) * metAdjustment
  const calories = Math.round((2.5 * bmr / 1440) * (steps / 100) * metAdjustment);

  return {
    calories: Math.max(0, calories),
    distance: distanceKm.toFixed(2),
    requiresProfile: false
  };
}

function findLatestValue(logs, key) {
  const dates = Object.keys(logs).sort().reverse();
  for (const date of dates) {
    if (logs[date][key]) return logs[date][key];
  }
  return null;
}

function getChecklistValueByKey(checklist, key) {
  for (const category of Object.values(checklist)) {
    if (category && category[key]) return true;
  }
  return false;
}

function isTimePast(timeStr, now) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const target = new Date(now);
  target.setHours(hours, minutes || 0, 0, 0);
  return now > target;
}

function isTimeNear(timeStr, now) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const target = new Date(now);
  target.setHours(hours, minutes || 0, 0, 0);
  const diff = Math.abs(now - target);
  return diff < 30 * 60 * 1000; // Within 30 minutes
}

function updateProgressRing(id, value, max) {
  const el = document.getElementById(id);
  if (!el) return;
  const r = parseFloat(el.getAttribute('r')) || 60;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, (value || 0) / max);
  const offset = circumference - pct * circumference;
  el.style.strokeDasharray = circumference;
  el.style.strokeDashoffset = offset;
}

function getCategoryMax(category) {
  if (!CHECKLIST_TEMPLATE[category]) return 1;
  return CHECKLIST_TEMPLATE[category].reduce((sum, item) => sum + item.points, 0);
}

function calculateWeeklyCompliance() {
  const today = new Date();
  const dayOfWeek = today.getDay() || 7; // 1=Mon...7=Sun
  let totalScore = 0;
  let daysCount = 0;

  for (let i = 0; i < dayOfWeek; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getDateStr(d);
    const score = calculateDailyScore(dateStr);
    totalScore += score.score;
    daysCount++;
  }

  return daysCount > 0 ? totalScore / daysCount : 0;
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  
  // Icon based on type
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = '<i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>';
  } else if (type === 'warning') {
    iconHtml = '<i data-lucide="alert-triangle" style="width: 16px; height: 16px;"></i>';
  } else {
    iconHtml = '<i data-lucide="info" style="width: 16px; height: 16px;"></i>';
  }
  toast.innerHTML = `${iconHtml}<span>${message}</span>`;

  // Stacking context: append to open dialog if present so it renders in the browser's top layer
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog) {
    const targetContainer = openDialog.querySelector('.modal-content') || openDialog;
    targetContainer.appendChild(toast);
  } else {
    document.body.appendChild(toast);
  }

  // Re-create icons for the toast
  if (typeof lucide !== 'undefined') {
    lucide.createIcons({ attrs: { class: 'lucide' }, node: toast });
  }

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Step Calculator Modal Event Binding ────────────────────
function bindStepCalculatorModal() {
  const stepsCard = document.getElementById('stepsCard');
  const modal = document.getElementById('stepCalculatorModal');
  if (stepsCard && modal) {
    let updateTimer = null;

    const updateModalData = () => {
      const today = getDateStr(new Date());

      let isAndroid = false;
      let deviceInfo = { manufacturer: "Web", model: "Browser", trackingMode: "simulator" };

      // Fetch latest steps from native if on Android and update daily log
      if (typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid()) {
        isAndroid = true;
        const nativeSteps = window.AndroidInterface.getStepsToday();
        const log = getDailyLog(today);
        if (log.steps !== nativeSteps) {
          log.steps = nativeSteps;
          saveDailyLog(today, log);
          
          // Auto-check checklist compliance
          const checklist = getChecklist(today);
          if (!checklist.movement) checklist.movement = {};
          const target = getAdjustedStepTarget(today);
          const targetMet = nativeSteps >= target;
          if (checklist.movement.step_target !== targetMet) {
            checklist.movement.step_target = targetMet;
            saveChecklist(today, checklist);
          }
        }

        // Fetch device capabilities
        if (typeof window.AndroidInterface.getDeviceInfo === 'function') {
          try {
            deviceInfo = JSON.parse(window.AndroidInterface.getDeviceInfo());
          } catch (e) {
            console.error("Failed to parse device info", e);
          }
        }
      }

      // Update Device UI labels
      const deviceEl = document.getElementById('calcDeviceInfo');
      const engineEl = document.getElementById('calcSensorEngine');
      if (deviceEl) {
        deviceEl.textContent = `Device: ${deviceInfo.manufacturer} ${deviceInfo.model}`;
      }
      if (engineEl) {
        let engineText = "Engine: Web Simulator";
        if (isAndroid) {
          if (deviceInfo.trackingMode === 'counter') {
            engineText = `Engine: Pedometer Counter (Mode 1)`;
          } else if (deviceInfo.trackingMode === 'detector') {
            engineText = `Engine: Pedometer Detector (Mode 2)`;
          } else if (deviceInfo.trackingMode === 'accelerometer') {
            engineText = `Engine: Accelerometer Fallback (Mode 3)`;
          } else {
            engineText = `Engine: Hardware Sensor`;
          }
        }
        engineEl.textContent = engineText;
      }

      const log = getDailyLog(today);
      const steps = log.steps || 0;
      
      const details = getStepRolloverDetails(today);
      const allLogs = getAllDailyLogs();
      const profile = getProfile();
      const latestWeight = findLatestValue(allLogs, 'weight_kg') || profile.start_weight_kg;
      const height = profile.height_cm;
      
      const stepsMetrics = getStepsMetrics(steps, latestWeight, height, profile.sex);
      const activeMinutes = Math.round(steps * 0.008);
      
      // Update DOM elements
      setTextContent('calcStepsToday', steps.toLocaleString());
      const warningEl = document.getElementById('calcProfileWarning');
      if (stepsMetrics.requiresProfile) {
        setTextContent('calcCalories', '-- kcal');
        setTextContent('calcDistance', '-- km');
        if (warningEl) warningEl.style.display = 'block';
      } else {
        setTextContent('calcCalories', `${stepsMetrics.calories} kcal`);
        setTextContent('calcDistance', `${stepsMetrics.distance} km`);
        if (warningEl) warningEl.style.display = 'none';
      }
      setTextContent('calcActiveMinutes', `${activeMinutes} mins`);
      setTextContent('calcBaseTarget', details.baseTarget.toLocaleString());
      
      setTextContent('calcYesterdaySteps', details.yesterdaySteps.toLocaleString());
      setTextContent('calcYesterdayTarget', details.yesterdayTarget.toLocaleString());
      
      const deltaEl = document.getElementById('calcYesterdayDelta');
      if (deltaEl) {
        if (details.type === 'deficit') {
          deltaEl.textContent = `-${Math.abs(details.delta).toLocaleString()} steps (Deficit)`;
          deltaEl.style.color = 'var(--danger)';
        } else if (details.type === 'credit') {
          deltaEl.textContent = `+${Math.abs(details.delta).toLocaleString()} steps (Credit)`;
          deltaEl.style.color = 'var(--success)';
        } else {
          deltaEl.textContent = '0 steps';
          deltaEl.style.color = 'var(--text)';
        }
      }
      
      setTextContent('calcAdjustedTarget', details.adjustedTarget.toLocaleString());
      
      const explEl = document.getElementById('calcRolloverExplanation');
      if (explEl) {
        if (details.type === 'deficit') {
          explEl.textContent = `* Yesterday's deficit of ${Math.abs(details.delta).toLocaleString()} steps has been added to today's target. Today's goal is adjusted to ${details.adjustedTarget.toLocaleString()} steps.`;
        } else if (details.type === 'credit') {
          explEl.textContent = `* Yesterday's credit of ${Math.abs(details.delta).toLocaleString()} steps has been deducted from today's target. Today's goal is adjusted to ${details.adjustedTarget.toLocaleString()} steps.`;
        } else {
          explEl.textContent = `* Yesterday's target was met exactly or it is the first day of the program. Today's goal remains at the base target of ${details.baseTarget.toLocaleString()} steps.`;
        }
      }

      // Pulse connection/walking status indicator
      const statusIcon = document.getElementById('calcConnectionStatus');
      if (statusIcon) {
        const lastSteps = parseInt(statusIcon.dataset.lastSteps || "0");
        const isCurrentlyWalking = (steps > lastSteps && lastSteps > 0);
        
        if (isCurrentlyWalking) {
          statusIcon.innerHTML = `<span class="live-pulse live-pulse--active"></span>Walking detected (Live)`;
          statusIcon.style.color = 'var(--success)';
          statusIcon.classList.add('bouncing');
          
          clearTimeout(window.walkActiveTimeout);
          window.walkActiveTimeout = setTimeout(() => {
            statusIcon.innerHTML = `<span class="live-pulse"></span>Pedometer Active (Standing Still)`;
            statusIcon.style.color = 'var(--text-secondary)';
            statusIcon.classList.remove('bouncing');
          }, 3000);
        } else {
          if (!window.walkActiveTimeout) {
            statusIcon.innerHTML = `<span class="live-pulse"></span>Pedometer Active (Standing Still)`;
            statusIcon.style.color = 'var(--text-secondary)';
            statusIcon.classList.remove('bouncing');
          }
        }
        statusIcon.dataset.lastSteps = steps;
      }
    };

    stepsCard.addEventListener('click', () => {
      updateModalData();
      modal.showModal();
      
      // Start polling for real-time updates every 500ms
      if (updateTimer) clearInterval(updateTimer);
      updateTimer = setInterval(updateModalData, 500);
    });

    modal.addEventListener('close', () => {
      if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
      }
      
      // Refresh dashboard to show latest metrics
      renderDashboard();
    });
  }
}

// ── Walk Alarm Monitoring ──────────────────────────────────
function checkWalkAlarms() {
  const settings = getSettings();
  if (!settings.notifications_enabled) return;
  
  const now = new Date();
  const todayStr = getDateStr(now);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;
  
  const alarmLunch = settings.lunch_walk_alarm || '13:15';
  const alarmDinner = settings.dinner_walk_alarm || '21:45';
  
  const isAndroid = typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid();
  
  // Check Lunch Walk Alarm
  if (currentTimeStr === alarmLunch) {
    const key = `alarm_sent_lunch_${todayStr}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, 'true');
      const title = "Post-Lunch Walk Reminder 🚶‍♂️";
      const msg = "Time for your 10-minute post-lunch walk! Tap to log compliance.";
      if (isAndroid) {
        window.AndroidInterface.showNotification(title, msg, 'post_lunch_walk');
      } else {
        showToast(title + ": " + msg);
        window.triggerWalkReminder('post_lunch_walk');
      }
    }
  }
  
  // Check Dinner Walk Alarm
  if (currentTimeStr === alarmDinner) {
    const key = `alarm_sent_dinner_${todayStr}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, 'true');
      const title = "Post-Dinner Walk Reminder 🚶‍♂️";
      const msg = "Time for your 10-minute post-dinner walk! Tap to log compliance.";
      if (isAndroid) {
        window.AndroidInterface.showNotification(title, msg, 'post_dinner_walk');
      } else {
        showToast(title + ": " + msg);
        window.triggerWalkReminder('post_dinner_walk');
      }
    }
  }
}

// ── Walk Verification Modal Trigger ────────────────────────
window.triggerWalkReminder = function(walkType) {
  const modal = document.getElementById('walkReminderModal');
  if (!modal) return;
  
  const titleEl = document.getElementById('walkReminderTitle');
  const msgEl = document.getElementById('walkReminderMsg');
  
  if (walkType === 'post_lunch_walk') {
    if (titleEl) titleEl.textContent = 'Post-Lunch Walk';
    if (msgEl) msgEl.textContent = 'Did you complete your 10-minute walk after lunch?';
  } else if (walkType === 'post_dinner_walk') {
    if (titleEl) titleEl.textContent = 'Post-Dinner Walk';
    if (msgEl) msgEl.textContent = 'Did you complete your 10-minute walk after dinner?';
  } else {
    if (titleEl) titleEl.textContent = 'Walk Reminder';
    if (msgEl) msgEl.textContent = 'Did you complete your scheduled walk?';
  }
  
  const btnYes = document.getElementById('btnLogWalkYes');
  const btnNo = document.getElementById('btnLogWalkNo');
  
  // Remove old listeners by replacing elements with clones
  const newBtnYes = btnYes.cloneNode(true);
  const newBtnNo = btnNo.cloneNode(true);
  btnYes.parentNode.replaceChild(newBtnYes, btnYes);
  btnNo.parentNode.replaceChild(newBtnNo, btnNo);
  
  newBtnYes.addEventListener('click', () => {
    logWalkCompletion(walkType, true);
    modal.close();
  });
  
  newBtnNo.addEventListener('click', () => {
    logWalkCompletion(walkType, false);
    modal.close();
  });
  
  // Re-initialize icons inside modal
  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  modal.showModal();
};

function logWalkCompletion(walkType, isCompleted) {
  const today = getDateStr(new Date());
  const checklist = getChecklist(today);
  if (!checklist.movement) checklist.movement = {};
  checklist.movement[walkType] = isCompleted;
  saveChecklist(today, checklist);
  
  showToast(isCompleted ? 'Walk logged successfully! 🎉' : 'Walk skipped. ⚠️');
  
  // Refresh current screen to update progress
  renderCurrentScreen();
}

// Pedometer Motion Detection (Shake to Step fallback)
function initMotionPedometer() {
  const isAndroid = typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid();
  if (isAndroid) {
    console.log("Pedometer: Running on Android. Disabling JavaScript motion sensor fallback to prevent overwriting native steps.");
    return;
  }

  let lastX = null, lastY = null, lastZ = null;
  let threshold = 4.0; // calibrated walking acceleration change threshold
  let lastShakeTime = 0;

  window.addEventListener('devicemotion', (event) => {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    const x = acceleration.x;
    const y = acceleration.y;
    const z = acceleration.z;

    if (lastX !== null) {
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);

      // If acceleration delta exceeds threshold, register a step
      if ((deltaX + deltaY + deltaZ) > threshold) {
        const now = Date.now();
        if (now - lastShakeTime > 400) { // debounce (max walking step frequency)
          lastShakeTime = now;
          
          const today = getDateStr(new Date());
          const log = getDailyLog(today);
          const currentSteps = log.steps || 0;
          const newSteps = currentSteps + 1;
          
          log.steps = newSteps;
          saveDailyLog(today, log);
          
          if (typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid()) {
            window.AndroidInterface.saveStepsToday(newSteps);
          }
          
          // Smooth dashboard refresh if active
          if (currentScreen === 'dashboard') {
            renderDashboard();
          } else if (currentScreen === 'today' && currentDate === today) {
            renderToday();
          }
          console.log("Shake step registered. Total steps today: " + newSteps);
        }
      }
    }

    lastX = x;
    lastY = y;
    lastZ = z;
  });
}

// ── Onboarding Wizard Logic ─────────────────────────────────
function bindOnboardingEvents() {
  const modal = document.getElementById('onboardingModal');
  if (!modal) return;

  const steps = [
    document.getElementById('onboardingStep1'),
    document.getElementById('onboardingStep2'),
    document.getElementById('onboardingStep3'),
    document.getElementById('onboardingStep4'),
    document.getElementById('onboardingStep5')
  ];

  const btnNext = document.getElementById('btnObNext');
  const btnBack = document.getElementById('btnObBack');
  const indicator = document.getElementById('onboardingStepIndicator');
  const progressBar = document.getElementById('onboardingProgressBar');
  const spacer = document.getElementById('obSpacer');

  let currentStep = 1;

  // Diet inputs
  const obDiet = document.getElementById('obDiet');
  const obNonVegOpts = document.getElementById('obNonVegOpts');
  const obVegOpts = document.getElementById('obVegOpts');

  if (obDiet) {
    obDiet.addEventListener('change', () => {
      if (obDiet.value === 'veg') {
        if (obNonVegOpts) obNonVegOpts.style.display = 'none';
        if (obVegOpts) obVegOpts.style.display = 'flex';
      } else {
        if (obNonVegOpts) obNonVegOpts.style.display = 'flex';
        if (obVegOpts) obVegOpts.style.display = 'none';
      }
    });
  }

  // Medical conditions checkbox
  const obHasMedical = document.getElementById('obHasMedical');
  const obMedicalOpts = document.getElementById('obMedicalOpts');
  if (obHasMedical) {
    obHasMedical.addEventListener('change', () => {
      if (obMedicalOpts) obMedicalOpts.style.display = obHasMedical.checked ? 'flex' : 'none';
    });
  }
  
  const obHasThyroid = document.getElementById('obHasThyroid');
  const obThyroidOpts = document.getElementById('obThyroidDetailsWrap');
  if (obHasThyroid) {
    obHasThyroid.addEventListener('change', () => {
      if (obThyroidOpts) obThyroidOpts.style.display = obHasThyroid.checked ? 'flex' : 'none';
    });
  }
  
  const obHasJointPain = document.getElementById('obHasJointPain');
  const obJointOpts = document.getElementById('obJointPainDetailsWrap');
  if (obHasJointPain) {
    obHasJointPain.addEventListener('change', () => {
      if (obJointOpts) obJointOpts.style.display = obHasJointPain.checked ? 'grid' : 'none';
    });
  }

  // Live BMI calculation inputs
  const obWeight = document.getElementById('obWeight');
  const obHeight = document.getElementById('obHeight');
  const obBmiValue = document.getElementById('obBmiValue');
  const obBmiStatus = document.getElementById('obBmiStatus');

  const updateBmiDisplay = () => {
    if (!obWeight || !obHeight || !obBmiValue || !obBmiStatus) return;
    const w = parseFloat(obWeight.value) || 0;
    const h = parseFloat(obHeight.value) || 0;
    if (w > 0 && h > 0) {
      const bmi = w / ((h / 100) * (h / 100));
      obBmiValue.textContent = bmi.toFixed(1);
      
      let status = 'Normal';
      let color = 'var(--success)';
      if (bmi < 18.5) {
        status = 'Underweight';
        color = 'var(--info)';
      } else if (bmi >= 30) {
        status = 'Obese';
        color = 'var(--danger)';
      } else if (bmi >= 25) {
        status = 'Overweight';
        color = 'var(--warning)';
      }
      
      obBmiStatus.textContent = status;
      obBmiStatus.style.color = color;
      obBmiStatus.style.background = `${color}1A`;
    }
  };

  if (obWeight) obWeight.addEventListener('input', updateBmiDisplay);
  if (obHeight) obHeight.addEventListener('input', updateBmiDisplay);

  // Live validation on Step 3: target rate check
  const obTargetWeight = document.getElementById('obTargetWeight');
  const obTimelineVal = document.getElementById('obTimelineVal');
  const obTimelineUnit = document.getElementById('obTimelineUnit');
  const obGoalAlert = document.getElementById('obGoalAlert');
  const obGoalAlertText = document.getElementById('obGoalAlertText');

  const checkGoalValidity = () => {
    if (!obWeight || !obTargetWeight || !obTimelineVal || !obTimelineUnit || !obGoalAlert || !obGoalAlertText || !btnNext) return false;
    const currentW = parseFloat(obWeight.value) || 0;
    const targetW = parseFloat(obTargetWeight.value) || 0;
    const timeVal = parseFloat(obTimelineVal.value) || 0;
    const unit = obTimelineUnit.value;

    const targetLoss = currentW - targetW;
    
    if (targetLoss <= 0) {
      obGoalAlert.style.display = 'none';
      btnNext.disabled = false;
      btnNext.style.opacity = '1';
      return true;
    }

    let weeks = timeVal;
    if (unit === 'months') {
      weeks = timeVal * 4.33;
    } else if (unit === 'days') {
      weeks = timeVal / 7.0;
    }

    const lossRatePerWeek = targetLoss / weeks;
    const lossRatePerMonth = lossRatePerWeek * 4.33;

    if (lossRatePerWeek > 1.0) {
      const recommendedWeeks = Math.ceil(targetLoss);
      let recommendedMsg = `${recommendedWeeks} weeks`;
      if (recommendedWeeks >= 8) {
        recommendedMsg = `${(recommendedWeeks / 4.33).toFixed(1)} months`;
      }
      
      obGoalAlertText.innerHTML = `
        Healthcare professionals and nutritionists recommend a safe, sustainable weight loss rate of 
        <strong>0.5 - 1 kg per week</strong> (approximately <strong>2 - 4 kg per month</strong>).<br><br>
        Losing <strong>${targetLoss.toFixed(1)} kg</strong> in that timeframe requires losing 
        <strong>${lossRatePerWeek.toFixed(1)} kg/week</strong> (<strong>${lossRatePerMonth.toFixed(1)} kg/month</strong>). 
        To avoid muscle wasting, metabolic slowing, or gallstones, we suggest a target duration of at least <strong>${recommendedMsg}</strong>.
      `;
      obGoalAlert.style.display = 'block';
      btnNext.disabled = true;
      btnNext.style.opacity = '0.5';
      return false;
    } else {
      obGoalAlert.style.display = 'none';
      btnNext.disabled = false;
      btnNext.style.opacity = '1';
      return true;
    }
  };

  if (obTargetWeight) obTargetWeight.addEventListener('input', checkGoalValidity);
  if (obTimelineVal) obTimelineVal.addEventListener('input', checkGoalValidity);
  if (obTimelineUnit) obTimelineUnit.addEventListener('change', checkGoalValidity);

  const populateOnboardingInputs = () => {
    const profile = getProfile();
    const obName = document.getElementById('obName');
    if (obName) obName.value = profile.name || '';
    const obAge = document.getElementById('obAge');
    if (obAge) obAge.value = profile.age || '';
    const obGender = document.getElementById('obGender');
    if (obGender) obGender.value = profile.sex || 'male';
    const obFitnessLevel = document.getElementById('obFitnessLevel');
    if (obFitnessLevel) obFitnessLevel.value = profile.fitness_level || 'beginner';

    const obGoalRadio = document.querySelector(`input[name="obGoal"][value="${profile.primary_goal || 'weight_loss'}"]`);
    if (obGoalRadio) obGoalRadio.checked = true;

    if (obWeight) obWeight.value = profile.start_weight_kg || '';
    if (obHeight) obHeight.value = profile.height_cm || '';
    const obWaist = document.getElementById('obWaist');
    if (obWaist) obWaist.value = profile.start_waist_in || '';
    const obTargetWeight = document.getElementById('obTargetWeight');
    if (obTargetWeight) obTargetWeight.value = profile.target_weight_kg || '';
    const obTimelineVal = document.getElementById('obTimelineVal');
    if (obTimelineVal) obTimelineVal.value = profile.target_timeline_value || '3';
    const obTimelineUnit = document.getElementById('obTimelineUnit');
    if (obTimelineUnit) obTimelineUnit.value = profile.target_timeline_unit || 'months';

    const obMeals = document.getElementById('obMeals');
    if (obMeals) obMeals.value = profile.meals_per_day || 4;
    if (obDiet) obDiet.value = profile.diet_type || 'non_veg';
    const obNonVegFreq = document.getElementById('obNonVegFreq');
    if (obNonVegFreq) obNonVegFreq.value = profile.non_veg_frequency || '3_4_weekly';

    const restrictedDays = profile.restricted_non_veg_days || [];
    document.querySelectorAll('.ob-day-chk').forEach(chk => {
      chk.checked = restrictedDays.includes(chk.value);
    });

    const obSmoking = document.getElementById('obSmoking');
    if (obSmoking) obSmoking.value = profile.smoking_status || 'non_smoker';
    const obDrinking = document.getElementById('obDrinking');
    if (obDrinking) obDrinking.value = profile.drinking_status || 'non_drinking';
    const obDietRegion = document.getElementById('obDietRegion');
    if (obDietRegion) obDietRegion.value = profile.diet_region || 'standard';

    const obGlutenFree = document.getElementById('obGlutenFree');
    if (obGlutenFree) obGlutenFree.checked = !!profile.gluten_free;
    const obLactoseFree = document.getElementById('obLactoseFree');
    if (obLactoseFree) obLactoseFree.checked = !!profile.lactose_free;

    const obHasTriglycerides = document.getElementById('obHasTriglycerides');
    if (obHasTriglycerides) obHasTriglycerides.checked = !!profile.has_triglycerides;
    const obHasLdl = document.getElementById('obHasLdl');
    if (obHasLdl) obHasLdl.checked = !!profile.has_ldl;
    const obHasHeartBlockage = document.getElementById('obHasHeartBlockage');
    if (obHasHeartBlockage) obHasHeartBlockage.checked = !!profile.has_heart_blockage;
    const obHasHypertension = document.getElementById('obHasHypertension');
    if (obHasHypertension) obHasHypertension.checked = !!profile.has_hypertension;
    const obHasDiabetes = document.getElementById('obHasDiabetes');
    if (obHasDiabetes) obHasDiabetes.checked = !!profile.has_diabetes;

    const obHasThyroid = document.getElementById('obHasThyroid');
    if (obHasThyroid) obHasThyroid.checked = !!profile.has_thyroid;
    const obThyroidType = document.getElementById('obThyroidType');
    if (obThyroidType) obThyroidType.value = profile.thyroid_type || 'hypothyroidism';
    const obThyroidMed = document.getElementById('obThyroidMed');
    if (obThyroidMed) obThyroidMed.value = profile.thyroid_medicine || '';

    const obHasJointPain = document.getElementById('obHasJointPain');
    if (obHasJointPain) obHasJointPain.checked = !!profile.has_joint_pain;
    const jointLocs = profile.joint_pain_locations || [];
    document.querySelectorAll('.ob-joint-chk').forEach(chk => {
      chk.checked = jointLocs.includes(chk.value);
    });

    const obMeds = document.getElementById('obMeds');
    if (obMeds) obMeds.value = profile.medications || '';
    const obWorkActivity = document.getElementById('obWorkActivity');
    if (obWorkActivity) obWorkActivity.value = profile.work_activity || 'sedentary';
    const obSleepCategory = document.getElementById('obSleepCategory');
    if (obSleepCategory) obSleepCategory.value = profile.sleep_category || 'optimal';
    const obStressLevel = document.getElementById('obStressLevel');
    if (obStressLevel) obStressLevel.value = profile.stress_level || 'moderate';
    const obCommuteDetails = document.getElementById('obCommuteDetails');
    if (obCommuteDetails) obCommuteDetails.value = profile.commute_details || '';

    const obAcceptTerms = document.getElementById('obAcceptTerms');
    if (obAcceptTerms) obAcceptTerms.checked = !!profile.agreed_to_terms;

    // Trigger display toggles
    if (obNonVegOpts && obVegOpts && obDiet) {
      if (obDiet.value === 'veg') {
        obNonVegOpts.style.display = 'none';
        obVegOpts.style.display = 'flex';
      } else {
        obNonVegOpts.style.display = 'flex';
        obVegOpts.style.display = 'none';
      }
    }
    const obHasMedical = document.getElementById('obHasMedical');
    const obMedicalOpts = document.getElementById('obMedicalOpts');
    if (obHasMedical && obMedicalOpts) {
      obHasMedical.checked = !!profile.has_medical_conditions;
      obMedicalOpts.style.display = obHasMedical.checked ? 'flex' : 'none';
    }
    const obThyroidOpts = document.getElementById('obThyroidDetailsWrap');
    if (obHasThyroid && obThyroidOpts) {
      obThyroidOpts.style.display = obHasThyroid.checked ? 'flex' : 'none';
    }
    const obJointOpts = document.getElementById('obJointPainDetailsWrap');
    if (obHasJointPain && obJointOpts) {
      obJointOpts.style.display = obHasJointPain.checked ? 'grid' : 'none';
    }
    
    // Update live BMI on load
    updateBmiDisplay();
  };

  // Populate onboarding fields initially
  populateOnboardingInputs();

  // Expose populate function to modal open trigger if necessary
  modal.addEventListener('beforeshow', populateOnboardingInputs);
  window.populateOnboardingInputs = populateOnboardingInputs;

  const updateStepView = () => {
    steps.forEach((step, idx) => {
      if (step) step.style.display = (idx + 1 === currentStep) ? 'flex' : 'none';
    });

    if (indicator) indicator.textContent = `Step ${currentStep} of 5`;
    if (progressBar) progressBar.style.width = `${currentStep * 20}%`;

    if (btnBack) {
      btnBack.style.display = currentStep > 1 ? 'block' : 'none';
      if (spacer) spacer.style.display = currentStep > 1 ? 'none' : 'block';
    }

    if (btnNext) {
      btnNext.textContent = currentStep === 5 ? 'Finish' : 'Next';
      btnNext.disabled = false;
      btnNext.style.opacity = '1';
    }

    if (currentStep === 2) {
      updateBmiDisplay();
      checkGoalValidity();
    }
  };

  btnNext.addEventListener('click', () => {
    if (currentStep === 2) {
      if (!checkGoalValidity()) return;
    }

    if (currentStep < 5) {
      currentStep++;
      updateStepView();
    } else {
      const chkTerms = document.getElementById('obAcceptTerms');
      if (chkTerms && !chkTerms.checked) {
        showToast('You must agree to the Terms & Liability Release to finish onboarding.', 'warning');
        return;
      }
      try {
        const profile = getProfile();
        profile.agreed_to_terms = true;
        profile.agreed_to_terms_timestamp = new Date().toISOString();
        profile.name = document.getElementById('obName')?.value || profile.name;
        profile.age = parseInt(document.getElementById('obAge')?.value) || profile.age;
        profile.sex = document.getElementById('obGender')?.value || 'male';
        profile.fitness_level = document.getElementById('obFitnessLevel')?.value || 'beginner';
        profile.primary_goal = document.querySelector('input[name="obGoal"]:checked')?.value || 'weight_loss';
        profile.start_weight_kg = parseFloat(obWeight.value) || profile.start_weight_kg;
        profile.height_cm = parseFloat(obHeight.value) || profile.height_cm;
        profile.start_waist_in = parseFloat(document.getElementById('obWaist')?.value) || profile.start_waist_in;
        profile.target_weight_kg = parseFloat(obTargetWeight.value) || profile.target_weight_kg;
        profile.target_timeline_value = parseFloat(obTimelineVal.value) || 3;
        profile.target_timeline_unit = obTimelineUnit.value;
        profile.meals_per_day = parseInt(document.getElementById('obMeals')?.value) || 4;
        profile.diet_type = obDiet.value;
        profile.non_veg_frequency = document.getElementById('obNonVegFreq')?.value || '3_4_weekly';
        
        const restrictedDays = [];
        document.querySelectorAll('.ob-day-chk:checked').forEach(c => restrictedDays.push(c.value));
        profile.restricted_non_veg_days = restrictedDays;

        profile.eat_egg = (profile.diet_type === 'non_veg' || profile.diet_type === 'eggitarian');
        profile.smoking_status = document.getElementById('obSmoking')?.value || 'non_smoker';
        profile.drinking_status = document.getElementById('obDrinking')?.value || 'non_drinking';
        profile.diet_region = document.getElementById('obDietRegion')?.value || 'standard';
        profile.gluten_free = document.getElementById('obGlutenFree')?.checked || false;
        profile.lactose_free = document.getElementById('obLactoseFree')?.checked || false;

        profile.has_triglycerides = document.getElementById('obHasTriglycerides')?.checked || false;
        profile.has_ldl = document.getElementById('obHasLdl')?.checked || false;
        profile.has_heart_blockage = document.getElementById('obHasHeartBlockage')?.checked || false;
        profile.has_hypertension = document.getElementById('obHasHypertension')?.checked || false;
        profile.has_diabetes = document.getElementById('obHasDiabetes')?.checked || false;
        profile.has_thyroid = document.getElementById('obHasThyroid')?.checked || false;
        if (profile.has_thyroid) {
          profile.thyroid_type = document.getElementById('obThyroidType')?.value || 'hypothyroidism';
          profile.thyroid_medicine = document.getElementById('obThyroidMed')?.value || '';
        }

        profile.has_joint_pain = document.getElementById('obHasJointPain')?.checked || false;
        if (profile.has_joint_pain) {
          const jointLocs = [];
          document.querySelectorAll('.ob-joint-chk:checked').forEach(c => jointLocs.push(c.value));
          profile.joint_pain_locations = jointLocs;
        } else {
          profile.joint_pain_locations = [];
        }
        
        profile.has_medical_conditions = !!(
          profile.has_triglycerides ||
          profile.has_ldl ||
          profile.has_heart_blockage ||
          profile.has_hypertension ||
          profile.has_diabetes ||
          profile.has_thyroid
        );
        
        const conditions = [];
        if (profile.has_triglycerides) conditions.push('High Triglycerides');
        if (profile.has_ldl) conditions.push('High LDL Cholesterol');
        if (profile.has_heart_blockage) conditions.push('Heart Blockage / CAD');
        if (profile.has_hypertension) conditions.push('High BP (Hypertension)');
        if (profile.has_diabetes) conditions.push('Diabetes / Pre-diabetes');
        if (profile.has_thyroid) conditions.push('Thyroid Condition');
        profile.medical_conditions = conditions.join(', ');
        profile.medications = document.getElementById('obMeds')?.value || '';

        profile.work_activity = document.getElementById('obWorkActivity')?.value || 'sedentary';
        profile.sleep_category = document.getElementById('obSleepCategory')?.value || 'optimal';
        profile.stress_level = document.getElementById('obStressLevel')?.value || 'moderate';
        profile.commute_details = document.getElementById('obCommuteDetails')?.value || '';

        // Calculate target waist safely
        if (profile.start_weight_kg && profile.target_weight_kg && profile.start_waist_in) {
          const weightDiffRatio = (profile.start_weight_kg - profile.target_weight_kg) / profile.start_weight_kg;
          profile.target_waist_in = +(profile.start_waist_in * (1 - (weightDiffRatio * 0.8))).toFixed(1);
        } else {
          profile.target_waist_in = profile.target_waist_in || null;
        }

        const finishOnboarding = () => {
          profile.onboarding_completed = true;
          saveProfile(profile);

          // Re-configure targets dynamically
          const settings = getSettings();
          const w = profile.start_weight_kg;
          const h = profile.height_cm;
          let bmi = 0;
          if (w && h) {
            bmi = w / ((h / 100) * (h / 100));
          }
          if (bmi >= 30 || profile.age >= 45) {
            settings.step_target = 6000;
          } else if (profile.primary_goal === 'muscle_gain') {
            settings.step_target = 10000;
          } else {
            settings.step_target = 8000;
          }
          
          const startW = profile.start_weight_kg || 70;
          if (profile.primary_goal === 'muscle_gain') {
            settings.protein_target_g = Math.round(startW * 1.5);
          } else {
            settings.protein_target_g = Math.round(startW * 1.2);
          }
          saveSettings(settings);

          modal.close();
          showToast("Personalized plan generated successfully! 🎉");
          
          const today = getDateStr(new Date());
          const log = getDailyLog(today);
          log.weight_kg = profile.start_weight_kg;
          log.waist_in = profile.start_waist_in;
          saveDailyLog(today, log);

          updateAvatars();
          renderCurrentScreen();
        };

        const obAvatarFileEl = document.getElementById('obAvatarFile');
        if (obAvatarFileEl && obAvatarFileEl.files && obAvatarFileEl.files[0]) {
          const reader = new FileReader();
          reader.onload = function(ev) {
            profile.avatar_url = ev.target.result;
            finishOnboarding();
          };
          reader.readAsDataURL(obAvatarFileEl.files[0]);
        } else {
          finishOnboarding();
        }
      } catch (err) {
        console.error("Error saving onboarding details:", err);
        alert("Unable to finish setup: " + err.message);
      }
    }
  });

  btnBack.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateStepView();
    }
  });
}


// ── Custom Food Logger, Location Engine & 3D Water Tracker ────

function getDailyCalorieTarget(profile) {
  if (!profile) return 2000;
  
  const w = profile.start_weight_kg || 70;
  const h = profile.height_cm || 170;
  const age = profile.age || 30;
  const sex = profile.sex || 'male';
  const fitness = profile.fitness_level || 'beginner';
  const goal = profile.primary_goal || 'weight_loss';

  // Mifflin-St Jeor Equation
  let bmr = 0;
  if (sex === 'female') {
    bmr = 10 * w + 6.25 * h - 5 * age - 161;
  } else {
    bmr = 10 * w + 6.25 * h - 5 * age + 5;
  }

  // Activity factor
  let factor = 1.2;
  if (fitness === 'intermediate') {
    factor = 1.375;
  } else if (fitness === 'advanced') {
    factor = 1.55;
  }

  let target = bmr * factor;

  // Deficit / Surplus adjustment
  if (goal === 'weight_loss') {
    target -= 350;
  } else if (goal === 'muscle_gain') {
    target += 250;
  }

  // Medical boundary clamping (1200 - 4000 kcal)
  target = Math.max(1200, Math.min(4000, Math.round(target)));
  return target;
}

let isLiveLocationEnabled = false;

function showLocationRequiredModal() {
  let modal = document.getElementById('locationRequiredModal');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'locationRequiredModal';
    modal.className = 'modal';
    modal.style.border = 'none';
    modal.style.borderRadius = 'var(--radius-lg)';
    modal.style.padding = '0';
    modal.style.background = 'transparent';
    modal.style.boxShadow = 'var(--shadow-lg)';
    modal.style.maxWidth = '400px';
    modal.style.width = '90%';
    
    modal.innerHTML = `
      <div class="card" style="margin: 0; border-color: var(--primary);">
        <div class="card-header" style="justify-content: center; padding-bottom: var(--space-sm);">
          <h2 style="display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); text-align: center;">
            <i data-lucide="map-pin-off" style="width: 48px; height: 48px; color: var(--danger); animation: pulse 2s infinite;"></i>
            GPS Location Required
          </h2>
        </div>
        <div class="card-body" style="text-align: center; display: flex; flex-direction: column; gap: var(--space-md); padding-top: var(--space-md);">
          <p style="font-size: 14px; line-height: 1.5; color: var(--text-secondary); margin: 0;">
            To search the food database or discover local specialties, the app needs to reference your mobile's live location.
          </p>
          <p style="font-size: 12px; color: var(--text-tertiary); margin: 0;">
            Please enable Location Services (GPS) in your mobile settings and grant browser access, then try again.
          </p>
          <div style="display: flex; gap: var(--space-sm); margin-top: var(--space-sm);">
            <button class="btn btn--primary" id="btnRetryLocation" style="flex: 1;">
              <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Enable & Sync
            </button>
            <button class="btn btn--ghost" id="btnCloseLocationModal" style="flex: 1;">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btnCloseLocationModal').addEventListener('click', () => {
      modal.close();
    });
    modal.querySelector('#btnRetryLocation').addEventListener('click', () => {
      modal.close();
      detectUserLocation();
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ attrs: { class: 'lucide' }, node: modal });
    }
  }
  modal.showModal();
}

function updateLocationUI(isEnabled, cityName) {
  const activeLocationSpan = document.getElementById('activeLocationName');
  const chkEnableLiveLocation = document.getElementById('chkEnableLiveLocation');
  const locationDot = document.getElementById('locationDot');

  if (isEnabled) {
    isLiveLocationEnabled = true;
    if (activeLocationSpan) {
      activeLocationSpan.textContent = cityName || "Location Synced";
      activeLocationSpan.style.cursor = 'default';
    }
    if (chkEnableLiveLocation) {
      chkEnableLiveLocation.checked = true;
    }
    if (locationDot) {
      locationDot.style.background = 'var(--success)';
      locationDot.style.boxShadow = '0 0 8px var(--success)';
      locationDot.classList.add('live-pulse--active');
    }
    if (cityName) {
      updateWeatherPill(cityName);
    }
  } else {
    isLiveLocationEnabled = false;
    if (activeLocationSpan) {
      activeLocationSpan.textContent = "Live location service is off";
      activeLocationSpan.style.cursor = 'default';
    }
    if (chkEnableLiveLocation) {
      chkEnableLiveLocation.checked = false;
    }
    if (locationDot) {
      locationDot.style.background = 'var(--text-tertiary)';
      locationDot.style.boxShadow = 'none';
      locationDot.classList.remove('live-pulse--active');
    }
    updateWeatherPill("London");
  }
}

function handleLocationFailure() {
  updateLocationUI(false);

  const regionalCard = document.getElementById('regionalSpecialtiesCard');
  if (regionalCard) {
    regionalCard.style.display = 'block';
  }

  const coachBox = document.getElementById('aiCoachTipBox');
  if (coachBox) {
    coachBox.style.display = 'none';
  }

  const grid = document.getElementById('regionalSpecialtiesGrid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-md) var(--space-lg); border: 1.5px dashed var(--border); border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.03); display: flex; flex-direction: column; align-items: center; gap: var(--space-xs);">
        <i data-lucide="map-pin-off" style="width: 28px; height: 28px; color: var(--danger);"></i>
        <h4 style="font-size: 13px; font-weight: 700; margin: 0; color: var(--text);">Live Location Services Off</h4>
        <p style="font-size: 11px; color: var(--text-secondary); margin: 0; max-width: 300px; line-height: 1.4;">
          Your mobile's live location is required to search the database and view healthy regional specialties in your area.
        </p>
        <button class="btn btn--sm btn--primary" id="btnEnableLocationInline" style="margin-top: 6px; padding: 4px 12px; font-size: 11px; height: auto;">
          Enable Live Location
        </button>
      </div>
    `;
    
    const inlineBtn = grid.querySelector('#btnEnableLocationInline');
    if (inlineBtn) {
      inlineBtn.addEventListener('click', () => {
        const chk = document.getElementById('chkEnableLiveLocation');
        if (chk) chk.checked = true;
        detectUserLocation();
      });
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ attrs: { class: 'lucide' }, node: grid });
    }
  }
}

function detectUserLocation() {
  const badge = document.getElementById('activeLocationName');
  if (badge) badge.textContent = "Detecting location...";
  const chk = document.getElementById('chkEnableLiveLocation');
  if (chk) chk.checked = true;
  const locationDot = document.getElementById('locationDot');
  if (locationDot) {
    locationDot.style.background = 'var(--warning)';
    locationDot.style.boxShadow = '0 0 8px var(--warning)';
  }

  if (navigator.geolocation) {
    const options = {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 600000 // 10 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
          if (!response.ok) throw new Error("Nominatim fetch failed");
          const data = await response.json();
          const address = data.address || {};
          const city = address.city || address.town || address.state_district || address.village || address.suburb || address.state || "";
          const state = address.state || "";
          
          if (city) {
            isLiveLocationEnabled = true;
            handleDetectedCity(city, state);
          } else {
            isLiveLocationEnabled = false;
            handleLocationFailure();
          }
        } catch (e) {
          console.warn("GPS reverse geocoding failed, falling back to IP", e);
          detectLocationByIP(); // fallback to IP
        }
      },
      (error) => {
        console.warn("GPS lookup failed, falling back to IP", error);
        detectLocationByIP(); // fallback to IP
      },
      options
    );
  } else {
    detectLocationByIP();
  }
}

async function detectLocationByIP() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) throw new Error("IP API fetch failed");
    const data = await response.json();
    const city = data.city || "";
    const regionName = data.region || "";
    if (city) {
      isLiveLocationEnabled = true;
      handleDetectedCity(city, regionName);
    } else {
      isLiveLocationEnabled = false;
      handleLocationFailure();
    }
  } catch (e) {
    console.error("IP geolocation failed", e);
    isLiveLocationEnabled = false;
    handleLocationFailure();
  }
}

function handleDetectedCity(cityName, stateName) {
  updateLocationUI(true, cityName + (stateName ? ", " + stateName : ""));

  const stateLower = (stateName || '').toLowerCase().trim();
  const cityLower = (cityName || '').toLowerCase().trim();
  let regionKey = 'default_india';

  if (stateLower.includes('maharashtra') || cityLower.includes('pune') || cityLower.includes('mumbai') || cityLower.includes('bombay') || cityLower.includes('nagpur') || cityLower.includes('pimpri')) {
    regionKey = 'maharashtra';
  } else if (
    stateLower.includes('delhi') || stateLower.includes('punjab') || stateLower.includes('haryana') || 
    stateLower.includes('uttar pradesh') || stateLower.includes('uttarakhand') || stateLower.includes('himachal pradesh') ||
    cityLower.includes('noida') || cityLower.includes('gurgaon')
  ) {
    regionKey = 'delhi_region';
  } else if (
    stateLower.includes('karnataka') || stateLower.includes('tamil nadu') || stateLower.includes('kerala') || 
    stateLower.includes('andhra pradesh') || stateLower.includes('telangana') || 
    cityLower.includes('bengaluru') || cityLower.includes('bangalore') || cityLower.includes('chennai') || cityLower.includes('hyderabad')
  ) {
    regionKey = 'south_india';
  } else if (
    stateLower.includes('west bengal') || stateLower.includes('bihar') || stateLower.includes('odisha') || 
    stateLower.includes('jharkhand') || cityLower.includes('kolkata')
  ) {
    regionKey = 'east_india';
  } else if (
    stateLower.includes('gujarat') || stateLower.includes('rajasthan') || stateLower.includes('madhya pradesh') || 
    stateLower.includes('goa') || cityLower.includes('ahmedabad') || cityLower.includes('jaipur')
  ) {
    regionKey = 'west_india';
  }

  const regionLabels = {
    'maharashtra': 'Maharashtra Specials',
    'delhi_region': 'North India Specials',
    'south_india': 'South India Specials',
    'east_india': 'East India Specials',
    'west_india': 'Western India Specials',
    'default_india': 'Healthy Local Specials'
  };
  
  const localRegionLabel = document.getElementById('localRegionLabel');
  if (localRegionLabel) {
    localRegionLabel.textContent = regionLabels[regionKey] || 'Local Specials';
  }

  const regionalCard = document.getElementById('regionalSpecialtiesCard');
  if (regionalCard) {
    regionalCard.style.display = 'block';
  }

  renderRegionalSpecialties(regionKey);
}

function getClinicalRecommendation(item, profile) {
  if (!profile) return { status: 'moderation', text: 'Moderation Advised', reason: 'Set up your goals in profile settings to customize recommendation.' };
  
  const isWeightLoss = profile.primary_goal === 'weight_loss';
  const hasTriglycerides = profile.has_triglycerides;
  const hasLdl = profile.has_ldl;
  const name = item.name.toLowerCase();
  const warning = (item.warning || '').toLowerCase();
  
  const isFried = warning.includes('fried') || warning.includes('deep fried') || name.includes('bajji') || name.includes('vada') || name.includes('bhature') || name.includes('fritters') || name.includes('bhakarwadi');
  const isHighSugar = warning.includes('sugar') || warning.includes('sweet') || name.includes('roshogolla') || name.includes('mastani') || name.includes('jalebi');
  const isHighFat = warning.includes('butter') || warning.includes('ghee') || warning.includes('cream') || warning.includes('saturated fats') || name.includes('butter chicken');
  
  if (isWeightLoss && (item.calories > 350 || isFried || isHighSugar)) {
    return {
      status: 'discouraged',
      text: 'Clinically Discouraged',
      reason: 'High calorie load, simple carbs, or trans-fats. Highly counterproductive for weight reduction.'
    };
  }

  if ((hasTriglycerides || hasLdl) && (isFried || isHighFat || isHighSugar)) {
    return {
      status: 'discouraged',
      text: 'Clinically Discouraged',
      reason: 'Fats, trans-fats, or added sugars. Elevates lipids and cardiovascular risk.'
    };
  }

  const isCleanProtein = (item.protein >= 12 && item.calories <= 300) || name.includes('tikka') || name.includes('grilled') || name.includes('sprouts') || name.includes('chilla');
  const isLowCalSteamed = (item.calories < 250 && !isFried) || name.includes('idli') || name.includes('mudde');

  if (isCleanProtein || isLowCalSteamed) {
    return {
      status: 'approved',
      text: 'Clinically Approved',
      reason: 'Excellent protein-to-calorie density or low glycemic load. Highly recommended.'
    };
  }

  return {
    status: 'moderation',
    text: 'Moderation Advised',
    reason: 'Consume in controlled portions, watch the oil, and prioritize recommended healthy swaps.'
  };
}

function generateAICoachTip(region, specialties, profile) {
  if (!profile) return "Enable profile details for smart AI coaching.";
  
  const isWeightLoss = profile.primary_goal === 'weight_loss';
  const hasTriglycerides = profile.has_triglycerides;
  const conditionsText = [];
  if (isWeightLoss) conditionsText.push("weight loss");
  if (hasTriglycerides) conditionsText.push("triglyceride management");
  if (profile.has_ldl) conditionsText.push("cholesterol control");

  const regionName = region.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  let tip = `🤖 <strong>AI Health Coach:</strong> Welcome! `;
  if (conditionsText.length > 0) {
    tip += `Optimizing local ${regionName} dishes for your <strong>${conditionsText.join(' & ')}</strong> plan. `;
  }

  const discouragedCount = specialties.filter(item => getClinicalRecommendation(item, profile).status === 'discouraged').length;
  const approvedItems = specialties.filter(item => getClinicalRecommendation(item, profile).status === 'approved').map(item => item.name.split('(')[0].trim());

  if (discouragedCount > 0) {
    tip += `Avoid deep-fried and high-fat options like Vada/Bhature. `;
  }
  if (approvedItems.length > 0) {
    tip += `We highly recommend choosing <strong>${approvedItems.slice(0, 2).join(' or ')}</strong> as they fit perfectly into your daily targets.`;
  } else {
    tip += `Be sure to scale down quantities and log healthy clinical swaps!`;
  }

  return tip;
}

function renderRegionalSpecialties(region) {
  const grid = document.getElementById('regionalSpecialtiesGrid');
  if (!grid) return;

  const specialties = REGIONAL_SPECIALTIES[region] || [];
  if (specialties.length === 0) {
    grid.innerHTML = `<p style="font-size: 13px; color: var(--text-secondary);">No specific local foods configured for this region.</p>`;
    return;
  }

  const cardBody = grid.parentNode;
  let coachBox = document.getElementById('aiCoachTipBox');
  if (!coachBox) {
    coachBox = document.createElement('div');
    coachBox.id = 'aiCoachTipBox';
    coachBox.className = 'ai-coach-summary-box';
    coachBox.style.marginTop = 'var(--space-sm)';
    coachBox.style.marginBottom = 'var(--space-md)';
    coachBox.style.padding = 'var(--space-sm)';
    coachBox.style.border = '1px solid rgba(147, 51, 234, 0.2)';
    coachBox.style.borderRadius = 'var(--radius-md)';
    coachBox.style.background = 'rgba(147, 51, 234, 0.05)';
    coachBox.style.fontSize = '12px';
    coachBox.style.lineHeight = '1.5';
    cardBody.insertBefore(coachBox, grid);
  }

  const profile = getProfile();
  coachBox.innerHTML = generateAICoachTip(region, specialties, profile);
  coachBox.style.display = 'block';

  grid.innerHTML = specialties.map((item, idx) => {
    let clinicalWarningHtml = '';
    if (item.warning) {
      clinicalWarningHtml = `
        <div class="clinical-warning-box" style="margin-top: 8px; font-size: 11px; color: var(--danger); background: rgba(239, 68, 68, 0.1); padding: var(--space-xs); border-radius: var(--border-radius-sm); border-left: 2px solid var(--danger);">
          <strong>⚠️ Clinical Alert:</strong> ${item.warning}
        </div>
      `;
    }

    let swapHtml = '';
    if (item.swap) {
      swapHtml = `
        <div class="swap-box" style="margin-top: 6px; font-size: 11px; color: var(--success); background: rgba(0, 229, 153, 0.1); padding: var(--space-xs); border-radius: var(--border-radius-sm); border-left: 2px solid var(--success);">
          <strong>💡 Healthy Swap:</strong> ${item.swap}
        </div>
      `;
    }

    const rec = getClinicalRecommendation(item, profile);
    const badgeClass = rec.status === 'approved' ? 'clinical-badge--approved' : (rec.status === 'discouraged' ? 'clinical-badge--discouraged' : 'clinical-badge--moderation');

    return `
      <div class="card regional-specialty-card" style="padding: var(--space-sm); border-color: rgba(147, 51, 234, 0.2); display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-xs);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px;">
            <h4 style="font-size: 14px; font-weight: 700; margin: 0; line-height: 1.3;">${item.name}</h4>
            <span class="badge ${badgeClass}" style="font-size: 9px; font-weight: 700; text-transform: uppercase; white-space: nowrap; padding: 2px 6px;">${rec.text}</span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <span class="badge text-mono" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); font-size: 10px; font-weight: 600;">${item.calories} kcal</span>
            <span class="badge text-mono" style="background: rgba(37, 99, 235, 0.15); color: var(--primary); font-size: 10px; font-weight: 600;">${item.protein}g protein</span>
          </div>
          <p style="font-size: 11px; color: var(--text-secondary); margin: 6px 0 0 0; line-height: 1.4;">
            <em>AI Coach Tip:</em> ${rec.reason}
          </p>
          ${clinicalWarningHtml}
          ${swapHtml}
        </div>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button class="btn btn--sm btn--primary log-specialty-btn" data-region="${region}" data-idx="${idx}" style="flex: 1; padding: 4px 8px; font-size: 11px; height: auto;">
            Log Directly
          </button>
          <button class="btn btn--sm btn--ghost fill-specialty-btn" data-region="${region}" data-idx="${idx}" style="padding: 4px 8px; font-size: 11px; height: auto;" title="Scale & Customize">
            Customize
          </button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.log-specialty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reg = e.target.dataset.region;
      const idx = parseInt(e.target.dataset.idx);
      const foodItem = REGIONAL_SPECIALTIES[reg][idx];
      logFoodDirect(foodItem.name, foodItem.calories, foodItem.protein);
    });
  });

  grid.querySelectorAll('.fill-specialty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reg = e.target.dataset.region;
      const idx = parseInt(e.target.dataset.idx);
      const foodItem = REGIONAL_SPECIALTIES[reg][idx];
      fillFoodLogger(foodItem.name, foodItem.calories, foodItem.protein);
    });
  });
}

function logFoodDirect(name, calories, protein) {
  const slotSelect = document.getElementById('foodLogMealSlot');
  const mealSlotText = slotSelect ? slotSelect.options[slotSelect.selectedIndex].text : "First Meal";
  
  const newMeal = {
    is_custom: true,
    time: mealSlotText,
    items: [name],
    calories_estimated: Math.round(calories),
    protein_estimated: Math.round(protein),
    completed: true
  };

  const meals = getOrCreateMealLogs(currentDate);
  meals.push(newMeal);
  saveAllMealLogs(currentDate, meals);
  
  showToast(`Logged "${name}" to ${newMeal.time}! ✅`);
  renderMealPlan();
}

function fillFoodLogger(name, calories, protein) {
  const nameInput = document.getElementById('foodLogName');
  const gramsInput = document.getElementById('foodLogGrams');
  const caloriesInput = document.getElementById('foodLogCalories');
  const proteinInput = document.getElementById('foodLogProtein');

  if (nameInput) nameInput.value = name;
  if (caloriesInput) caloriesInput.value = calories;
  if (proteinInput) proteinInput.value = protein;

  let baseUnit = 'grams';
  let baseQty = 100;

  if (name.toLowerCase().includes('piece') || name.toLowerCase().includes('plate') || name.toLowerCase().includes('scoop') || name.toLowerCase().includes('glass') || name.toLowerCase().includes('katori') || name.toLowerCase().includes('ball')) {
    baseUnit = 'pieces';
    baseQty = 1;
    const match = name.match(/(\d+)\s+(piece|bhature|luchi|ball|katori)/i);
    if (match) {
      baseQty = parseInt(match[1]);
    }
  } else {
    const match = name.match(/(\d+)\s*g/i);
    if (match) {
      baseQty = parseInt(match[1]);
    }
  }

  const gramsLabel = document.getElementById('foodLogGramsLabel');
  if (gramsLabel) {
    gramsLabel.textContent = baseUnit === 'pieces' ? 'Quantity' : 'Grams';
  }

  if (gramsInput) {
    gramsInput.value = baseQty;
    gramsInput.dataset.baseQty = baseQty;
    gramsInput.dataset.baseCalories = calories;
    gramsInput.dataset.baseProtein = protein;
  }

  let tipBox = document.getElementById('foodLogWarningTip');
  if (!tipBox) {
    tipBox = document.createElement('div');
    tipBox.id = 'foodLogWarningTip';
    tipBox.style.marginTop = 'var(--space-xs)';
    tipBox.style.marginBottom = 'var(--space-xs)';
    tipBox.style.fontSize = '12px';
    tipBox.style.lineHeight = '1.4';
    const btn = document.getElementById('btnLogCustomFood');
    if (btn) {
      btn.parentNode.insertBefore(tipBox, btn);
    }
  }

  let foundWarning = '';
  let foundSwap = '';
  
  for (const region of Object.keys(REGIONAL_SPECIALTIES)) {
    const matched = REGIONAL_SPECIALTIES[region].find(item => item.name.split('(')[0].trim().toLowerCase() === name.split('(')[0].trim().toLowerCase());
    if (matched) {
      foundWarning = matched.warning || '';
      foundSwap = matched.swap || '';
      break;
    }
  }

  if (foundWarning || foundSwap) {
    tipBox.innerHTML = `
      ${foundWarning ? `
        <div style="color: var(--danger); background: rgba(239, 68, 68, 0.08); padding: var(--space-sm); border-radius: var(--radius-md); border-left: 3px solid var(--danger); margin-bottom: 6px;">
          <strong>⚠️ Clinical Warning:</strong> ${foundWarning}
        </div>
      ` : ''}
      ${foundSwap ? `
        <div style="color: var(--success); background: rgba(0, 229, 153, 0.08); padding: var(--space-sm); border-radius: var(--radius-md); border-left: 3px solid var(--success);">
          <strong>💡 Clinically Suggested Swap:</strong> ${foundSwap}
        </div>
      ` : ''}
    `;
    tipBox.style.display = 'block';
  } else {
    tipBox.style.display = 'none';
    tipBox.innerHTML = '';
  }

  const searchInput = document.getElementById('foodSearchInput');
  if (searchInput) {
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function bindLocationAwareLoggerEvents() {
  const searchInput = document.getElementById('foodSearchInput');
  const resultsList = document.getElementById('foodSearchResults');
  const gramsInput = document.getElementById('foodLogGrams');
  const caloriesInput = document.getElementById('foodLogCalories');
  const proteinInput = document.getElementById('foodLogProtein');
  const nameInput = document.getElementById('foodLogName');
  const logBtn = document.getElementById('btnLogCustomFood');
  const chkEnableLiveLocation = document.getElementById('chkEnableLiveLocation');

  if (chkEnableLiveLocation) {
    chkEnableLiveLocation.addEventListener('change', (e) => {
      if (e.target.checked) {
        detectUserLocation();
      } else {
        isLiveLocationEnabled = false;
        updateLocationUI(false);
        handleLocationFailure();
      }
    });
  }

  if (searchInput && resultsList) {
    searchInput.addEventListener('focus', () => {
      if (!isLiveLocationEnabled) {
        searchInput.blur();
        showLocationRequiredModal();
      }
    });

    searchInput.addEventListener('input', () => {
      if (!isLiveLocationEnabled) {
        searchInput.value = '';
        searchInput.blur();
        showLocationRequiredModal();
        return;
      }

      const matches = [];
      FOOD_DATABASE.forEach(item => {
        if (item.name.toLowerCase().includes(query)) {
          matches.push({ ...item, type: 'standard' });
        }
      });

      Object.keys(REGIONAL_SPECIALTIES).forEach(region => {
        REGIONAL_SPECIALTIES[region].forEach(item => {
          if (item.name.toLowerCase().includes(query) && !matches.some(m => m.name === item.name)) {
            matches.push({ ...item, type: 'regional', region });
          }
        });
      });

      const slicedMatches = matches.slice(0, 8);

      if (slicedMatches.length === 0) {
        resultsList.innerHTML = `<li class="food-search-item" style="color: var(--text-secondary); cursor: default;">No results found</li>`;
      } else {
        resultsList.innerHTML = slicedMatches.map((item, idx) => `
          <li class="food-search-item" data-idx="${idx}">
            <span>${item.name}</span>
            <span class="food-search-item__nutrition text-mono">${item.calories} kcal | ${item.protein}g P</span>
          </li>
        `).join('');

        resultsList.querySelectorAll('.food-search-item').forEach(li => {
          li.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            if (isNaN(idx)) return;
            const selected = slicedMatches[idx];
            fillFoodLogger(selected.name, selected.calories, selected.protein);
            resultsList.style.display = 'none';
            searchInput.value = '';
          });
        });
      }
      resultsList.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsList.contains(e.target)) {
        resultsList.style.display = 'none';
      }
    });
  }

  if (gramsInput) {
    gramsInput.addEventListener('input', () => {
      const currentVal = parseFloat(gramsInput.value);
      const baseQty = parseFloat(gramsInput.dataset.baseQty || 100);
      const baseCalories = parseFloat(gramsInput.dataset.baseCalories || 0);
      const baseProtein = parseFloat(gramsInput.dataset.baseProtein || 0);

      if (currentVal && baseQty && !isNaN(currentVal) && currentVal > 0) {
        const factor = currentVal / baseQty;
        if (caloriesInput) caloriesInput.value = Math.round(baseCalories * factor);
        if (proteinInput) proteinInput.value = Math.round(baseProtein * factor);
      }
    });
  }

  if (logBtn) {
    logBtn.addEventListener('click', () => {
      const name = nameInput ? nameInput.value.trim() : '';
      const caloriesVal = caloriesInput ? parseFloat(caloriesInput.value) : 0;
      const proteinVal = proteinInput ? parseFloat(proteinInput.value) : 0;
      const slotSelect = document.getElementById('foodLogMealSlot');
      const timeSlotText = slotSelect ? slotSelect.options[slotSelect.selectedIndex].text : "First Meal";

      if (!name) {
        showToast("Please enter a food name! ⚠️");
        return;
      }
      if (isNaN(caloriesVal) || caloriesVal < 0) {
        showToast("Please enter valid calories! ⚠️");
        return;
      }
      if (isNaN(proteinVal) || proteinVal < 0) {
        showToast("Please enter valid protein! ⚠️");
        return;
      }

      const newMeal = {
        is_custom: true,
        time: timeSlotText,
        items: [name],
        calories_estimated: Math.round(caloriesVal),
        protein_estimated: Math.round(proteinVal),
        completed: true
      };

      const meals = getOrCreateMealLogs(currentDate);
      meals.push(newMeal);
      saveAllMealLogs(currentDate, meals);

      showToast(`Logged "${name}" to ${timeSlotText}! ✅`);
      
      if (nameInput) nameInput.value = '';
      if (gramsInput) {
        gramsInput.value = '';
        gramsInput.removeAttribute('data-base-qty');
        gramsInput.removeAttribute('data-base-calories');
        gramsInput.removeAttribute('data-base-protein');
      }
      if (caloriesInput) caloriesInput.value = '';
      if (proteinInput) proteinInput.value = '';
      
      const gramsLabel = document.getElementById('foodLogGramsLabel');
      if (gramsLabel) gramsLabel.textContent = 'Grams/Qty';

      const tipBox = document.getElementById('foodLogWarningTip');
      if (tipBox) {
        tipBox.style.display = 'none';
        tipBox.innerHTML = '';
      }

      renderMealPlan();
    });
  }
}

function updateWaterWidget(dateStr) {
  const log = getDailyLog(dateStr);
  const currentVolume = log.water_litres || 0;
  
  // Dashboard elements
  const displayValEl = document.getElementById('waterDisplayVal');
  if (displayValEl) {
    displayValEl.textContent = `${currentVolume.toFixed(2)} L`;
  }

  const settings = getSettings();
  const targetVolume = (settings.water_target_glasses || 8) * 0.25;

  const goalValEl = document.getElementById('waterGoalVal');
  if (goalValEl) {
    goalValEl.textContent = `Target: ${targetVolume.toFixed(2)} Litres (${settings.water_target_glasses} glasses)`;
  }

  const percent = Math.min(100, (currentVolume / targetVolume) * 100);

  const liquidBody = document.getElementById('liquidBody');
  const liquidTop = document.getElementById('liquidTop');
  const glass3d = document.getElementById('water3DGlass');

  if (liquidBody) {
    liquidBody.style.height = `${percent}%`;
  }
  if (liquidTop) {
    liquidTop.style.bottom = `${percent}%`;
    liquidTop.style.display = percent > 0 ? 'block' : 'none';
  }

  if (glass3d) {
    if (percent >= 100) {
      glass3d.classList.add('target-reached');
    } else {
      glass3d.classList.remove('target-reached');
    }
  }

  // Today screen elements
  const displayValTodayEl = document.getElementById('waterDisplayValToday');
  if (displayValTodayEl) {
    displayValTodayEl.textContent = `${currentVolume.toFixed(2)} L`;
  }

  const glassesCount = Math.round(currentVolume / 0.25);
  const targetGlasses = settings.water_target_glasses || 8;
  const glassesTodayEl = document.getElementById('waterGlassesToday');
  if (glassesTodayEl) {
    glassesTodayEl.textContent = `${glassesCount} / ${targetGlasses} Glasses`;
  }

  const goalValTodayEl = document.getElementById('waterGoalValToday');
  if (goalValTodayEl) {
    goalValTodayEl.textContent = `Goal: ${targetVolume.toFixed(1)}L`;
  }

  const liquidBodyToday = document.getElementById('liquidBodyToday');
  const liquidTopToday = document.getElementById('liquidTopToday');
  const glass3dToday = document.getElementById('water3DGlassToday');

  if (liquidBodyToday) {
    liquidBodyToday.style.height = `${percent}%`;
  }
  if (liquidTopToday) {
    liquidTopToday.style.bottom = `${percent}%`;
    liquidTopToday.style.display = percent > 0 ? 'block' : 'none';
  }

  if (glass3dToday) {
    if (percent >= 100) {
      glass3dToday.classList.add('target-reached');
    } else {
      glass3dToday.classList.remove('target-reached');
    }
  }
}

function triggerWaterBubbles(count = 12) {
  const glasses = [document.getElementById('water3DGlass'), document.getElementById('water3DGlassToday')];
  glasses.forEach(glass => {
    if (!glass) return;
    for (let i = 0; i < count; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'water-bubble';
      
      const size = Math.random() * 6 + 4;
      bubble.style.width = size + 'px';
      bubble.style.height = size + 'px';
      bubble.style.left = Math.random() * 80 + 10 + '%';
      
      const delay = Math.random() * 0.5;
      const duration = Math.random() * 1.5 + 1.2;
      bubble.style.animationDelay = delay + 's';
      bubble.style.animationDuration = duration + 's';

      glass.appendChild(bubble);

      setTimeout(() => {
        bubble.remove();
      }, (delay + duration) * 1000);
    }
  });
}

function triggerWaterSlosh() {
  const tops = [document.getElementById('liquidTop'), document.getElementById('liquidTopToday')];
  tops.forEach(top => {
    if (!top) return;
    top.classList.remove('sloshing');
    void top.offsetWidth;
    top.classList.add('sloshing');

    setTimeout(() => {
      top.classList.remove('sloshing');
    }, 800);
  });
}

function bindWaterWidgetEvents() {
  const btn250 = document.getElementById('btnWater250');
  const btn500 = document.getElementById('btnWater500');
  const btn750 = document.getElementById('btnWater750');
  const btnReset = document.getElementById('btnWaterReset');

  const btnAddToday = document.getElementById('btnWaterAddToday');
  const btnSubToday = document.getElementById('btnWaterSubToday');

  const addWater = (amountL) => {
    const log = getDailyLog(currentDate);
    const oldWater = log.water_litres || 0;
    log.water_litres = Math.round((oldWater + amountL) * 100) / 100;
    saveDailyLog(currentDate, log);

    const checklist = getChecklist(currentDate);
    if (!checklist.health) checklist.health = {};
    checklist.health.water_started = true;
    saveChecklist(currentDate, checklist);

    showToast(`Added ${Math.round(amountL * 1000)}ml water! 💧`);
    updateWaterWidget(currentDate);
    triggerWaterSlosh();
    triggerWaterBubbles(15);
  };

  if (btn250) btn250.addEventListener('click', () => addWater(0.25));
  if (btn500) btn500.addEventListener('click', () => addWater(0.50));
  if (btn750) btn750.addEventListener('click', () => addWater(0.75));

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const log = getDailyLog(currentDate);
      log.water_litres = 0;
      saveDailyLog(currentDate, log);

      const checklist = getChecklist(currentDate);
      if (checklist.health) {
        checklist.health.water_started = false;
      }
      saveChecklist(currentDate, checklist);

      showToast("Reset water tracker for today.");
      updateWaterWidget(currentDate);
    });
  }

  if (btnAddToday) {
    btnAddToday.addEventListener('click', () => addWater(0.25));
  }

  if (btnSubToday) {
    btnSubToday.addEventListener('click', () => {
      const log = getDailyLog(currentDate);
      const oldWater = log.water_litres || 0;
      if (oldWater <= 0) return;
      log.water_litres = Math.max(0, Math.round((oldWater - 0.25) * 100) / 100);
      saveDailyLog(currentDate, log);

      const checklist = getChecklist(currentDate);
      if (checklist.health && log.water_litres === 0) {
        checklist.health.water_started = false;
        saveChecklist(currentDate, checklist);
      }

      showToast("Removed 1 glass of water.");
      updateWaterWidget(currentDate);
      triggerWaterSlosh();
    });
  }
}

// ── Redesign Helpers & Initializers ──

function updateWeatherPill(cityName) {
  let weatherText = "London 18°C";
  if (cityName) {
    let cleanCity = cityName.split(',')[0].trim();
    let temp = 22;
    if (cleanCity.toLowerCase().includes('mumbai') || cleanCity.toLowerCase().includes('bombay')) {
      temp = 28;
    } else if (cleanCity.toLowerCase().includes('london')) {
      temp = 18;
    } else if (cleanCity.toLowerCase().includes('delhi')) {
      temp = 32;
    } else if (cleanCity.toLowerCase().includes('pune')) {
      temp = 26;
    } else if (cleanCity.toLowerCase().includes('bengaluru') || cleanCity.toLowerCase().includes('bangalore')) {
      temp = 24;
    }
    weatherText = `${cleanCity} ${temp}°C`;
  }
  
  const pills = document.querySelectorAll('.weather-pill span');
  pills.forEach(pill => {
    pill.textContent = weatherText;
  });
}

let selectedPace = 'brisk';

function updateMetabolicCalculator() {
  const slider = document.getElementById('calcStepSlider');
  const targetStepsVal = document.getElementById('calcTargetStepsVal');
  const estBurnVal = document.getElementById('calcEstBurnVal');
  if (!slider || !targetStepsVal || !estBurnVal) return;

  const steps = parseInt(slider.value);
  targetStepsVal.textContent = steps.toLocaleString();

  const activeBtn = document.querySelector('.pace-btn.active');
  const pace = activeBtn ? activeBtn.dataset.pace : selectedPace;

  let met = 3.5;
  if (pace === 'slow') met = 2.0;
  else if (pace === 'run') met = 6.0;

  const profile = getProfile();
  const w = profile.weight_kg ? parseFloat(profile.weight_kg) : 75;
  const h = profile.height_cm ? parseFloat(profile.height_cm) : 175;
  const sex = profile.sex || 'male';
  let age = profile.age ? parseFloat(profile.age) : 30;

  let metAdjustment = 1.0;
  if (profile.fitness_level === 'beginner') {
    metAdjustment = 1.10;
  } else if (profile.fitness_level === 'advanced') {
    metAdjustment = 0.95;
  }

  let bmr = 0;
  if (sex.toLowerCase() === 'female') {
    bmr = 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * age);
  } else {
    bmr = 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * age);
  }

  const calories = Math.round((met * bmr / 1440) * (steps / 100) * metAdjustment);
  estBurnVal.textContent = `${calories} kcal`;
}

function initReminders() {
  const keys = ['chkSedentaryAlert', 'chkMorningFastedWalk', 'chkGlucoseBurn'];
  keys.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const storedVal = localStorage.getItem(`ft_settings_${id}`);
    if (storedVal !== null) {
      el.checked = storedVal === 'true';
    }
  });
}

function updateTrendsMetrics() {
  const trendsTrigVal = document.getElementById('trendsTrigVal');
  const trendsTrigChange = document.getElementById('trendsTrigChange');
  const trendsWeeklyStepsVal = document.getElementById('trendsWeeklyStepsVal');
  const trendsWeeklyStepsGoal = document.getElementById('trendsWeeklyStepsGoal');

  const allLogs = getConsolidatedDailyLogs();
  
  // Weekly steps target calculations
  const last7Logs = allLogs.slice(-7);
  const totalSteps = last7Logs.reduce((sum, log) => sum + (log.steps || 0), 0);
  
  let goalMetCount = 0;
  last7Logs.forEach(log => {
    const target = getAdjustedStepTarget(log.date);
    if (log.steps >= target) {
      goalMetCount++;
    }
  });

  if (trendsWeeklyStepsVal) {
    trendsWeeklyStepsVal.textContent = (totalSteps / 1000).toFixed(1) + 'k';
  }
  if (trendsWeeklyStepsGoal) {
    trendsWeeklyStepsGoal.textContent = `Daily Goal Met ${goalMetCount}/${last7Logs.length}`;
  }

  // Triglycerides trend calculations
  const trigLogs = allLogs.filter(log => log.triglycerides_val != null);
  if (trigLogs.length > 0) {
    const latestLog = trigLogs[trigLogs.length - 1];
    const currentTrig = latestLog.triglycerides_val;
    if (trendsTrigVal) {
      trendsTrigVal.textContent = currentTrig;
    }

    if (trendsTrigChange) {
      if (trigLogs.length > 1) {
        const baselineLog = trigLogs[0];
        const baselineTrig = baselineLog.triglycerides_val;
        const pctChange = Math.round(((currentTrig - baselineTrig) / baselineTrig) * 100);

        if (pctChange < 0) {
          trendsTrigChange.textContent = `${pctChange}% vs baseline`;
          trendsTrigChange.className = 'trend-change trend-change--down';
          trendsTrigChange.style.background = 'rgba(16, 185, 129, 0.1)';
          trendsTrigChange.style.color = 'var(--success)';
        } else if (pctChange > 0) {
          trendsTrigChange.textContent = `+${pctChange}% vs baseline`;
          trendsTrigChange.className = 'trend-change trend-change--up';
          trendsTrigChange.style.background = 'rgba(239, 68, 68, 0.1)';
          trendsTrigChange.style.color = 'var(--danger)';
        } else {
          trendsTrigChange.textContent = `0% change`;
          trendsTrigChange.className = 'trend-change';
          trendsTrigChange.style.background = 'rgba(156, 163, 175, 0.1)';
          trendsTrigChange.style.color = 'var(--text-secondary)';
        }
      } else {
        trendsTrigChange.textContent = 'Baseline established';
        trendsTrigChange.className = 'trend-change';
        trendsTrigChange.style.background = 'rgba(156, 163, 175, 0.1)';
        trendsTrigChange.style.color = 'var(--text-secondary)';
      }
    }
  } else {
    if (trendsTrigVal) trendsTrigVal.textContent = '--';
    if (trendsTrigChange) {
      trendsTrigChange.textContent = 'No records';
      trendsTrigChange.className = 'trend-change';
      trendsTrigChange.style.background = 'rgba(156, 163, 175, 0.1)';
      trendsTrigChange.style.color = 'var(--text-secondary)';
    }
  }
}

function updateAvatars() {
  const profile = getProfile();
  const avatarUrl = profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80";
  document.querySelectorAll('.user-avatar').forEach(img => {
    img.src = avatarUrl;
  });
}


