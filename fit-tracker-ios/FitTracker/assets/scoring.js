// ============================================================================
// scoring.js — FitTriglyceride Tracker Scoring & Adjustment Engine (ES Module)
// PRD Sections 14, 15, 16, 17
// ============================================================================

import {
  CHECKLIST_TEMPLATE,
  getChecklist,
  getAllDailyLogs,
  getProfile,
  getDailyLog,
  getMealLogs,
  getWorkoutLog,
  getDaysBetween,
  getProgramDay,
  getDateStr,
  getDayName,
  getSettings
} from './data.js';

// ---------------------------------------------------------------------------
// 1. Daily Score Calculator (PRD Section 14)
// ---------------------------------------------------------------------------

export function calculateDailyScore(dateStr) {
  const checklist = getChecklist(dateStr);
  let score = 0;
  const maxScore = 100;
  const breakdown = {};

  for (const [category, items] of Object.entries(CHECKLIST_TEMPLATE)) {
    let categoryScore = 0;
    for (const item of items) {
      if (checklist[category] && checklist[category][item.key]) {
        categoryScore += item.points;
        score += item.points;
      }
    }
    breakdown[category] = categoryScore;
  }

  let interpretation;
  if (score >= 85)      interpretation = 'excellent';
  else if (score >= 70) interpretation = 'good';
  else if (score >= 55) interpretation = 'needs_correction';
  else                  interpretation = 'high_risk';

  return { score, maxScore, breakdown, interpretation };
}

// ---------------------------------------------------------------------------
// 2. Weekly Evaluation (PRD Section 15)
// ---------------------------------------------------------------------------

export function calculateWeeklyReview(weekStartDate) {
  // weekStartDate is a YYYY-MM-DD string for the Monday of the week
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate + 'T00:00:00');
    d.setDate(d.getDate() + i);
    days.push(getDateStr(d));
  }

  let totalWeight = 0, weightCount = 0;
  let totalSteps = 0, stepsCount = 0;
  let totalSleep = 0, sleepCount = 0;
  let workoutsCompleted = 0;
  let officeWalksCompleted = 0;
  let proteinDaysAbove90 = 0;
  let cleanFoodDays = 0;
  let dinnerComplianceDays = 0;
  let totalDailyScore = 0;
  let latestWaist = null;

  for (const dateStr of days) {
    const log = getDailyLog(dateStr);
    const checklist = getChecklist(dateStr);
    const scoreResult = calculateDailyScore(dateStr);

    if (log.weight_kg) { totalWeight += log.weight_kg; weightCount++; }
    if (log.waist_in)  latestWaist = log.waist_in;
    if (log.steps)  { totalSteps += log.steps; stepsCount++; }
    if (log.sleep_hours) { totalSleep += log.sleep_hours; sleepCount++; }

    if (checklist.movement && checklist.movement.morning_workout) workoutsCompleted++;
    if (checklist.movement && checklist.movement.office_walk) officeWalksCompleted++;

    // Protein compliance — sum protein from meal logs
    const meals = getMealLogs(dateStr);
    const dailyProtein = meals.reduce((sum, m) => sum + (m.protein_estimated || 0), 0);
    if (dailyProtein >= 90) proteinDaysAbove90++;

    // Clean food = no biscuits AND no sweets AND no namkeen
    if (checklist.food &&
        checklist.food.no_biscuits &&
        checklist.food.no_sweets &&
        checklist.food.no_namkeen) {
      cleanFoodDays++;
    }

    // Dinner compliance
    if (checklist.food && checklist.food.dinner_rule) dinnerComplianceDays++;

    totalDailyScore += scoreResult.score;
  }

  const avgWeight    = weightCount > 0 ? +(totalWeight / weightCount).toFixed(1) : null;
  const avgSteps     = stepsCount > 0  ? Math.round(totalSteps / stepsCount) : 0;
  const avgSleep     = sleepCount > 0  ? +(totalSleep / sleepCount).toFixed(1) : null;
  const avgDailyScore = +(totalDailyScore / 7).toFixed(1);

  // Weight change from previous week
  const prevWeekStart = new Date(weekStartDate + 'T00:00:00');
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekStartStr = getDateStr(prevWeekStart);

  let prevTotalWeight = 0, prevWeightCount = 0;
  for (let i = 0; i < 7; i++) {
    const pd = new Date(prevWeekStart);
    pd.setDate(pd.getDate() + i);
    const pLog = getDailyLog(getDateStr(pd));
    if (pLog.weight_kg) { prevTotalWeight += pLog.weight_kg; prevWeightCount++; }
  }
  const prevAvgWeight = prevWeightCount > 0 ? +(prevTotalWeight / prevWeightCount).toFixed(1) : null;
  const weightChange  = (avgWeight !== null && prevAvgWeight !== null)
    ? +(avgWeight - prevAvgWeight).toFixed(1)
    : null;

  // Wins (top 3) & problems (bottom 3) by score
  const metrics = [
    { name: 'Protein compliance',    value: Math.round((proteinDaysAbove90 / 7) * 100) + '%', score: proteinDaysAbove90 / 7 },
    { name: 'Clean food compliance',  value: Math.round((cleanFoodDays / 7) * 100) + '%',     score: cleanFoodDays / 7 },
    { name: 'Dinner compliance',      value: Math.round((dinnerComplianceDays / 7) * 100) + '%', score: dinnerComplianceDays / 7 },
    { name: 'Workout completion',     value: `${workoutsCompleted}/7`,                        score: workoutsCompleted / 7 },
    { name: 'Step target',            value: avgSteps + ' avg',                               score: avgSteps >= 8000 ? 1 : avgSteps / 8000 },
    { name: 'Average daily score',    value: avgDailyScore + '/100',                          score: avgDailyScore / 100 }
  ];
  metrics.sort((a, b) => b.score - a.score);
  const wins     = metrics.slice(0, 3).map(m => `${m.name}: ${m.value}`);
  const problems = metrics.slice(-3).reverse().map(m => `${m.name}: ${m.value}`);

  return {
    week_start: weekStartDate,
    days,
    avg_weight: avgWeight,
    weight_change: weightChange,
    waist: latestWaist,
    avg_steps: avgSteps,
    avg_sleep: avgSleep,
    workouts_completed: workoutsCompleted,
    office_walks_completed: officeWalksCompleted,
    protein_compliance_percent: Math.round((proteinDaysAbove90 / 7) * 100),
    clean_food_compliance_percent: Math.round((cleanFoodDays / 7) * 100),
    dinner_compliance_percent: Math.round((dinnerComplianceDays / 7) * 100),
    avg_daily_score: avgDailyScore,
    wins,
    problems
  };
}

