// ============================================================================
// data.js — FitTriglyceride Tracker Data Layer (ES Module)
// All static data + localStorage CRUD operations + Clinical Personalization
// ============================================================================

// ---------------------------------------------------------------------------
// 1. User Profile Defaults (Clinical Intake Assessment Mapping)
// ---------------------------------------------------------------------------
export const DEFAULT_PROFILE = {
  name: '',
  age: null,
  sex: 'male',
  fitness_level: 'beginner',
  height_cm: null,
  start_weight_kg: null,
  target_weight_kg: null,
  start_waist_in: null,
  target_waist_in: null,
  program_start_date: new Date().toISOString().split('T')[0],
  custom_location: 'Pune',
  use_live_location: false,
  
  // Goals
  primary_goal: 'weight_loss',
  meals_per_day: 4,
  target_timeline_value: 3,
  target_timeline_unit: 'months',
  
  // Dietary Preferences
  diet_type: 'non_veg', // veg, eggitarian, non_veg, vegan
  non_veg_frequency: 'rarely', // rarely, 1_2_weekly, 3_4_weekly, daily
  restricted_non_veg_days: [],
  eat_egg: false, 
  diet_region: 'standard', // standard, north_indian, south_indian, east_indian, west_indian, western
  gluten_free: false,
  lactose_free: false, // dairy sensitivity

  // Clinical / Pathology History Checkboxes
  has_medical_conditions: false,
  has_triglycerides: false,
  has_ldl: false,
  has_heart_blockage: false, // CAD / stent / heart attack history
  has_hypertension: false,
  has_diabetes: false,
  has_thyroid: false,
  thyroid_type: 'none', // hypothyroidism, hyperthyroidism, none
  thyroid_medicine: '',
  thyroid_dose: '',
  tsh_value: null,
  triglycerides_value: null,
  medications: '',
  medical_conditions: '', // legacy string sync
  agreed_to_terms: false,
  agreed_to_terms_timestamp: '',

  // Musculoskeletal Joint Screening
  has_joint_pain: false,
  joint_pain_locations: [], // knee, back, shoulder, neck

  // Lifestyle stress & habits
  lifestyle: '', // legacy string sync
  work_activity: 'sedentary', // sedentary, moderate, active
  sleep_category: 'optimal', // deprived, optimal, extended
  stress_level: 'moderate', // low, moderate, high
  commute_details: '',
  smoking_status: 'non_smoker',
  drinking_status: 'non_drinking',
  
  // Customizable Daily Routine Timings & Actions
  wake_time: '08:00',
  exercise_time: '08:10',
  exercise_action: 'Morning strength workout or bodyweight routine (30 min)',
  breakfast_time: '10:30',
  breakfast_action: 'First meal — fruit + protein breakfast',
  lunch_time: '13:00',
  lunch_action: 'Lunch — healthy protein-focused meal + curd (or tofu if dairy sensitive)',
  lunch_walk_time: '13:15',
  snack_time: '16:30',
  snack_action: 'Evening snack — roasted chana / almonds / green tea',
  dinner_time: '21:00',
  dinner_action: 'Light dinner following dinner rule (protein + salad)',
  dinner_walk_time: '21:45',
  sleep_time: '00:15',
  
  onboarding_completed: false
};

export const MOCK_PROFILE = {
  name: 'Amit',
  age: 46,
  sex: 'male',
  fitness_level: 'beginner',
  height_cm: 178,
  start_weight_kg: 90,
  target_weight_kg: 81,
  start_waist_in: 38,
  target_waist_in: 34.5,
  program_start_date: new Date().toISOString().split('T')[0],
  
  // Goals
  primary_goal: 'weight_loss',
  meals_per_day: 4,
  target_timeline_value: 3,
  target_timeline_unit: 'months',
  
  // Dietary Preferences
  diet_type: 'non_veg',
  non_veg_frequency: '3_4_weekly',
  restricted_non_veg_days: ['monday'],
  eat_egg: true,
  diet_region: 'standard',
  gluten_free: false,
  lactose_free: false,

  // Clinical / Pathology History Checkboxes
  has_medical_conditions: true,
  has_triglycerides: true,
  has_ldl: false,
  has_heart_blockage: false,
  has_hypertension: false,
  has_diabetes: false,
  has_thyroid: true,
  thyroid_type: 'hypothyroidism',
  thyroid_medicine: 'Levothyroxine',
  thyroid_dose: '62.5 mcg',
  tsh_value: 6.5,
  triglycerides_value: 275,
  medications: 'Levothyroxine 62.5 mcg',
  medical_conditions: 'Thyroid, High Triglycerides',

  // Musculoskeletal Joint Screening
  has_joint_pain: false,
  joint_pain_locations: [],

  // Lifestyle stress & habits
  lifestyle: 'Sitting IT job',
  work_activity: 'sedentary',
  sleep_category: 'optimal',
  stress_level: 'moderate',
  commute_details: 'Cab, around 1 hour',
  smoking_status: 'non_smoker',
  drinking_status: 'occasional',
  
  // Customizable Daily Routine Timings & Actions
  wake_time: '08:00',
  exercise_time: '08:10',
  exercise_action: 'Morning strength workout or bodyweight routine (30 min)',
  breakfast_time: '10:30',
  breakfast_action: 'First meal — fruit + protein breakfast',
  lunch_time: '13:00',
  lunch_action: 'Lunch — healthy protein-focused meal + curd (or tofu if dairy sensitive)',
  lunch_walk_time: '13:15',
  snack_time: '16:30',
  snack_action: 'Evening snack — roasted chana / almonds / green tea',
  dinner_time: '21:00',
  dinner_action: 'Light dinner following dinner rule (protein + salad)',
  dinner_walk_time: '21:45',
  sleep_time: '00:15',
  
  onboarding_completed: true
};

// ---------------------------------------------------------------------------
// 2. Daily Schedule (PRD Section 7) — Rebuilt dynamically in rebuildDynamicData
// ---------------------------------------------------------------------------
export let DAILY_SCHEDULE = [];

// ---------------------------------------------------------------------------
// 3. Weekly Workout Plan (PRD Section 8)
// ---------------------------------------------------------------------------
export const WEEKLY_SCHEDULE = {
  monday:    { morning_plan: 'Full Body Strength', workout_key: 'A', office_walk: true, night_plan: 'Post-dinner walk' },
  tuesday:   { morning_plan: 'Brisk Walk 30 min', workout_key: null, office_walk: true, night_plan: 'Post-dinner walk' },
  wednesday: { morning_plan: 'Core & Balance', workout_key: 'B', office_walk: true, night_plan: 'Post-dinner walk' },
  thursday:  { morning_plan: 'Mobility & Recovery', workout_key: 'M', office_walk: true, night_plan: 'Post-dinner walk' },
  friday:    { morning_plan: 'Full Body Strength', workout_key: 'A', office_walk: true, night_plan: 'Post-dinner walk' },
  saturday:  { morning_plan: 'Brisk Walk 40 min or Cycling', workout_key: null, office_walk: false, night_plan: 'Post-dinner walk' },
  sunday:    { morning_plan: 'Rest or Light Yoga', workout_key: null, office_walk: false, night_plan: 'Post-dinner walk' }
};

export const WORKOUT_A = [
  { name: 'Bodyweight Squats', desc: 'Home strength', sets: 3, reps_or_duration: '15 reps', reps_num: 15, thumbnail: 'exercise-images/squat.png', video_url: 'https://www.youtube.com/results?search_query=bodyweight+squat+proper+form+tutorial' },
  { name: 'Push-ups', desc: 'Knee or standard', sets: 3, reps_or_duration: '12 reps', reps_num: 12, thumbnail: 'exercise-images/pushup.png', video_url: 'https://www.youtube.com/results?search_query=push+up+proper+form+beginner+tutorial' },
  { name: 'Crunches', desc: 'Core focus', sets: 3, reps_or_duration: '15 reps', reps_num: 15, thumbnail: 'exercise-images/crunch.png', video_url: 'https://www.youtube.com/results?search_query=crunches+proper+form+core+workout' },
  { name: 'Plank Hold', desc: 'Core stability', sets: 3, reps_or_duration: '30-45 sec', reps_num: 0, thumbnail: 'exercise-images/plank.png', video_url: 'https://www.youtube.com/results?search_query=plank+hold+proper+form+tutorial' },
  { name: 'Lying Leg Raises', desc: 'Lower abs', sets: 3, reps_or_duration: '12 reps', reps_num: 12, thumbnail: 'exercise-images/leg_raise.png', video_url: 'https://www.youtube.com/results?search_query=lying+leg+raises+proper+form' },
  { name: 'Mountain Climbers', desc: 'Home cardio', sets: 3, reps_or_duration: '30 sec', reps_num: 0, thumbnail: 'exercise-images/mountain_climber.png', video_url: 'https://www.youtube.com/results?search_query=mountain+climbers+exercise+proper+form' }
];
WORKOUT_A.planName = 'Full Body Strength';

export const WORKOUT_B = [
  { name: 'Tai Chi Flow', desc: 'Mindful fitness', sets: 1, reps_or_duration: '20 min', reps_num: 0, thumbnail: 'exercise-images/tai_chi.png', video_url: 'https://www.youtube.com/results?search_query=tai+chi+flow+beginner+routine' },
  { name: 'Push-ups', desc: 'Home strength', sets: 3, reps_or_duration: '10 reps', reps_num: 10, thumbnail: 'exercise-images/pushup.png', video_url: 'https://www.youtube.com/results?search_query=push+up+proper+form+beginner+tutorial' },
  { name: 'Crunches', desc: 'Core focus', sets: 3, reps_or_duration: '12 reps', reps_num: 12, thumbnail: 'exercise-images/crunch.png', video_url: 'https://www.youtube.com/results?search_query=crunches+proper+form+core+workout' },
  { name: 'Plank Hold', desc: 'Core stability', sets: 2, reps_or_duration: '30 sec', reps_num: 0, thumbnail: 'exercise-images/plank.png', video_url: 'https://www.youtube.com/results?search_query=plank+hold+proper+form+tutorial' },
  { name: 'Glute Bridges', desc: 'Lower back & glutes', sets: 3, reps_or_duration: '15 reps', reps_num: 15, thumbnail: 'exercise-images/glute_bridge.png', video_url: 'https://www.youtube.com/results?search_query=glute+bridge+proper+form+tutorial' },
  { name: 'Bird-Dog Exercise', desc: 'Core balance', sets: 3, reps_or_duration: '10 reps each side', reps_num: 10, thumbnail: 'exercise-images/bird_dog.png', video_url: 'https://www.youtube.com/results?search_query=bird+dog+exercise+proper+form' }
];
WORKOUT_B.planName = 'Core & Balance';

export const MOBILITY = [
  { name: 'Tai Chi Breathing', desc: 'Warm-up', sets: 1, reps_or_duration: '5 min', reps_num: 0, thumbnail: 'exercise-images/tai_chi.png', video_url: 'https://www.youtube.com/results?search_query=tai+chi+breathing+warm+up' },
  { name: 'Cat-Cow Stretch', desc: 'Spinal mobility', sets: 1, reps_or_duration: '10 reps', reps_num: 10, thumbnail: 'exercise-images/cat_cow.png', video_url: 'https://www.youtube.com/results?search_query=cat+cow+stretch+proper+form' },
  { name: 'Hip Circles', desc: 'Hip mobility', sets: 1, reps_or_duration: '10 each direction', reps_num: 10, thumbnail: 'exercise-images/hip_circle.png', video_url: 'https://www.youtube.com/results?search_query=hip+circles+exercise+mobility' },
  { name: 'Shoulder Rolls', desc: 'Upper body mobility', sets: 1, reps_or_duration: '10 each direction', reps_num: 10, thumbnail: 'exercise-images/shoulder_roll.png', video_url: 'https://www.youtube.com/results?search_query=shoulder+rolls+exercise+proper+form' },
  { name: 'Hamstring Stretch', desc: 'Posterior chain', sets: 1, reps_or_duration: '30 sec each leg', reps_num: 0, thumbnail: 'exercise-images/hamstring_stretch.png', video_url: 'https://www.youtube.com/results?search_query=hamstring+stretch+proper+form' },
  { name: 'Spinal Twist', desc: 'Gentle twist', sets: 1, reps_or_duration: '30 sec each side', reps_num: 0, thumbnail: 'exercise-images/spinal_twist.png', video_url: 'https://www.youtube.com/results?search_query=seated+spinal+twist+stretch' },
  { name: "Child's Pose", desc: 'Decompression', sets: 1, reps_or_duration: '60 sec', reps_num: 0, thumbnail: 'exercise-images/child_pose.png', video_url: 'https://www.youtube.com/results?search_query=childs+pose+yoga+proper+form' }
];
MOBILITY.planName = 'Mobility & Recovery';

// ---------------------------------------------------------------------------
// 4. Protein Reference Table (Expanded with Clinically Researched Sources)
// ---------------------------------------------------------------------------
export const PROTEIN_REFERENCE = [
  { food: 'Chicken Breast (cooked)', quantity: '100g', protein_g_min: 30, protein_g_max: 31 },
  { food: 'Fish (Rohu/Surmai/Salmon)', quantity: '100g', protein_g_min: 20, protein_g_max: 22 },
  { food: 'Egg (1 whole boiled)', quantity: '1 egg', protein_g_min: 6, protein_g_max: 7 },
  { food: 'Egg Whites (2)', quantity: '2 whites', protein_g_min: 7, protein_g_max: 8 },
  { food: 'Paneer (Cottage Cheese)', quantity: '100g', protein_g_min: 18, protein_g_max: 20 },
  { food: 'Tofu (Soy Paneer)', quantity: '100g', protein_g_min: 12, protein_g_max: 15 },
  { food: 'Broccoli (steamed/salad)', quantity: '1 cup (150g)', protein_g_min: 3, protein_g_max: 4 },
  { food: 'Mushrooms (cooked/stir-fry)', quantity: '1 cup (150g)', protein_g_min: 3, protein_g_max: 4 },
  { food: 'Pumpkin Seeds', quantity: '30g', protein_g_min: 9, protein_g_max: 9 },
  { food: 'Almonds', quantity: '30g (~23 nuts)', protein_g_min: 6, protein_g_max: 6 },
  { food: 'Greek Yogurt / Hung Curd', quantity: '200g', protein_g_min: 15, protein_g_max: 20 },
  { food: 'Regular Curd / Yogurt', quantity: '200g', protein_g_min: 6, protein_g_max: 8 },
  { food: 'Moong Dal (cooked)', quantity: '1 katori', protein_g_min: 7, protein_g_max: 9 },
  { food: 'Chana / Chickpeas (cooked)', quantity: '1 katori', protein_g_min: 8, protein_g_max: 10 },
  { food: 'Rajma / Kidney Beans (cooked)', quantity: '1 katori', protein_g_min: 7, protein_g_max: 9 },
  { food: 'Moong Sprouts (fresh)', quantity: '1 katori', protein_g_min: 5, protein_g_max: 7 },
  { food: 'Soy Chunks (cooked)', quantity: '30g dry', protein_g_min: 15, protein_g_max: 16 },
  { food: 'Whey Protein', quantity: '1 scoop', protein_g_min: 24, protein_g_max: 26 },
  { food: 'Roasted Chana (gram)', quantity: '30g', protein_g_min: 6, protein_g_max: 7 },
  { food: 'Milk (Cow / Low-fat)', quantity: '250ml', protein_g_min: 8, protein_g_max: 8 }
];

// ---------------------------------------------------------------------------
// 5. Meal Plan Themes & Standard Static Base
// ---------------------------------------------------------------------------
export const DAY_THEMES = {
  monday: 'Vegetarian, No Non-Veg',
  tuesday: 'Egg Day',
  wednesday: 'High-Fiber Day',
  thursday: 'Protein Control Day',
  friday: 'Light Dinner Day',
  saturday: 'Controlled Rice Day',
  sunday: 'Recovery / Family Meal Control'
};

// Standard static MEAL_PLANS exported for app.js legacy/fallback usage
export const MEAL_PLANS = {
  monday: [
    { time: '10:30 AM', label: 'First Meal', items: ['1 banana', 'Moong dal chilla (2)', '1 katori curd', '1 glass milk'], protein_min: 22, protein_max: 25, alternatives: ['Besan chilla (2) + curd', 'Sprouts chaat (1 katori) + milk'] },
    { time: '1:30 PM', label: 'Lunch', items: ['1 katori moong dal', '1 katori mixed sabzi', '2 roti', '1 katori curd'], protein_min: 22, protein_max: 27, alternatives: ['Rajma (1 katori) + rice (small bowl) + curd'] },
    { time: '5:30 PM', label: 'Evening Snack', items: ['Roasted chana (30g)', 'Green tea'], protein_min: 6, protein_max: 7, alternatives: ['Makhana (1 cup roasted)', '1 fruit'] },
    { time: '9:00 PM', label: 'Dinner', items: ['Soy chunk curry (30g dry)', '1 roti', 'Salad bowl'], protein_min: 20, protein_max: 24, alternatives: ['Moong sprouts salad (1.5 katori) + roasted chana', 'Besan chilla (2) + curd'] }
  ],
  tuesday: [
    { time: '10:30 AM', label: 'First Meal', items: ['1 apple', 'Moong dal chilla (2)', '1 glass buttermilk'], protein_min: 18, protein_max: 22, alternatives: ['Sprouts chaat (1 katori) + handful almonds'] },
    { time: '1:30 PM', label: 'Lunch', items: ['Chana masala (1 katori)', '1 small bowl rice', 'Raita (150g curd)'], protein_min: 20, protein_max: 25, alternatives: ['Dal fry + 2 roti + curd'] },
    { time: '5:30 PM', label: 'Evening Snack', items: ['Sprouts chaat (1 katori)', 'Lemon water'], protein_min: 5, protein_max: 7, alternatives: ['Roasted makhana + green tea'] },
    { time: '9:00 PM', label: 'Dinner', items: ['2 egg omelette', '1 roti', 'Cucumber salad'], protein_min: 18, protein_max: 20, alternatives: ['Soy chunk stir-fry (30g dry) + 1 roti'] }
  ],
  wednesday: [
    { time: '10:30 AM', label: 'First Meal', items: ['1 banana', 'Greek yogurt (150g)', '10 almonds'], protein_min: 18, protein_max: 22, alternatives: ['2 boiled eggs + 1 toast + milk'] },
    { time: '1:30 PM', label: 'Lunch', items: ['Rajma (1 katori)', '2 roti', '1 katori curd', 'Onion salad'], protein_min: 20, protein_max: 25, alternatives: ['Moong dal + sabzi + 2 roti'] },
    { time: '5:30 PM', label: 'Evening Snack', items: ['Peanut butter (1 tbsp) on 1 toast', 'Green tea'], protein_min: 7, protein_max: 8, alternatives: ['Roasted chana (30g)'] },
    { time: '9:00 PM', label: 'Dinner', items: ['Soy chunk curry (30g dry)', '1 roti', 'Salad'], protein_min: 18, protein_max: 22, alternatives: ['Moong dal chilla (2) + salad', 'Mix veg dal khichdi (thick) + curd'] }
  ],
  thursday: [
    { time: '10:30 AM', label: 'First Meal', items: ['1 orange', 'Moong dal chilla (2)', '1 glass milk'], protein_min: 22, protein_max: 26, alternatives: ['Besan chilla (2) + curd'] },
    { time: '1:30 PM', label: 'Lunch', items: ['Dal tadka (1 katori)', 'Mixed veg sabzi', '2 roti', 'Curd (150g)'], protein_min: 20, protein_max: 24, alternatives: ['Chana + rice + raita'] },
    { time: '5:30 PM', label: 'Evening Snack', items: ['1 fruit (apple/guava)', 'Roasted makhana (1 cup)'], protein_min: 2, protein_max: 4, alternatives: ['Sprouts (half katori)'] },
    { time: '9:00 PM', label: 'Dinner', items: ['Palak dal (heavy on dal)', '1 roti', 'Salad bowl'], protein_min: 16, protein_max: 20, alternatives: ['Egg curry (2 eggs) + 1 roti'] }
  ],
  friday: [
    { time: '10:30 AM', label: 'First Meal', items: ['1 banana', '2 boiled eggs', 'Peanut butter toast (1 tbsp)'], protein_min: 20, protein_max: 24, alternatives: ['Greek yogurt (150g) + fruit + almonds'] },
    { time: '1:30 PM', label: 'Lunch', items: ['Chole (1 katori)', '1 small bowl rice', 'Curd (150g)', 'Salad'], protein_min: 20, protein_max: 25, alternatives: ['Moong dal + 2 roti + sabzi'] },
    { time: '5:30 PM', label: 'Evening Snack', items: ['Roasted chana (30g)', 'Coconut water'], protein_min: 6, protein_max: 7, alternatives: ['Greek yogurt (100g)'] },
    { time: '9:00 PM', label: 'Dinner', items: ['Soy chunks/granules stir-fry (30g dry)', '1 roti', 'Salad'], protein_min: 16, protein_max: 20, alternatives: ['Egg bhurji (2 eggs) + 1 roti', 'Sprouts chaat + curd'] }
  ],
  saturday: [
    { time: '10:30 AM', label: 'First Meal', items: ['Fruit bowl (banana + apple)', 'Whey protein shake (1 scoop + milk)'], protein_min: 32, protein_max: 34, alternatives: ['Moong dal chilla (2) + curd'] },
    { time: '1:30 PM', label: 'Lunch', items: ['Dal makhani (1 katori)', '2 roti', 'Raita', 'Sabzi'], protein_min: 22, protein_max: 26, alternatives: ['Rajma rice + curd + salad'] },
    { time: '5:30 PM', label: 'Evening Snack', items: ['Sprouts chaat (1 katori)', 'Green tea'], protein_min: 5, protein_max: 7, alternatives: ['Roasted chana + lemon water'] },
    { time: '9:00 PM', label: 'Dinner', items: ['Egg bhurji (3 eggs)', 'Salad bowl', '1 roti'], protein_min: 20, protein_max: 22, alternatives: ['Soy chunk salad (30g dry) + cucumber/tomato'] }
  ],
  sunday: [
    { time: '10:30 AM', label: 'First Meal', items: ['Poha with peanuts', '1 glass milk', '1 banana'], protein_min: 14, protein_max: 18, alternatives: ['Upma + boiled eggs (2)'] },
    { time: '1:30 PM', label: 'Lunch', items: ['Flexible meal — home-cooked, controlled portions', 'Include 1 protein source', 'Include salad/curd'], protein_min: 18, protein_max: 25, alternatives: ['Any home-cooked meal with protein focus'] },
    { time: '5:30 PM', label: 'Evening Snack', items: ['Makhana (1 cup)', 'Green tea or black coffee'], protein_min: 3, protein_max: 4, alternatives: ['1 fruit + handful nuts'] },
    { time: '9:00 PM', label: 'Dinner', items: ['Light khichdi (moong dal + rice)', 'Curd', 'Papad'], protein_min: 12, protein_max: 16, alternatives: ['Dalia (broken wheat) khichdi + curd'] }
  ]
};