// ---------------------------------------------------------------------------
// 3. 30-Day Evaluation (PRD Section 15)
// ---------------------------------------------------------------------------

export function calculate30DayReview(startDate) {
  const endDate = new Date(startDate + 'T00:00:00');
  endDate.setDate(endDate.getDate() + 29);
  const endDateStr = getDateStr(endDate);

  const profile = getProfile();

  let firstWeights = [], lastWeights = [];
  let totalSteps = 0, stepsCount = 0;
  let workoutDays = 0;
  let proteinDays = 0;
  let cleanDays = 0;
  let totalDays = 0;

  for (let i = 0; i < 30; i++) {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const dateStr = getDateStr(d);
    totalDays++;

    const log = getDailyLog(dateStr);
    const checklist = getChecklist(dateStr);

    if (log.weight_kg) {
      if (i < 7)   firstWeights.push(log.weight_kg);
      if (i >= 23) lastWeights.push(log.weight_kg);
    }
    if (log.steps) { totalSteps += log.steps; stepsCount++; }
    if (checklist.movement && checklist.movement.morning_workout) workoutDays++;

    // Protein compliance
    const meals = getMealLogs(dateStr);
    const dailyProtein = meals.reduce((sum, m) => sum + (m.protein_estimated || 0), 0);
    if (dailyProtein >= 90) proteinDays++;

    // Clean food compliance
    if (checklist.food &&
        checklist.food.no_biscuits &&
        checklist.food.no_sweets &&
        checklist.food.no_namkeen) {
      cleanDays++;
    }
  }

  const avgFirstWeek = firstWeights.length > 0
    ? firstWeights.reduce((a, b) => a + b, 0) / firstWeights.length
    : null;
  const avgLastWeek = lastWeights.length > 0
    ? lastWeights.reduce((a, b) => a + b, 0) / lastWeights.length
    : null;
  const weightLoss = (avgFirstWeek !== null && avgLastWeek !== null)
    ? +(avgFirstWeek - avgLastWeek).toFixed(1)
    : null;

  const avgSteps          = stepsCount > 0 ? Math.round(totalSteps / stepsCount) : 0;
  const proteinCompliance = totalDays > 0 ? Math.round((proteinDays / totalDays) * 100) : 0;
  const cleanCompliance   = totalDays > 0 ? Math.round((cleanDays / totalDays) * 100) : 0;

  // PRD targets
  const targets = {
    weight_loss:           { expected: '3-4 kg',  actual: weightLoss,                pass: weightLoss !== null && weightLoss >= 2 },
    waist_loss:            { expected: '1-1.5 inch', actual: null,                   pass: null },  // Requires start/end waist comparison
    protein_compliance:    { expected: '80%+',    actual: proteinCompliance + '%',    pass: proteinCompliance >= 80 },
    workout_sessions:      { expected: '12+',     actual: workoutDays,                pass: workoutDays >= 12 },
    avg_steps:             { expected: '7500+',   actual: avgSteps,                   pass: avgSteps >= 7500 },
    clean_snack_compliance:{ expected: '80%+',    actual: cleanCompliance + '%',      pass: cleanCompliance >= 80 }
  };

  const passCount   = Object.values(targets).filter(t => t.pass === true).length;
  const totalTargets = Object.values(targets).filter(t => t.pass !== null).length;
  let overallStatus;
  if (totalTargets === 0)                  overallStatus = 'no_data';
  else if (passCount === totalTargets)     overallStatus = 'on_track';
  else if (passCount >= totalTargets * 0.6) overallStatus = 'needs_attention';
  else                                     overallStatus = 'off_track';

  return {
    start_date: startDate,
    end_date: endDateStr,
    total_days: totalDays,
    weight_loss: weightLoss,
    avg_steps: avgSteps,
    workout_days: workoutDays,
    protein_compliance: proteinCompliance,
    clean_compliance: cleanCompliance,
    targets,
    overall_status: overallStatus
  };
}