// ---------------------------------------------------------------------------
// 6. Checklist Template
// ---------------------------------------------------------------------------
export let CHECKLIST_TEMPLATE = {
  health: [
    { key: 'wake_logged', label: 'Wake up logged', points: 0 },
    { key: 'water_started', label: 'Water intake started', points: 2.5 },
    { key: 'sleep_logged', label: 'Sleep hours logged', points: 2.5 }
  ],
  food: [
    { key: 'protein_breakfast', label: 'First meal protein completed', points: 10 },
    { key: 'lunch_completed', label: 'Lunch completed', points: 10 },
    { key: 'snack_completed', label: 'Evening snack completed', points: 10 },
    { key: 'no_biscuits', label: 'No biscuits', points: 5 },
    { key: 'no_sweets', label: 'No sweets', points: 5 },
    { key: 'no_namkeen', label: 'No namkeen', points: 5 },
    { key: 'no_sugar_drink', label: 'No sugar drink', points: 0 },
    { key: 'dinner_rule', label: 'Dinner followed rule', points: 15 },
    { key: 'protein_target', label: 'Protein target met', points: 0 }
  ],
  movement: [
    { key: 'morning_workout', label: 'Morning workout completed', points: 10 },
    { key: 'post_lunch_walk', label: 'Post-lunch walk completed', points: 3.33 },
    { key: 'office_walk', label: 'Office walk completed', points: 3.33 },
    { key: 'post_dinner_walk', label: 'Post-dinner walk completed', points: 3.34 },
    { key: 'step_target', label: 'Step target completed', points: 10 }
  ],
  tracking: [
    { key: 'weight_logged', label: 'Weight logged (if scheduled)', points: 0 },
    { key: 'waist_logged', label: 'Waist logged (if weekly)', points: 0 },
    { key: 'energy_logged', label: 'Energy level logged', points: 0 },
    { key: 'notes_added', label: 'Notes added', points: 0 }
  ]
};

// ---------------------------------------------------------------------------
// 7. Dinner Rules
// ---------------------------------------------------------------------------
export const DINNER_RULES = {
  no_chapati_rice_together: true,
  no_rice_days_per_week: 4,
  rice_allowed_days_per_week: 2,
  flexible_day_per_week: 1,
  options: [
    { name: 'Option A', description: '1 roti + sabzi + salad (no rice)' },
    { name: 'Option B', description: 'Small bowl rice + dal + sabzi (no roti)' },
    { name: 'Option C', description: 'Protein-heavy: paneer/egg + salad (no roti/rice)' },
    { name: 'Option D', description: 'Soup + salad + 1 roti (light dinner)' }
  ]
};

// ---------------------------------------------------------------------------
// 8. localStorage CRUD Functions
// ---------------------------------------------------------------------------
const STORAGE_KEYS = {
  PROFILE: 'ft_profile',
  DAILY_LOGS: 'ft_daily_logs',
  CHECKLISTS: 'ft_checklists',
  MEAL_LOGS: 'ft_meal_logs',
  WORKOUT_LOGS: 'ft_workout_logs',
  WEEKLY_REVIEWS: 'ft_weekly_reviews',
  SETTINGS: 'ft_settings',
  CUSTOM_SCHEDULE: 'ft_custom_schedule'
};

// --- Profile ---
export function formatTime12Hour(timeStr) {
  if (!timeStr) return '';
  const str = String(timeStr);
  if (str.includes('AM') || str.includes('PM')) return str;
  
  const parts = str.split(':');
  if (parts.length < 2) return str;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function getBreakfastDefaultAction(profile) {
  let breakfastAction = 'First meal — fruit + protein breakfast';
  if (profile.diet_type === 'veg') {
    breakfastAction += ' (Moong dal chilla / Greek yogurt / Sprouts)';
  } else if (profile.diet_type === 'vegan') {
    breakfastAction += ' (Tofu scramble / Soy milk / Sprouts)';
  } else if (profile.diet_type === 'eggitarian') {
    breakfastAction += ' (Boiled eggs / Egg whites scramble)';
  } else {
    breakfastAction += ' (Lean chicken salad / Egg whites)';
  }
  return breakfastAction;
}

export function rebuildDynamicData(profile) {
  const weight = profile.start_weight_kg || 90;
  const height = profile.height_cm || 178;
  const bmi = weight / ((height / 100) * (height / 100));
  const isObeseOrOlder = bmi >= 30 || (profile.age && profile.age >= 45);

  const wakeTime = profile.wake_time || '08:00';
  const exerciseTime = profile.exercise_time || '08:10';
  const exerciseAction = profile.exercise_action || (
    profile.has_heart_blockage
      ? 'Gentle mobility flow & slow breathing (20-30 min) — strictly avoid heavy strain'
      : (isObeseOrOlder || (profile.has_joint_pain && profile.joint_pain_locations && profile.joint_pain_locations.length > 0))
        ? 'Gentle low-impact mobility workout or recovery yoga (30 min)'
        : 'Morning strength workout or bodyweight routine (30 min)'
  );
  const breakfastTime = profile.breakfast_time || '10:30';
  const breakfastAction = profile.breakfast_action || getBreakfastDefaultAction(profile);
  const lunchTime = profile.lunch_time || '13:00';
  const lunchAction = profile.lunch_action || 'Lunch — healthy protein-focused meal + curd (or tofu if dairy sensitive)';
  const lunchWalkTime = profile.lunch_walk_time || '13:15';
  const snackTime = profile.snack_time || '16:30';
  const snackAction = profile.snack_action !== undefined ? profile.snack_action : 'Evening snack — roasted chana / almonds / green tea';
  const dinnerTime = profile.dinner_time || '21:00';
  const dinnerAction = profile.dinner_action || 'Light dinner following dinner rule (protein + salad)';
  const dinnerWalkTime = profile.dinner_walk_time || '21:45';
  const sleepTime = profile.sleep_time || '00:15';

  // 1. Build DAILY_SCHEDULE
  const schedule = [];
  schedule.push({ time: formatTime12Hour(wakeTime), action: 'Wake up', checklist_key: 'wake_logged', category: 'health' });
  
  // Medication Checklist Mapping
  if (profile.has_thyroid) {
    schedule.push({ 
      time: formatTime12Hour(wakeTime), 
      action: `${profile.thyroid_medicine || 'Levothyroxine'} (${profile.thyroid_dose || '62.5 mcg'}) (empty stomach) + 2 glasses warm water. Wait 45 mins before breakfast.`, 
      checklist_key: 'thyroid_taken', 
      category: 'health' 
    });
  } else if (profile.has_medical_conditions && profile.medications) {
    schedule.push({ 
      time: formatTime12Hour(wakeTime), 
      action: `Take morning medication: ${profile.medications.split(',')[0]}`, 
      checklist_key: 'meds_taken', 
      category: 'health' 
    });
  }

  // Workout
  schedule.push({ time: formatTime12Hour(exerciseTime), action: exerciseAction, checklist_key: 'morning_workout', category: 'movement' });

  // Breakfast
  schedule.push({ time: formatTime12Hour(breakfastTime), action: breakfastAction, checklist_key: 'protein_breakfast', category: 'food' });

  // Lunch
  schedule.push({ time: formatTime12Hour(lunchTime), action: lunchAction, checklist_key: 'lunch_completed', category: 'food' });

  // Post-meal walk warnings for Lipids or Glycemic Control
  let postLunchMsg = 'Post-lunch walk (10 min)';
  if (profile.has_triglycerides || profile.has_ldl || profile.has_diabetes || profile.has_heart_blockage) {
    postLunchMsg = 'Post-lunch walk (10 min) — critical to clear blood lipids & glucose';
  }
  schedule.push({ time: formatTime12Hour(lunchWalkTime), action: postLunchMsg, checklist_key: 'post_lunch_walk', category: 'movement' });

  // Optional Evening Snack
  const hasSnack = snackAction && snackAction.trim() !== '';
  if (hasSnack) {
    schedule.push({ time: formatTime12Hour(snackTime), action: snackAction, checklist_key: 'snack_completed', category: 'food' });
  }

  // Dinner
  schedule.push({ time: formatTime12Hour(dinnerTime), action: dinnerAction, checklist_key: 'dinner_rule', category: 'food' });

  let postDinnerMsg = 'Post-dinner walk (10 min)';
  if (profile.has_triglycerides || profile.has_ldl || profile.has_diabetes || profile.has_heart_blockage) {
    postDinnerMsg = 'Post-dinner walk (10 min) — critical to clear blood lipids & glucose';
  }
  schedule.push({ time: formatTime12Hour(dinnerWalkTime), action: postDinnerMsg, checklist_key: 'post_dinner_walk', category: 'movement' });

  schedule.push({ time: formatTime12Hour(sleepTime), action: 'Sleep — target 7+ hours', checklist_key: 'sleep_logged', category: 'health' });

  DAILY_SCHEDULE.length = 0;
  DAILY_SCHEDULE.push(...schedule);

  // 2. Build CHECKLIST_TEMPLATE
  const foodChecklist = [
    { key: 'protein_breakfast', label: 'First meal protein completed', points: hasSnack ? 10 : 15 },
    { key: 'lunch_completed', label: 'Lunch completed', points: hasSnack ? 10 : 15 }
  ];
  if (hasSnack) {
    foodChecklist.push({ key: 'snack_completed', label: 'Evening snack completed', points: 10 });
  }
  foodChecklist.push(
    { key: 'no_biscuits', label: 'No biscuits', points: 5 },
    { key: 'no_sweets', label: 'No sweets', points: 5 },
    { key: 'no_namkeen', label: 'No namkeen', points: 5 },
    { key: 'no_sugar_drink', label: 'No sugar drink', points: 0 },
    { key: 'dinner_rule', label: 'Dinner followed rule', points: 15 },
    { key: 'protein_target', label: 'Protein target met', points: 0 }
  );

  const checklistTemplate = {
    health: [
      { key: 'wake_logged', label: 'Wake up logged', points: 0 },
      { key: 'water_started', label: 'Water intake started', points: 2.5 },
      { key: 'sleep_logged', label: 'Sleep hours logged', points: 2.5 }
    ],
    food: foodChecklist,
    movement: [
      { key: 'morning_workout', label: (isObeseOrOlder || profile.has_heart_blockage) ? 'Gentle workout/mobility completed' : 'Morning strength workout completed', points: 10 },
      { key: 'post_lunch_walk', label: 'Post-lunch walk completed', points: 5 },
      { key: 'post_dinner_walk', label: 'Post-dinner walk completed', points: 5 },
      { key: 'step_target', label: 'Step target completed', points: 10 }
    ],
    tracking: [
      { key: 'weight_logged', label: 'Weight logged (if scheduled)', points: 0 },
      { key: 'waist_logged', label: 'Waist logged (if weekly)', points: 0 },
      { key: 'energy_logged', label: 'Energy level logged', points: 0 },
      { key: 'notes_added', label: 'Notes added', points: 0 }
    ]
  };

  // Medication checklists points mapping
  if (profile.has_thyroid) {
    checklistTemplate.health.push({ key: 'thyroid_taken', label: 'Thyroid tablet taken', points: 5 });
  } else if (profile.has_medical_conditions && profile.medications) {
    checklistTemplate.health.push({ key: 'meds_taken', label: `Meds taken (${(profile.medications || '').split(',')[0]})`, points: 5 });
  } else {
    // Reallocate points to water and sleep
    checklistTemplate.health.forEach(item => {
      if (item.key === 'water_started') item.points = 5;
      if (item.key === 'sleep_logged') item.points = 5;
    });
  }

  for (const key of Object.keys(CHECKLIST_TEMPLATE)) {
    delete CHECKLIST_TEMPLATE[key];
  }
  Object.assign(CHECKLIST_TEMPLATE, checklistTemplate);
}

export function getProfile() {
  const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
  const profile = data ? JSON.parse(data) : null;
  const finalProfile = profile ? { ...DEFAULT_PROFILE, ...profile } : { ...DEFAULT_PROFILE, onboarding_completed: false };
  rebuildDynamicData(finalProfile);
  return finalProfile;
}

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  rebuildDynamicData(profile);
}

// --- Daily Logs ---
export function getDailyLog(dateStr) {
  const allLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_LOGS) || '{}');
  return allLogs[dateStr] || {
    date: dateStr,
    weight_kg: null,
    waist_in: null,
    steps: 0,
    sleep_hours: null,
    water_litres: null,
    energy_level: null,
    triglycerides_val: null,
    notes: ''
  };
}

export function saveDailyLog(dateStr, log) {
  const allLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_LOGS) || '{}');
  allLogs[dateStr] = { ...log, date: dateStr };
  localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(allLogs));
}

export function getAllDailyLogs() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_LOGS) || '{}');
}

// --- Checklist ---
export function getChecklist(dateStr) {
  const allChecklists = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHECKLISTS) || '{}');
  if (allChecklists[dateStr]) return allChecklists[dateStr];
  
  const defaultChecklist = {};
  for (const category of Object.keys(CHECKLIST_TEMPLATE)) {
    defaultChecklist[category] = {};
    for (const item of CHECKLIST_TEMPLATE[category]) {
      defaultChecklist[category][item.key] = false;
    }
  }
  return defaultChecklist;
}

export function saveChecklist(dateStr, checklist) {
  const allChecklists = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHECKLISTS) || '{}');
  allChecklists[dateStr] = checklist;
  localStorage.setItem(STORAGE_KEYS.CHECKLISTS, JSON.stringify(allChecklists));
}

// --- Meal Logs ---
export function getMealLogs(dateStr) {
  const allMeals = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEAL_LOGS) || '{}');
  return allMeals[dateStr] || [];
}

export function saveMealLog(dateStr, mealLog) {
  const allMeals = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEAL_LOGS) || '{}');
  if (!allMeals[dateStr]) allMeals[dateStr] = [];
  allMeals[dateStr].push(mealLog);
  localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(allMeals));
}

export function saveAllMealLogs(dateStr, mealLogs) {
  const allMeals = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEAL_LOGS) || '{}');
  allMeals[dateStr] = mealLogs;
  localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(allMeals));
}

// --- Workout Logs ---
export function getWorkoutLog(dateStr) {
  const allWorkouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS) || '{}');
  return allWorkouts[dateStr] || null;
}

export function saveWorkoutLog(dateStr, log) {
  const allWorkouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS) || '{}');
  allWorkouts[dateStr] = log;
  localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(allWorkouts));
}

// --- Weekly Reviews ---
export function getWeeklyReview(weekStr) {
  const allReviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEEKLY_REVIEWS) || '{}');
  return allReviews[weekStr] || null;
}

export function saveWeeklyReview(weekStr, review) {
  const allReviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEEKLY_REVIEWS) || '{}');
  allReviews[weekStr] = review;
  localStorage.setItem(STORAGE_KEYS.WEEKLY_REVIEWS, JSON.stringify(allReviews));
}

// --- Settings ---
export function getSettings() {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return data ? JSON.parse(data) : {
    notifications_enabled: true,
    dark_mode: false,
    weight_unit: 'kg',
    step_target: 8000,
    protein_target_g: 100,
    water_target_glasses: 8,
    reminder_times: ['8:00', '10:30', '13:30', '17:30', '21:00'],
    lunch_walk_alarm: "13:15",
    dinner_walk_alarm: "21:45"
  };
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// --- Custom Schedule ---
export function getCustomSchedule() {
  const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_SCHEDULE);
  return data ? JSON.parse(data) : null;
}

export function saveCustomSchedule(schedule) {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_SCHEDULE, JSON.stringify(schedule));
}

export function resetCustomSchedule() {
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_SCHEDULE);
}

export function getActiveSchedule() {
  const custom = getCustomSchedule();
  return custom || [...DAILY_SCHEDULE];
}