// ---------------------------------------------------------------------------
// 4. Adjustment Engine — All 7 Scenarios (PRD Section 16)
// ---------------------------------------------------------------------------

export function generateRecommendations(reviewData, reviewType = 'weekly') {
  const recommendations = [];
  const profile = getProfile();

  // Scenario 1: Weight loss below 2 kg after 30 days
  if (reviewType === 'monthly' &&
      reviewData.weight_loss !== null &&
      reviewData.weight_loss < 2) {
    recommendations.push({
      scenario: 'weight_stall',
      severity: 'warning',
      title: 'Weight Loss Below Target',
      recommendations: [
        'Reduce dinner portion by 20% — use a smaller plate',
        'Add 10 extra minutes to morning walk/workout',
        'Eliminate any hidden sugar sources (chai sugar, juice)',
        'Increase water intake to 10 glasses/day',
        'Consider replacing one chapati at dinner with extra salad',
        'Track everything — hidden bites add up'
      ]
    });
  }

  // Scenario 2: Waist not reducing after 30 days
  if (reviewType === 'monthly' &&
      reviewData.targets &&
      reviewData.targets.waist_loss &&
      reviewData.targets.waist_loss.pass === false) {
    recommendations.push({
      scenario: 'waist_stall',
      severity: 'warning',
      title: 'Waist Measurement Not Reducing',
      recommendations: [
        'Focus on core exercises — add 2 extra plank sets daily',
        'Strictly follow dinner rule: no chapati + rice together',
        'Reduce rice portions to half on rice days',
        'Increase post-meal walking to 20 minutes each',
        'Check for bloating triggers — reduce dal portions if gassy',
        'Ensure 7+ hours sleep — cortisol increases belly fat'
      ]
    });
  }

  // Scenario 3: Protein below 80g/day for 5+ days in a week
  if (reviewType === 'weekly' &&
      reviewData.protein_compliance_percent !== undefined &&
      reviewData.protein_compliance_percent < 30) {
    recommendations.push({
      scenario: 'low_protein',
      severity: 'critical',
      title: 'Protein Intake Critically Low',
      recommendations: [
        'Add 2 boiled eggs (on non-veg days) or a whey protein shake daily',
        'Include 1 katori dal/chana in both lunch and dinner',
        'Add a whey protein shake on workout days',
        'Keep roasted chana (30g) as desk snack — 7g protein per serving',
        'Replace regular curd with Greek yogurt for 2x protein',
        'Target: minimum 25g protein per meal, 4 meals = 100g'
      ]
    });
  }

  // Scenario 4: Steps below target for 4+ days in a week
  if (reviewType === 'weekly' &&
      reviewData.avg_steps !== undefined &&
      reviewData.avg_steps < 6000) {
    recommendations.push({
      scenario: 'low_steps',
      severity: 'warning',
      title: 'Step Count Below Target',
      recommendations: [
        'Set hourly reminders to walk 500 steps during office hours',
        'Take phone calls while walking',
        'Add a 15-minute post-dinner walk (non-negotiable)',
        'Use stairs instead of elevator for at least 2 floors',
        'Park farther from office entrance',
        'Weekend target: one 30-minute outdoor walk'
      ]
    });
  }

  // Scenario 5: Triglyceride risk — sweets/biscuits > 2 times/week
  if (reviewType === 'weekly' &&
      reviewData.clean_food_compliance_percent !== undefined &&
      reviewData.clean_food_compliance_percent < 72) {
    recommendations.push({
      scenario: 'triglyceride_risk',
      severity: 'critical',
      title: 'Triglyceride Risk — Too Many Sweet/Processed Snacks',
      recommendations: [
        `ALERT: With triglycerides at ${profile.triglycerides_value || 275}, sugar and processed snacks directly spike levels`,
        'Replace biscuits with roasted makhana or chana immediately',
        'Zero sweets policy for next 2 weeks — no exceptions',
        'No packaged namkeen — make home-roasted alternatives',
        'Avoid fruit juices — eat whole fruits instead',
        'Read labels: avoid anything with added sugar or maida'
      ]
    });
  }

  // Scenario 6: Energy low for 3+ days
  if (reviewType === 'weekly' && reviewData.days) {
    let lowEnergyDays = 0;
    for (const dateStr of reviewData.days) {
      const log = getDailyLog(dateStr);
      if (log.energy_level && log.energy_level <= 2) lowEnergyDays++;
    }
    if (lowEnergyDays >= 3) {
      recommendations.push({
        scenario: 'low_energy',
        severity: 'info',
        title: 'Persistent Low Energy Detected',
        recommendations: [
          'Check sleep quality — aim for 7-8 hours consistently',
          'Ensure adequate iron intake — include spinach, jaggery in diet',
          `Check if thyroid levels need reassessment (TSH was ${profile.tsh_value || 6.5})`,
          'Stay hydrated — dehydration causes fatigue',
          'Consider B12 and Vitamin D levels check',
          'If persistent for 2+ weeks, consult doctor'
        ]
      });
    }
  }

  // Scenario 7: Poor sleep (avg < 6.5 hours)
  if (reviewType === 'weekly' &&
      reviewData.avg_sleep !== null &&
      reviewData.avg_sleep !== undefined &&
      reviewData.avg_sleep < 6.5) {
    recommendations.push({
      scenario: 'poor_sleep',
      severity: 'warning',
      title: 'Sleep Duration Below Recommended',
      recommendations: [
        'Set a firm "screens off" time 30 minutes before bed',
        'Avoid tea/coffee after 4 PM',
        'Dinner by 9:00 PM — avoid eating right before sleeping',
        'Create a wind-down routine: light reading, stretching',
        'Poor sleep increases cortisol → belly fat storage → weight stall',
        'Target: 12:15 AM sleep, 8:00 AM wake = 7.75 hours'
      ]
    });
  }

  // 20+ Year Veteran Coach: Lifestyle & Habit Insights
  if (profile.smoking_status === 'smoker' || profile.drinking_status === 'alcoholic' || profile.drinking_status === 'occasional') {
    const habitsList = [];
    if (profile.smoking_status === 'smoker') {
      habitsList.push('Smoking reduces lung capacity and oxygen delivery during home workouts/cardio.');
      habitsList.push('Try to delay smoking for at least 1 hour post-workout to allow cardiovascular recovery.');
    }
    if (profile.drinking_status === 'alcoholic' || profile.drinking_status === 'occasional') {
      habitsList.push('Alcohol contains empty calories and slows down fat oxidation (fat burning) in the liver.');
      habitsList.push('Limit alcohol intake to speed up weight loss, and always drink 2 glasses of water per drink to stay hydrated.');
    }
    recommendations.push({
      scenario: 'lifestyle_habits',
      severity: 'info',
      title: 'Lifestyle & Habit Insights (Veteran Coach)',
      recommendations: habitsList
    });
  }

  // 20+ Year Veteran Coach: Medical conditions coaching
  if (profile.has_medical_conditions && profile.medical_conditions) {
    const medList = [];
    const cond = profile.medical_conditions.toLowerCase();
    if (cond.includes('thyroid')) {
      medList.push('For Thyroid: Take medication on an empty stomach at 8:00 AM. Wait 30-45 mins before breakfast.');
      medList.push('Morning workouts and walks are crucial to stimulate low basal metabolic rates.');
    }
    if (cond.includes('diabetes')) {
      medList.push('For Diabetes: A 10-minute walk *immediately* after major meals is highly effective for clearing glucose.');
      medList.push('Focus on low-glycemic foods (vegetables, oats, lentils) and monitor blood sugar levels regularly.');
    }
    if (cond.includes('triglycerides') || cond.includes('cholesterol') || cond.includes('hypertension')) {
      medList.push('For Cardiovascular/Lipid Health: Avoid simple refined sugars and trans fats (packaged snacks).');
      medList.push('Include healthy fats like almonds or walnuts in moderation, and stick to post-dinner walks.');
    }
    if (medList.length > 0) {
      recommendations.push({
        scenario: 'medical_conditions_coaching',
        severity: 'warning',
        title: 'Clinical Coaching & Meds Adherence',
        recommendations: medList
      });
    }
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// 5. Recommendation Message Templates (PRD Section 17)
// ---------------------------------------------------------------------------

export function getWeeklyMessage(reviewData) {
  if (!reviewData) return '';
  const profile = getProfile();
  const userName = profile.name || 'User';

  if (reviewData.avg_daily_score >= 75) {
    return (
      `Great week, ${userName}! 💪 Your average score was ${reviewData.avg_daily_score}/100. ` +
      `You completed ${reviewData.workouts_completed} workouts and averaged ${reviewData.avg_steps} steps/day. ` +
      (reviewData.weight_change !== null && reviewData.weight_change < 0
        ? `You lost ${Math.abs(reviewData.weight_change)} kg this week — keep going!`
        : 'Stay consistent with your routine and the results will follow.') +
      `\n\nTop wins: ${reviewData.wins ? reviewData.wins.join(', ') : 'N/A'}` +
      `\nAreas to improve: ${reviewData.problems ? reviewData.problems.join(', ') : 'N/A'}`
    );
  } else {
    return (
      `Week check-in, ${userName}. Your average score was ${reviewData.avg_daily_score}/100 — ` +
      `there's room for improvement. ` +
      `You completed ${reviewData.workouts_completed} workouts and averaged ${reviewData.avg_steps} steps/day. ` +
      `\n\nFocus areas this week: ${reviewData.problems ? reviewData.problems.join(', ') : 'N/A'}` +
      `\n\nRemember: consistency beats perfection. Even small improvements compound over 12 weeks. ` +
      `Pick ONE area to improve this week and commit to it.`
    );
  }
}

export function get30DayMessage(reviewData) {
  if (!reviewData) return '';
  const profile = getProfile();
  const userName = profile.name || 'User';

  if (reviewData.overall_status === 'on_track') {
    return (
      `🎉 30-Day Milestone! You're on track, ${userName}! ` +
      (reviewData.weight_loss !== null ? `You've lost ${reviewData.weight_loss} kg so far. ` : '') +
      `Protein compliance: ${reviewData.protein_compliance}%, Workouts: ${reviewData.workout_days} sessions. ` +
      `Keep this momentum — you're building a sustainable lifestyle change.`
    );
  } else if (reviewData.overall_status === 'needs_attention') {
    return (
      `📊 30-Day Review: Some targets need attention, ${userName}. ` +
      (reviewData.weight_loss !== null ? `Weight change: ${reviewData.weight_loss} kg. ` : '') +
      `You're making progress but some areas are falling behind. ` +
      `Review the recommendations below and pick 2 changes to implement this week. ` +
      (profile.triglycerides_value
        ? `Remember: your triglyceride level (${profile.triglycerides_value}) makes clean eating especially important.`
        : '')
    );
  } else {
    return (
      `⚠️ 30-Day Plateau Alert: Results are below expectations, ${userName}. ` +
      (reviewData.weight_loss !== null ? `Weight change: only ${reviewData.weight_loss} kg (target was 3-4 kg). ` : '') +
      `This is a critical adjustment point. Please review the recommendations carefully. ` +
      `Consider: Are you tracking everything accurately? Are there hidden calories sneaking in? ` +
      (profile.medical_conditions
        ? `A doctor consultation may be helpful to check your medical status and medications.`
        : `A doctor consultation may be helpful to check thyroid levels and lipid profile.`)
    );
  }
}


export const MEDICAL_SAFETY_MESSAGE =
  'This app does not adjust thyroid medication or diagnose lipid disorders. ' +
  'Please consult your doctor for TSH, lipid profile, HbA1c, and medication decisions.';

// ---------------------------------------------------------------------------
// 6. Streak Calculator
// ---------------------------------------------------------------------------

export function calculateStreak(type) {
  const today = new Date();
  let current = 0;
  let best = 0;
  let counting = true;     // still counting consecutive from today
  let tempStreak = 0;

  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr   = getDateStr(d);
    const checklist = getChecklist(dateStr);
    const log       = getDailyLog(dateStr);

    let conditionMet = false;

    switch (type) {
      case 'clean_food':
        conditionMet = !!(
          checklist.food &&
          checklist.food.no_biscuits &&
          checklist.food.no_sweets &&
          checklist.food.no_namkeen
        );
        break;
      case 'workout':
        conditionMet = !!(checklist.movement && checklist.movement.morning_workout);
        break;
      case 'steps':
        conditionMet = log.steps >= (getSettings().step_target || 8000);
        break;
      default:
        conditionMet = false;
    }

    if (conditionMet) {
      tempStreak++;
      if (counting) current = tempStreak;
    } else {
      counting = false;
      best = Math.max(best, tempStreak);
      tempStreak = 0;
    }
  }
  best = Math.max(best, tempStreak, current);

  return { current, best };
}

// ---------------------------------------------------------------------------
// 7. Protein Tracker
// ---------------------------------------------------------------------------

export function calculateDailyProtein(dateStr) {
  const meals    = getMealLogs(dateStr);
  const settings = getSettings();
  const target   = settings.protein_target_g || 100;

  let total = 0;
  const mealBreakdown = [];

  for (const meal of meals) {
    const protein = meal.protein_estimated || 0;
    total += protein;
    mealBreakdown.push({ name: meal.label || meal.time, protein });
  }

  return {
    total,
    target,
    meals: mealBreakdown,
    met_target: total >= target
  };
}

// ---------------------------------------------------------------------------
// 8. Goal Trajectory
// ---------------------------------------------------------------------------

export function calculateGoalTrajectory() {
  const profile      = getProfile();
  const startWeight  = profile.start_weight_kg;
  const targetWeight = profile.target_weight_kg;
  
  if (!startWeight || !targetWeight) {
    return [];
  }
  
  const totalWeeks   = 12;
  const weeklyLoss   = (startWeight - targetWeight) / totalWeeks;

  const trajectory = [];
  const allLogs    = getAllDailyLogs();

  for (let week = 0; week <= totalWeeks; week++) {
    const expectedWeight = +(startWeight - weeklyLoss * week).toFixed(1);

    // Actual weight for this week (average of 7 days)
    let actualWeight = null;
    const weekStart  = new Date(profile.program_start_date + 'T00:00:00');
    weekStart.setDate(weekStart.getDate() + week * 7);

    let weekTotalWeight = 0, weekWeightCount = 0;
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + d);
      const dateStr = getDateStr(dayDate);
      const log     = allLogs[dateStr];
      if (log && log.weight_kg) {
        weekTotalWeight += log.weight_kg;
        weekWeightCount++;
      }
    }
    if (weekWeightCount > 0) {
      actualWeight = +(weekTotalWeight / weekWeightCount).toFixed(1);
    }

    trajectory.push({
      week,
      expected_weight: expectedWeight,
      actual_weight: actualWeight
    });
  }

  return trajectory;
}

// ---------------------------------------------------------------------------
// 9. Consolidated Daily Logs for charts
// ---------------------------------------------------------------------------

export function getConsolidatedDailyLogs() {
  const allLogs = getAllDailyLogs(); // gets { date: log, ... }
  const dates = Object.keys(allLogs).sort();

  return dates.map(dateStr => {
    const log = allLogs[dateStr];
    const checklist = getChecklist(dateStr);
    const scoreResult = calculateDailyScore(dateStr);
    const meals = getMealLogs(dateStr);
    const protein_g = meals.reduce((sum, m) => sum + (m.protein_estimated || 0), 0);
    const workoutLog = getWorkoutLog(dateStr);

    return {
      ...log,
      score: scoreResult.score,
      protein_g: protein_g,
      workout_completed: workoutLog ? workoutLog.completed : false,
      workout_type: workoutLog ? workoutLog.type : '',
      no_biscuits: checklist.food?.no_biscuits ?? false,
      no_sweets: checklist.food?.no_sweets ?? false,
      no_namkeen: checklist.food?.no_namkeen ?? false
    };
  });
}