// ---------------------------------------------------------------------------
// 9. Personalized Workout Engine (Joint Pathology & Heart Risk Adaptation)
// ---------------------------------------------------------------------------
export function getPersonalizedWorkout(baseExercises, profile) {
  // Cardiac block: if they have heart blockage or CAD, return empty array to block exercise suggestions
  if (profile.has_heart_blockage) {
    return [];
  }

  const level = profile.fitness_level || 'beginner';
  const age = profile.age || 30;
  const weight = profile.start_weight_kg || 75;
  const height = profile.height_cm || 170;
  const bmi = weight / ((height / 100) * (height / 100));
  const sex = profile.sex || 'male';
  
  const jointPainList = profile.joint_pain_locations || [];
  const hasKneePain = jointPainList.includes('knee') || (profile.medical_conditions || '').toLowerCase().includes('knee');
  const hasBackPain = jointPainList.includes('back') || (profile.medical_conditions || '').toLowerCase().includes('back');
  const hasShoulderPain = jointPainList.includes('shoulder') || (profile.medical_conditions || '').toLowerCase().includes('shoulder') || jointPainList.includes('wrist');
  const hasNeckPain = jointPainList.includes('neck') || (profile.medical_conditions || '').toLowerCase().includes('neck');

  const meds = (profile.medications || '').toLowerCase();
  const isBetaBlocker = meds.includes('beta') || meds.includes('blocker') || meds.includes('atenolol') || meds.includes('metoprolol') || meds.includes('bisoprolol') || meds.includes('carvedilol') || meds.includes('propranolol') || meds.includes('labetalol');
  const isAceOrArb = meds.includes('ace') || meds.includes('arb') || meds.includes('lisinopril') || meds.includes('ramipril') || meds.includes('enalapril') || meds.includes('telmisartan') || meds.includes('losartan') || meds.includes('valsartan');
  const isCcb = meds.includes('calcium') || meds.includes('ccb') || meds.includes('amlodipine') || meds.includes('diltiazem') || meds.includes('verapamil') || meds.includes('nifedipine');
  const isDiuretic = meds.includes('diuretic') || meds.includes('lasix') || meds.includes('furosemide') || meds.includes('hydrochlorothiazide') || meds.includes('spironolactone');
  const isNitrate = meds.includes('nitrate') || meds.includes('nitroglycerin') || meds.includes('isosorbide');

  const hasHypertension = profile.has_hypertension || meds.includes('bp') || meds.includes('hypertension') || meds.includes('pressure');

  // Exercise substitution based on joint & cardiovascular screening
  const substitutedExercises = baseExercises.map(ex => {
    let newEx = { ...ex };
    
    // BP / Cardio / Medication Adaptations
    if (hasHypertension || isBetaBlocker || isNitrate) {
      if (newEx.name === 'Bodyweight Squats') {
        newEx.name = 'Box Squats (Chair Squats)';
        newEx.desc = '⭐ **Cardio Safety:** Low-strain bodyweight squats sitting back onto a chair. Do not strain.';
        newEx.reps_or_duration = '10 slow reps';
        newEx.reps_num = 10;
        newEx._tailoredReason = 'cardio_safety';
      }
      else if (newEx.name === 'Push-ups') {
        newEx.name = 'Wall Push-ups';
        newEx.desc = '⭐ **Cardio Safety:** Push-ups standing against a wall. Keeps blood pressure stable.';
        newEx.reps_or_duration = '10 reps';
        newEx.reps_num = 10;
        newEx.thumbnail = 'exercise-images/pushup.png';
        newEx.video_url = 'https://www.youtube.com/results?search_query=wall+push+ups+form';
        newEx._tailoredReason = 'cardio_safety';
      }
      else if (newEx.name === 'Crunches') {
        newEx.name = 'Tai Chi Breathing';
        newEx.desc = '⭐ **Cardio Safety:** Deep slow breathing flow. Avoids chest cavity pressure from crunches.';
        newEx.reps_or_duration = '5 slow cycles';
        newEx.reps_num = 0;
        newEx.thumbnail = 'exercise-images/tai_chi.png';
        newEx._tailoredReason = 'cardio_safety';
      }
      else if (newEx.name === 'Plank Hold') {
        newEx.name = 'Tai Chi Breathing';
        newEx.desc = '⭐ **Cardio Safety:** Gentle breathing coordination standing. Avoids heavy isometric hold.';
        newEx.reps_or_duration = '1 min';
        newEx._tailoredReason = 'cardio_safety';
      }
      else if (newEx.name === 'Lying Leg Raises') {
        newEx.name = 'Glute Bridges';
        newEx.desc = '⭐ **Cardio Safety:** Gentle hip raises lying on back. Safer than leg raises.';
        newEx.reps_or_duration = '10 reps';
        newEx.reps_num = 10;
        newEx.thumbnail = 'exercise-images/glute_bridge.png';
        newEx._tailoredReason = 'cardio_safety';
      }
      else if (newEx.name === 'Mountain Climbers') {
        newEx.name = 'Tai Chi Breathing';
        newEx.desc = '⭐ **Cardio Safety:** Replaces high intensity climbers with slow paced breathing.';
        newEx.reps_or_duration = '5 slow cycles';
        newEx._tailoredReason = 'cardio_safety';
      }
      
      // Append medication warnings to description
      if (isBetaBlocker || isNitrate) {
        newEx.desc += ' | ⚠️ **Cardio Alert:** Exertion must stay light/moderate (Borg RPE <= 11-13). Blunted heart rate.';
      }
      if (isAceOrArb || isCcb) {
        newEx.desc += ' | ⚠️ **Posture Alert:** Rise slowly from floor to prevent dizziness (orthostatic risk).';
      }
      if (isDiuretic) {
        newEx.desc += ' | 💧 **Hydration Alert:** Sip water between sets to prevent cramping/electrolyte drop.';
      }
      
      return newEx;
    }


    // Joint Pain Adaptations
    if (newEx.name === 'Bodyweight Squats') {
      if (hasKneePain) {
        newEx.name = 'Assisted Wall Squats';
        newEx.desc = '⭐ **Joint Protection:** Lower hips with back flat against a wall, hold gently. Protects knee joints.';
        newEx.reps_or_duration = '20 sec hold';
        newEx.reps_num = 0;
        newEx._tailoredReason = 'knee_joint_protection';
      } else if (age >= 50 || bmi >= 32) {
        newEx.name = 'Box Squats (Chair Squats)';
        newEx.desc = '⭐ **Age/BMI Support:** Squat down until glutes touch a stable chair, then stand up. Reduces joint stress.';
        newEx.reps_or_duration = '10 reps';
        newEx.reps_num = 10;
        newEx._tailoredReason = 'joint_support';
      }
    }
    
    else if (newEx.name === 'Push-ups') {
      if (hasShoulderPain) {
        newEx.name = 'Wall Push-ups';
        newEx.desc = '⭐ **Shoulder Safety:** Replaces floor push-ups to eliminate wrist/shoulder joint shearing.';
        newEx.reps_or_duration = '12 reps';
        newEx.reps_num = 12;
        newEx.thumbnail = 'exercise-images/pushup.png';
        newEx.video_url = 'https://www.youtube.com/results?search_query=wall+push+ups+form';
        newEx._tailoredReason = 'shoulder_safety';
      } else if (age >= 55 || bmi >= 30 || level === 'beginner') {
        newEx.name = 'Knee Push-ups';
        newEx.desc = '⭐ **Joint/Core Support:** Floor push-ups resting on knees. Safer load management.';
        newEx.reps_or_duration = '10 reps';
        newEx.reps_num = 10;
        newEx._tailoredReason = 'joint_support';
      }
    }
    
    else if (newEx.name === 'Mountain Climbers') {
      if (profile.has_hypertension || (profile.medical_conditions || '').toLowerCase().includes('bp')) {
        newEx.name = 'Tai Chi Breathing';
        newEx.desc = '⭐ **BP Safety:** Diaphragmatic inhalation flow. Avoids cardiovascular pressure spikes.';
        newEx.reps_or_duration = '10 slow breaths';
        newEx.reps_num = 10;
        newEx.thumbnail = 'exercise-images/tai_chi.png';
        newEx.video_url = 'https://www.youtube.com/results?search_query=tai+chi+breathing';
        newEx._tailoredReason = 'hypertension_safety';
      } else if (age >= 45 || bmi >= 30 || hasKneePain || hasBackPain) {
        newEx.name = 'Bird-Dog Exercise';
        newEx.desc = '⭐ **Low Impact:** Stabilize core from all-fours. Replaces high-impact mountain climbers.';
        newEx.reps_or_duration = '10 reps total';
        newEx.reps_num = 10;
        newEx.thumbnail = 'exercise-images/bird_dog.png';
        newEx._tailoredReason = 'spine_joint_protection';
      }
    }
    
    else if (newEx.name === 'Plank Hold') {
      if (level === 'beginner' || age >= 60 || bmi >= 32 || hasBackPain) {
        newEx.name = 'Forearm Plank (on knees)';
        newEx.desc = '⭐ **Spine Protection:** Forearm plank resting on knees. Safely offloads lower back.';
        newEx.reps_or_duration = '20 sec';
        newEx.reps_num = 0;
        newEx._tailoredReason = 'spine_protection';
      }
    }
    
    else if (newEx.name === 'Lying Leg Raises') {
      if (hasBackPain) {
        newEx.name = 'Glute Bridges';
        newEx.desc = '⭐ **Spine Protection:** Gentle glute bridges. Replaces leg raises to avoid lower back strain.';
        newEx.reps_or_duration = '12 reps';
        newEx.reps_num = 12;
        newEx.thumbnail = 'exercise-images/glute_bridge.png';
        newEx._tailoredReason = 'spine_protection';
      }
    }
    
    else if (newEx.name === 'Crunches') {
      if (hasNeckPain) {
        newEx.name = 'Bird-Dog Exercise';
        newEx.desc = '⭐ **Neck Protection:** Core balance routine on all fours. Replaces neck-straining crunches.';
        newEx.reps_or_duration = '10 reps';
        newEx.reps_num = 10;
        newEx.thumbnail = 'exercise-images/bird_dog.png';
        newEx._tailoredReason = 'neck_protection';
      }
    }
    
    return newEx;
  });

  // Scale volume based on gender & fitness level
  let setsMul = 1.0;
  let repsMul = 1.0;
  let label = 'Intermediate';

  if (sex === 'male') {
    if (level === 'beginner') {
      setsMul = 0.66; repsMul = 0.7; label = 'Male Beginner — low volume';
    } else if (level === 'advanced') {
      setsMul = 1.33; repsMul = 1.3; label = 'Male Advanced — high intensity';
    } else {
      label = 'Male Intermediate — standard';
    }
  } else {
    if (level === 'beginner') {
      setsMul = 0.66; repsMul = 0.6; label = 'Female Beginner — low volume';
    } else if (level === 'advanced') {
      setsMul = 1.33; repsMul = 1.1; label = 'Female Advanced — high intensity';
    } else {
      setsMul = 1.0; repsMul = 0.85; label = 'Female Intermediate — standard';
    }
  }

  // Safety reductions based on cardiovascular and geriatric conditions
  let riskFactor = 1.0;
  if (profile.has_heart_blockage) {
    riskFactor *= 0.6; // 40% reduction for safety
  } else {
    if (age >= 65) riskFactor *= 0.7;
    else if (age >= 55 || bmi >= 30) riskFactor *= 0.8;
    
    if (profile.has_medical_conditions) riskFactor *= 0.9;
  }

  return substitutedExercises.map(ex => {
    const newSets = Math.max(1, Math.round(ex.sets * setsMul * riskFactor));
    let newReps = ex.reps_or_duration;

    if (ex.reps_num > 0) {
      const scaled = Math.max(3, Math.round(ex.reps_num * repsMul * riskFactor));
      newReps = ex.reps_or_duration.replace(/\d+/, scaled);
    }

    return {
      ...ex,
      sets: newSets,
      reps_or_duration: newReps,
      _scaled: true,
      _levelLabel: label,
      _isHighRisk: profile.has_heart_blockage || age >= 55 || bmi >= 30,
      _riskFactor: riskFactor
    };
  });
}

// ---------------------------------------------------------------------------
// 10. Dynamic Clinical Meal Generator (Dietary Personalization Engine)
// ---------------------------------------------------------------------------
export function getPersonalizedMeals(dayName, profile) {
  // Resolve day-specific diet restrictions (Monday Veg rule)
  let dayDietType = profile.diet_type || 'veg';
  const restrictedDays = profile.restricted_non_veg_days || ['monday'];
  if (restrictedDays.includes(dayName)) {
    if (dayDietType === 'non_veg' || dayDietType === 'eggitarian') {
      dayDietType = 'veg';
    }
  }

  const region = profile.diet_region || 'standard';
  const hasGlutenFree = profile.gluten_free || false;
  const hasLactoseFree = profile.lactose_free || false;
  
  // Lipid and cardiovascular pathology checks
  const limitSaturatedFats = profile.has_triglycerides || profile.has_ldl || profile.has_heart_blockage;
  const hasDiabetes = profile.has_diabetes;

  // Dynamic builder per meal slot
  const buildSlot = (slot) => {
    let items = [];
    let alternatives = [];
    let protein_min = 20;
    let protein_max = 25;

    // --- Slot 1: First Meal (10:30 AM) ---
    if (slot === 'breakfast') {
      protein_min = 20; protein_max = 24;
      
      if (dayDietType === 'veg') {
        if (region === 'north_indian') {
          items = ['1 apple', 'Moong dal chilla (2) with grated paneer (50g)', '1 cup low-fat curd'];
          alternatives = ['Besan chilla (2) + yogurt', 'Moong sprouts bowl + milk'];
        } else if (region === 'south_indian') {
          items = ['1 pear', 'Pesarattu (Moong dal dosa) (2)', '1 cup curd'];
          alternatives = ['Ragi dosa (2) + sambar', 'Moong dal idli (3) + peanut chutney'];
        } else if (region === 'western') {
          items = ['Oatmeal cooked in low-fat milk', 'Almonds (10) & pumpkin seeds (1 tbsp)', 'Steamed broccoli (1 cup)'];
          alternatives = ['Greek yogurt with berries & flaxseeds', 'Tofu scramble + whole wheat toast'];
        } else {
          items = ['1 fruit (guava/apple)', 'Moong dal chilla (2)', '1 katori sprouts'];
          alternatives = ['Oatmeal with milk & nuts', 'Greek yogurt + fruit'];
        }
      } 
      else if (dayDietType === 'eggitarian') {
        items = ['1 apple', 'Boiled eggs (2) or Egg white scramble', '1 slice whole wheat toast'];
        alternatives = ['Moong dal chilla + curd', 'Sprouts chaat + 1 boiled egg'];
      } 
      else if (dayDietType === 'non_veg') {
        items = ['1 fruit (apple/pear)', 'Egg white scramble with mushrooms (1 cup) and broccoli', '1 glass buttermilk'];
        alternatives = ['2 boiled eggs + 1 toast', 'Greek yogurt + pumpkin seeds + fruit'];
      } 
      else if (dayDietType === 'vegan') {
        items = ['Tofu scramble (100g) with spinach and mushrooms', '1 glass soy milk', '1 apple'];
        alternatives = ['Oatmeal in almond milk + chia seeds', 'Sprouts chaat + walnuts'];
      }

      // Gluten free adjustments
      if (hasGlutenFree) {
        items = items.map(item => item.replace(/whole wheat toast/g, 'rice cakes (2)').replace(/toast/g, 'rice chilla (1)'));
        alternatives = alternatives.map(alt => alt.replace(/toast/g, 'rice cakes'));
      }
      // Lactose free adjustments
      if (hasLactoseFree) {
        items = items.map(item => item.replace(/low-fat curd/g, 'soy curd').replace(/curd/g, 'soy curd').replace(/milk/g, 'almond milk').replace(/paneer/g, 'tofu').replace(/Greek yogurt/g, 'tofu scramble'));
        alternatives = alternatives.map(alt => alt.replace(/curd/g, 'soy yogurt').replace(/milk/g, 'almond milk').replace(/paneer/g, 'tofu'));
      }
      // Lipid profile adjustments
      if (limitSaturatedFats) {
        items = items.map(item => item.replace(/Boiled eggs \(2\)/g, 'Egg whites (2) + 1 whole egg').replace(/paneer/g, 'low-fat tofu'));
        items.push('⭐ *Cardio Advice: Saturated fat restricted. Egg whites and low-fat proteins prioritized.*');
      }
      // Diabetes adjustments
      if (hasDiabetes) {
        items = items.map(item => item.replace(/banana/g, 'guava').replace(/Oatmeal/g, 'Steel cut oats'));
        items.push('⭐ *Diabetes Advice: Low-GI fruit & complex oats to curb blood glucose spike.*');
      }
    }

    // --- Slot 2: Lunch (1:30 PM) ---
    else if (slot === 'lunch') {
      protein_min = 25; protein_max = 35;

      if (dayDietType === 'veg') {
        if (region === 'north_indian') {
          items = ['Moong dal fry (1 katori)', 'Mixed vegetable sabzi with broccoli', '2 roti', 'Curd (150g)', 'Large cucumber salad'];
          alternatives = ['Rajma (1 katori) + small rice bowl + curd'];
        } else if (region === 'south_indian') {
          items = ['Brown rice (1 bowl) or 2 ragi roti', 'Sambar (heavy on dal)', 'Cabbage/beans poriyal', 'Curd (150g)', 'Onion tomato salad'];
          alternatives = ['Pesarattu (2) + dal kootu + curd'];
        } else if (region === 'western') {
          items = ['Quinoa salad bowl with grilled paneer (100g)', 'Steamed broccoli and mushrooms', 'Olive oil and lemon dressing'];
          alternatives = ['Lentil soup + brown rice + baked tofu'];
        } else {
          items = ['Cooked dal (1 bowl)', 'Sabzi', '2 roti', 'Curd (150g)', 'Salad'];
          alternatives = ['Chana masala + 1 small bowl rice + curd'];
        }
      } 
      else if (dayDietType === 'eggitarian') {
        items = ['Egg white curry (2 egg whites + 1 yolk)', '2 roti (or jowar/bajra)', 'Curd (150g)', 'Cucumber salad'];
        alternatives = ['Moong dal + mix veg + 2 roti + curd'];
      } 
      else if (dayDietType === 'non_veg') {
        if (region === 'south_indian') {
          items = ['Brown rice (1 bowl)', 'Fish curry (Rohu/Surmai cooked in mustard oil)', 'Vegetable poriyal', 'Tomato cucumber salad'];
          alternatives = ['Chicken curry (low oil) + 2 ragi roti + salad'];
        } else if (region === 'western') {
          items = ['Grilled chicken breast (150g)', 'Steamed broccoli & mushrooms (1.5 cups)', 'Half cup brown rice', 'Green salad'];
          alternatives = ['Baked salmon fillet + asparagus + quinoa'];
        } else {
          items = ['Chicken curry (150g, low oil)', '2 roti', 'Mixed vegetable sabzi', 'Green salad'];
          alternatives = ['Fish fry (tava, low oil) + brown rice + salad'];
        }
      } 
      else if (dayDietType === 'vegan') {
        items = ['Chickpeas/Chana masala (1.5 katori)', 'Brown rice (1 bowl) or 2 jowar roti', 'Steamed broccoli & mushrooms', 'Salad bowl'];
        alternatives = ['Rajma curry + jowar roti + green salad'];
      }

      // Gluten free adjustments
      if (hasGlutenFree) {
        items = items.map(item => item.replace(/2 roti/g, '2 Bajra/Jowar roti').replace(/roti/g, 'Bajra/Jowar roti'));
        alternatives = alternatives.map(alt => alt.replace(/roti/g, 'Bajra/Jowar roti'));
      }
      // Lactose free adjustments
      if (hasLactoseFree) {
        items = items.map(item => item.replace(/Curd \(150g\)/g, 'Sprouts (1 katori)').replace(/curd/g, 'sprouts').replace(/paneer/g, 'tofu').replace(/raita/g, 'salad'));
        alternatives = alternatives.map(alt => alt.replace(/curd/g, 'sprouts').replace(/paneer/g, 'tofu'));
      }
      // Lipid / Blockage adjustments (Saturated fat limits)
      if (limitSaturatedFats) {
        items = items.map(item => item.replace(/Chicken curry/g, 'Skinless grilled chicken breast').replace(/paneer/g, 'low-fat tofu'));
        // Exclude red meat warning
        items.push('⭐ *Cardio Advice: Saturated fat minimized. Red meat avoided. Omega-3 rich fish highly recommended.*');
      }
      // Diabetes adjustments
      if (hasDiabetes) {
        items = items.map(item => item.replace(/rice/g, 'brown rice/quinoa'));
        items.push('⭐ *Diabetes Advice: Low-GI carbs (brown rice/jowar) paired with high fiber salad.*');
      }
    }

    // --- Slot 3: Evening Snack (5:30 PM) ---
    else if (slot === 'snack') {
      protein_min = 6; protein_max = 8;
      
      items = ['Roasted chana (30g) or Sprouts chaat (1 katori)', 'Green tea without sugar'];
      alternatives = ['Handful of almonds (10) & pumpkin seeds (1 tbsp)', 'Roasted makhana + green tea'];
      
      if (hasLactoseFree) {
        alternatives = alternatives.map(alt => alt.replace(/Greek yogurt/g, 'almond milk'));
      }
      if (limitSaturatedFats) {
        items = ['Handful of almonds (10) & pumpkin seeds (1 tbsp)', 'Green tea (Antioxidants + Cardio MUFAs/PUFAs)'];
      }
      if (hasDiabetes) {
        items = ['Moong sprouts salad (1 katori) with cucumber & tomato', 'Cinnamon green tea'];
      }
    }

    // --- Slot 4: Dinner (9:00 PM) ---
    else if (slot === 'dinner') {
      protein_min = 18; protein_max = 24;

      if (dayDietType === 'veg') {
        if (region === 'north_indian') {
          items = ['Paneer bhurji (100g, low fat)', '1 jowar roti', 'Large bowl cabbage salad'];
          alternatives = ['Moong dal chilla (2) + salad'];
        } else if (region === 'south_indian') {
          items = ['Ragi roti (1)', 'Mixed vegetable sambar (heavy on dal)', 'Cucumber salad'];
          alternatives = ['Millet khichdi + salad'];
        } else if (region === 'western') {
          items = ['Stir-fried tofu (120g) with broccoli, mushrooms & bell peppers', 'Drizzle of olive oil', 'No rice/chapati'];
          alternatives = ['Lentil soup + steamed broccoli + seeds'];
        } else {
          items = ['Soy chunk curry (30g dry)', '1 roti', 'Salad'];
          alternatives = ['Palak dal + 1 roti + salad'];
        }
      } 
      else if (dayDietType === 'eggitarian') {
        items = ['Egg white bhurji (3 egg whites)', '1 roti (or bajra/jowar)', 'Cucumber & tomato salad'];
        alternatives = ['Soy chunk stir-fry + salad'];
      } 
      else if (dayDietType === 'non_veg') {
        if (region === 'south_indian') {
          items = ['Grilled fish fillet (150g Rohu/Surmai/Salmon)', 'Steamed broccoli and mushrooms (1 cup)', 'No rice/chapati'];
          alternatives = ['Chicken tikka + large salad'];
        } else if (region === 'western') {
          items = ['Grilled chicken breast (120g) or baked fish', 'Steamed broccoli and mushrooms', '1 tsp olive oil dressing'];
          alternatives = ['Lentil soup + grilled tofu + green salad'];
        } else {
          items = ['Grilled chicken breast (120g)', '1 roti', 'Salad bowl'];
          alternatives = ['Fish curry + half bowl brown rice'];
        }
      } 
      else if (dayDietType === 'vegan') {
        items = ['Tofu stir-fry (120g tofu) with broccoli & mushrooms', '1 jowar roti', 'Tomato salad'];
        alternatives = ['Moong dal soup + sprouts salad'];
      }

      // Gluten free adjustments
      if (hasGlutenFree) {
        items = items.map(item => item.replace(/1 roti/g, '1 Bajra/Jowar roti').replace(/roti/g, 'Bajra/Jowar roti'));
        alternatives = alternatives.map(alt => alt.replace(/roti/g, 'Bajra/Jowar roti'));
      }
      // Lactose free adjustments
      if (hasLactoseFree) {
        items = items.map(item => item.replace(/paneer/g, 'tofu'));
        alternatives = alternatives.map(alt => alt.replace(/paneer/g, 'tofu'));
      }
      // Lipid / CAD adjustments
      if (limitSaturatedFats) {
        items = items.map(item => item.replace(/paneer/g, 'low-fat tofu'));
        items.push('⭐ *Cardio Advice: Light dinner. Saturated fat restricted. No red meat allowed.*');
      }
      // Diabetes adjustments
      if (hasDiabetes) {
        items = items.map(item => item.replace(/roti/g, 'Jowar/Bajra roti'));
        items.push('⭐ *Diabetes Advice: Low carbohydrate dinner with high protein/fiber to avoid fasting spikes.*');
      }
    }

    return { items, alternatives, protein_min, protein_max };
  };

  const breakfastData = buildSlot('breakfast');
  const lunchData = buildSlot('lunch');
  const snackData = buildSlot('snack');
  const dinnerData = buildSlot('dinner');

  return [
    { time: '10:30 AM', label: 'First Meal', items: breakfastData.items, protein_min: breakfastData.protein_min, protein_max: breakfastData.protein_max, alternatives: breakfastData.alternatives },
    { time: '1:30 PM', label: 'Lunch', items: lunchData.items, protein_min: lunchData.protein_min, protein_max: lunchData.protein_max, alternatives: lunchData.alternatives },
    { time: '5:30 PM', label: 'Evening Snack', items: snackData.items, protein_min: snackData.protein_min, protein_max: snackData.protein_max, alternatives: snackData.alternatives },
    { time: '9:00 PM', label: 'Dinner', items: dinnerData.items, protein_min: dinnerData.protein_min, protein_max: dinnerData.protein_max, alternatives: dinnerData.alternatives }
  ];
}

// --- Sex-Specific Health Utilities ---
export function getHealthMetrics(profile) {
  const w = profile.start_weight_kg || 75;
  const h = profile.height_cm || 170;
  const bmi = w / ((h / 100) * (h / 100));
  const sex = profile.sex || 'male';
  const waist = profile.start_waist_in || 0;

  let bmiStatus = 'Normal';
  let bmiColor = 'var(--success)';
  if (bmi < 18.5) { bmiStatus = 'Underweight'; bmiColor = 'var(--info)'; }
  else if (bmi >= 30) { bmiStatus = 'Obese'; bmiColor = 'var(--danger)'; }
  else if (bmi >= 25) { bmiStatus = 'Overweight'; bmiColor = 'var(--warning)'; }

  let waistRisk = 'Normal';
  let waistColor = 'var(--success)';
  if (sex === 'female') {
    if (waist >= 35) { waistRisk = 'High Risk'; waistColor = 'var(--danger)'; }
    else if (waist >= 31.5) { waistRisk = 'Elevated'; waistColor = 'var(--warning)'; }
  } else {
    if (waist >= 40) { waistRisk = 'High Risk'; waistColor = 'var(--danger)'; }
    else if (waist >= 37) { waistRisk = 'Elevated'; waistColor = 'var(--warning)'; }
  }

  let bmr;
  if (sex === 'female') {
    bmr = 10 * w + 6.25 * h - 5 * (profile.age || 30) - 161;
  } else {
    bmr = 10 * w + 6.25 * h - 5 * (profile.age || 30) + 5;
  }

  return { bmi, bmiStatus, bmiColor, waistRisk, waistColor, bmr, sex };
}

// --- Utility Functions ---
export function getDateStr(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayName(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

export function getWeekStr(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getDaysBetween(startDate, endDate) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

export function getProgramDay(dateStr) {
  const profile = getProfile();
  return getDaysBetween(profile.program_start_date, dateStr) + 1;
}

export function getProgramWeek(dateStr) {
  return Math.ceil(getProgramDay(dateStr) / 7);
}

// ---------------------------------------------------------------------------
// 11. Sample Data Generator
// ---------------------------------------------------------------------------
export function generateSampleData() {
  const profile = { ...MOCK_PROFILE };
  saveProfile(profile);

  const today = new Date();
  const sampleWeights  = [90.0, 89.8, 89.5, 89.7, 89.3, 89.6, 89.2];
  const sampleSteps    = [7500, 8200, 5500, 9100, 6800, 10200, 4500];
  const sampleSleep    = [7, 6.5, 7.5, 6, 8, 7, 5.5];
  const sampleEnergyLevel = [4, 4, 3, 4, 2, 4, 3];
  const sampleTriglycerides = [275, 260, 245, 230, 210, 190, 175];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr  = getDateStr(d);
    const dayIndex = 6 - i;
    const dayName  = getDayName(dateStr);

    saveDailyLog(dateStr, {
      date: dateStr,
      weight_kg: sampleWeights[dayIndex],
      waist_in: dayIndex === 0 ? 37.5 : null,
      steps: sampleSteps[dayIndex],
      sleep_hours: sampleSleep[dayIndex],
      water_litres: 2.5,
      energy_level: sampleEnergyLevel[dayIndex],
      triglycerides_val: sampleTriglycerides[dayIndex],
      notes: dayIndex === 4 ? 'Felt tired today, skipped evening walk' : ''
    });

    const checklist = getChecklist(dateStr);
    checklist.health.wake_logged    = true;
    
    if (profile.has_thyroid) {
      checklist.health.thyroid_taken  = dayIndex !== 4;
    }
    checklist.health.water_started  = true;
    checklist.health.sleep_logged   = true;

    checklist.food.protein_breakfast = true;
    checklist.food.lunch_completed   = true;
    checklist.food.snack_completed   = dayIndex !== 2 && dayIndex !== 5;
    checklist.food.no_biscuits       = dayIndex !== 3 && dayIndex !== 6;
    checklist.food.no_sweets         = dayIndex !== 1;
    checklist.food.no_namkeen        = true;
    checklist.food.no_sugar_drink    = true;
    checklist.food.dinner_rule       = dayIndex !== 5;
    checklist.food.protein_target    = dayIndex < 4;

    checklist.movement.morning_workout  = dayIndex !== 4 && dayIndex !== 6;
    checklist.movement.post_lunch_walk  = dayIndex !== 2;
    checklist.movement.post_dinner_walk = dayIndex !== 4;
    checklist.movement.step_target      = sampleSteps[dayIndex] >= 8000;

    checklist.tracking.weight_logged  = true;
    checklist.tracking.waist_logged   = dayIndex === 0;
    checklist.tracking.energy_logged  = true;
    checklist.tracking.notes_added    = dayIndex === 4;

    saveChecklist(dateStr, checklist);

    const meals = getPersonalizedMeals(dayName, profile);
    for (const meal of meals) {
      saveMealLog(dateStr, {
        time: meal.time,
        label: meal.label,
        items: meal.items,
        protein_estimated: Math.round((meal.protein_min + meal.protein_max) / 2),
        completed: true
      });
    }

    const schedule = WEEKLY_SCHEDULE[dayName];
    if (schedule && checklist.movement.morning_workout) {
      saveWorkoutLog(dateStr, {
        date: dateStr,
        type: schedule.morning_plan,
        completed: true,
        duration_min: 35,
        notes: ''
      });
    }
  }
}

export const REGIONAL_SPECIALTIES = {
  "maharashtra": [
    { name: "Methi Zunka (1 serving)", calories: 150, protein: 7, warning: "Traditional chickpea flour paste with fenugreek. High fiber, healthy plant protein.", swap: "Jowar Bhakri instead of wheat chapatis" },
    { name: "Jowar Bhakri (1 flatbread)", calories: 120, protein: 3, warning: "Gluten-free, fiber-rich traditional millet flatbread. Safe complex carbs.", swap: "Eat with low-fat curd or dal" },
    { name: "Sprouts Usal (1 bowl / 150g)", calories: 180, protein: 12, warning: "Steamed mixed sprouts curry. Excellent plant-based protein & high fiber.", swap: "Keep oil minimal during tempering" },
    { name: "Moong Dal Chilla (2 pieces)", calories: 250, protein: 12, warning: "Clean, high-protein moong dal pancake. Great light meal option.", swap: "Add grated paneer for extra protein" },
    { name: "Roasted Chana Sprouts Chaat (1 bowl)", calories: 140, protein: 8, warning: "Unfried healthy snack. Rich in fiber, magnesium, and plant protein.", swap: "Avoid adding fried sev or oily chutneys" }
  ],
  "delhi_region": [
    { name: "Paneer Tikka (Grilled, 4 pieces)", calories: 280, protein: 15, warning: "Grilled cottage cheese with bell peppers. High protein, excellent choice.", swap: "None! This is an excellent high-protein meal" },
    { name: "Chicken Tikka (Grilled, 4 pieces)", calories: 240, protein: 28, warning: "Tandoori grilled skinless chicken breast. High-quality lean protein, low fat.", swap: "None! Perfect high lean protein option" },
    { name: "Soya Chaap (Grilled, dry, 1 plate)", calories: 260, protein: 18, warning: "Soy protein chunks grilled dry without heavy cream or butter. Plant protein.", swap: "Ensure it is grilled dry, not cooked in rich gravy" },
    { name: "Dal Tadka with 1 Missi Roti", calories: 310, protein: 13, warning: "Missi Roti (chickpea-wheat flour mix) provides low glycemic index carbs.", swap: "Order without butter/ghee on top" },
    { name: "Mixed Vegetable Raita (1 bowl)", calories: 90, protein: 5, warning: "Low-fat yogurt with cucumber, tomatoes, and roasted cumin. Probiotic-rich.", swap: "Ensure low-fat curd is used" }
  ],
  "south_india": [
    { name: "Moong Dal Pesarattu (1 dosa)", calories: 220, protein: 9, warning: "Whole green gram crepe. Rich in protein, complex carbs, and iron.", swap: "Use minimal oil on the tawa" },
    { name: "Steamed Oats Idli with Sambar (2 pieces)", calories: 180, protein: 8, warning: "Steamed oats-based idli with vegetable-rich dal sambar. Safe and clean.", swap: "Add a side of curd for extra protein" },
    { name: "Ragi Mudde with Sambar (1 ball)", calories: 280, protein: 7, warning: "Finger millet ball. High fiber, calcium, and complex carbs. Low fat.", swap: "Add paneer chunks or boiled egg whites to increase protein" },
    { name: "Kala Chana Sundal (1 cup / 100g)", calories: 150, protein: 9, warning: "Boiled black chickpeas tempered with mustard seeds and fresh coconut. High fiber.", swap: "Keep oil minimal during tempering" },
    { name: "Kerala Grilled Fish (150g)", calories: 180, protein: 24, warning: "Fish marinated in spices and shallow/baked. Rich in Omega-3 and lean protein.", swap: "Bake or grill instead of pan frying" }
  ],
  "east_india": [
    { name: "Macher Jhol (Fish Curry, 1 serving)", calories: 240, protein: 20, warning: "Traditional light fish stew with cumin and ginger. Excellent lean protein.", swap: "Ensure minimal mustard oil is used during cooking" },
    { name: "Steamed Bhetki Paturi (1 piece / 120g)", calories: 190, protein: 22, warning: "Fish marinated in mustard paste and steamed in banana leaves. Low fat, high protein.", swap: "None! The steaming process keeps it extremely healthy" },
    { name: "Chana Kabli (1 bowl)", calories: 160, protein: 8, warning: "Boiled Bengal gram salad with chopped onions, tomatoes, and lemon. Fiber-rich.", swap: "Avoid any fried toppings or heavy oil dressings" },
    { name: "Paneer Paturi (Steamed, 100g)", calories: 220, protein: 14, warning: "Cottage cheese marinated in mustard and steamed in banana leaves. High protein.", swap: "Use low-fat paneer to reduce saturated fats" },
    { name: "Mixed Veg Dalma (1 bowl)", calories: 150, protein: 8, warning: "Traditional Odia lentil dish loaded with vegetables. High fiber and plant protein.", swap: "Prepare with very little ghee/oil tempering" }
  ],
  "west_india": [
    { name: "Steamed Khaman Dhokla (3 pieces)", calories: 180, protein: 6, warning: "Steamed fermented chickpea batter. Light, easily digestible, low fat.", swap: "Pair with double toned curd to boost protein" },
    { name: "Khandvi (4 pieces)", calories: 120, protein: 4, warning: "Steamed chickpea flour rolls. Low calorie, low fat, and healthy.", swap: "Add roasted sesame seeds for healthy fats, avoid heavy oil tempering" },
    { name: "Bajra Rotla (1 flatbread)", calories: 130, protein: 4, warning: "Traditional pearl millet flatbread. Rich in fiber, iron, and magnesium.", swap: "Serve with low-fat garlic chutney and skimmed curd" },
    { name: "Sprouted Moong Salad (1 bowl)", calories: 110, protein: 8, warning: "Fresh sprouted moong beans with onion, cucumber, tomato, and lime. Highly nutritious.", swap: "Eat raw or lightly steamed" },
    { name: "Paneer Lifafa (Grilled, 1 serving)", calories: 260, protein: 16, warning: "Whole wheat wrap folded with grilled paneer and chopped vegetables. Balanced meal.", swap: "Use non-stick pan to grill dry without butter" }
  ],
  "default_india": [
    { name: "Moong Dal Chilla (2 pieces)", calories: 260, protein: 12, warning: "Great clean option. Low-fat, plant protein.", swap: "None! This is an excellent high-protein meal" },
    { name: "Paneer Tikka (Grilled, 4 pieces)", calories: 280, protein: 15, warning: "Excellent high protein option! Highly clinical approved.", swap: "None! This is an excellent high-protein meal" },
    { name: "Grilled Chicken Salad (1 serving)", calories: 240, protein: 26, warning: "High lean protein option, keep oil dress/mayo low.", swap: "None! This is an excellent high-protein meal" },
    { name: "Boiled Egg (Large, 2)", calories: 156, protein: 12, warning: "Clean option, yolks contain some cholesterol.", swap: "4 egg whites (whites contain zero fat)" }
  ]
};


export const FOOD_DATABASE = [
  { name: 'Double Toned Milk (1 glass / 250ml)', calories: 120, protein: 8 },
  { name: 'Paneer (Raw, 100g)', calories: 265, protein: 18 },
  { name: 'Moong Dal Chilla (1 piece)', calories: 150, protein: 6 },
  { name: 'Boiled Egg (Large, 1)', calories: 78, protein: 6 },
  { name: 'Chicken Breast (Grilled, 100g)', calories: 165, protein: 31 },
  { name: 'Whey Protein (1 scoop / 30g)', calories: 120, protein: 24 },
  { name: 'Roti / Chapati (Whole Wheat, 1)', calories: 80, protein: 3 },
  { name: 'White Rice (Cooked, 1 katori / 150g)', calories: 200, protein: 4 },
  { name: 'Dal (Tarka, 1 katori / 150g)', calories: 150, protein: 7 },
  { name: 'Mixed Sprouts (1 cup / 100g)', calories: 120, protein: 9 },
  { name: 'Apple (Medium, 1)', calories: 95, protein: 0.5 },
  { name: 'Banana (Medium, 1)', calories: 105, protein: 1.3 },
  { name: 'Almonds (10 pieces)', calories: 70, protein: 2.5 },
  { name: 'Oats (Cooked in water, 1 cup / 150g)', calories: 140, protein: 5 },
  { name: 'Greek Yogurt (Low-fat, 100g)', calories: 73, protein: 10 },
  { name: 'Tofu (100g)', calories: 144, protein: 14 },
  { name: 'Fish (Grilled, 100g)', calories: 130, protein: 22 },
  { name: 'Sattu (1 glass / 3 tbsp)', calories: 180, protein: 9 },
  { name: 'Soaked Chana (1 cup / 100g)', calories: 160, protein: 8 },
  { name: 'Peanut Butter (1 tbsp / 16g)', calories: 95, protein: 4 },
  { name: 'Soya Chunks (Cooked, 50g)', calories: 170, protein: 26 }
];

