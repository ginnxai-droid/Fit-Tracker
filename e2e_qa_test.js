/**
 * Fit Tracker — Comprehensive E2E QA Automated Test Suite
 * Designed to perform Google Play Store grade quality assurance verification.
 */

const puppeteer = require('puppeteer');
const path = require('path');

const TARGET_URL = 'http://127.0.0.1:8080';
const ARTIFACT_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/276f2e40-9482-49a2-a49d-d4f7d5ae23c4';

let browser;
let page;
let failedTests = 0;
let passedTests = 0;

function logTestResult(name, success, details = "") {
  if (success) {
    passedTests++;
    console.log(`[PASS] ${name} ${details ? '- ' + details : ''}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${name} - ERROR: ${details}`);
  }
}

async function runTests() {
  console.log("=========================================================");
  console.log("       FIT TRACKER AUTOMATED QA TEST RUNNER              ");
  console.log("=========================================================");
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();

    // Mock geolocation API fetches and Date to return Monday, June 8th, 2026
    await page.evaluateOnNewDocument(() => {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = args[0];
        if (typeof url === 'string') {
          if (url.includes('nominatim.openstreetmap.org')) {
            return {
              ok: true,
              json: async () => ({
                address: {
                  city: 'Mumbai',
                  state: 'Maharashtra'
                }
              })
            };
          }
          if (url.includes('ipapi.co')) {
            return {
              ok: true,
              json: async () => ({
                city: 'Mumbai',
                region: 'Maharashtra'
              })
            };
          }
        }
        return originalFetch.apply(this, args);
      };

      // Mock Date to be Monday, June 8th, 2026
      const mockDate = new Date('2026-06-08T10:00:00');
      const OriginalDate = Date;
      class MockDate extends OriginalDate {
        constructor(...args) {
          if (args.length === 0) {
            super(mockDate.getTime());
          } else {
            super(...args);
          }
        }
      }
      MockDate.now = () => mockDate.getTime();
      window.Date = MockDate;
    });

    // 1. Listen to Page Errors
    page.on('pageerror', err => {
      console.error(' [PAGE ERROR] uncaught exception:', err.toString());
      failedTests++;
    });

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning' || msg.type() === 'log') {
        console.log(` [BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // 2. Set Mobile Viewport (iPhone 13 dimensions)
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // ── TEST 1: App Loading & Responsive Navigation Drawer ──
    try {
      const headerVisible = await page.evaluate(() => {
        const header = document.getElementById('mobileHeader');
        return header && window.getComputedStyle(header).display !== 'none';
      });
      const navVisible = await page.evaluate(() => {
        const nav = document.getElementById('mobileNav');
        return nav && window.getComputedStyle(nav).display !== 'none';
      });
      logTestResult("Test 1a: Mobile Layout Containers Rendered", headerVisible && navVisible, `Header: ${headerVisible}, Nav: ${navVisible}`);

      // Open drawer
      await page.click('#mobileMenuBtn');
      await new Promise(r => setTimeout(r, 400));
      const drawerOpen = await page.evaluate(() => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        return sidebar.classList.contains('open') && overlay.classList.contains('active');
      });
      logTestResult("Test 1b: Navigation Drawer Toggled Open", drawerOpen);

      // Close drawer via overlay
      await page.click('#sidebarOverlay');
      await new Promise(r => setTimeout(r, 400));
      const drawerClosed = await page.evaluate(() => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        return !sidebar.classList.contains('open') && !overlay.classList.contains('active');
      });
      logTestResult("Test 1c: Navigation Drawer Closed via Overlay Click", drawerClosed);
    } catch (e) {
      logTestResult("Test 1: App Loading & Navigation", false, e.message);
    }

    // ── TEST 2: Profile & Settings CRUD ──
    try {
      // Re-open drawer to access settings
      await page.click('#mobileMenuBtn');
      await new Promise(r => setTimeout(r, 400));
      await page.click('#settingsBtn');
      await new Promise(r => setTimeout(r, 500));

      const modalOpen = await page.evaluate(() => {
        const modal = document.getElementById('settingsModal');
        return modal && modal.open === true;
      });
      logTestResult("Test 2a: Settings Modal Opened from Drawer", modalOpen);

      // Update name to "Amit Kumar" and save
      await page.evaluate(() => {
        document.getElementById('settingName').value = "Amit Kumar";
        document.getElementById('settingStartDate').value = "2026-06-01";
        const chk = document.getElementById('settingAcceptTerms');
        if (chk) chk.checked = true;
      });
      await page.click('#saveSettings');
      await new Promise(r => setTimeout(r, 500));

      const profileName = await page.evaluate(() => {
        const profile = JSON.parse(localStorage.getItem('ft_profile') || '{}');
        return profile.name;
      });
      logTestResult("Test 2b: Profile Saved to LocalStorage", profileName === "Amit Kumar", `Saved name: ${profileName}`);
    } catch (e) {
      logTestResult("Test 2: Profile & Settings CRUD", false, e.message);
    }

    // ── TEST 3: Dietary Preferences, Paneer/Tofu Exclusions & Monday Veg ──
    try {
      // Re-open settings to load sample data for deep analysis
      await page.click('#mobileMenuBtn');
      await new Promise(r => setTimeout(r, 400));
      await page.click('#settingsBtn');
      await new Promise(r => setTimeout(r, 500));
      await page.click('#loadSampleData');
      await new Promise(r => setTimeout(r, 1000));
      
      // Close drawer if still open
      await page.evaluate(() => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
      });
      await new Promise(r => setTimeout(r, 300));
      
      // Verify exclusions on all stored meals in data template
      const templateExclusionsOk = await page.evaluate(() => {
        const profile = JSON.parse(localStorage.getItem('ft_profile') || '{}');
        const diet = profile.diet_type || 'non_veg';
        const meals = JSON.parse(localStorage.getItem('ft_meal_logs') || '{}');
        const values = Object.values(meals).flatMap(dayMeals => dayMeals.map(m => (m.items || []).join(' ').toLowerCase()));
        
        let forbiddenWords = ['beef', 'pork', 'mutton']; // Universally forbidden
        if (diet === 'veg') {
           forbiddenWords.push('chicken', 'fish', 'meat', 'egg');
        } else if (diet === 'eggitarian') {
           forbiddenWords.push('chicken', 'fish', 'meat');
        } else if (diet === 'vegan') {
           forbiddenWords.push('chicken', 'fish', 'meat', 'egg', 'paneer', 'curd', 'milk', 'whey');
        }

        for (const item of values) {
          for (const word of forbiddenWords) {
            // Avoid false positives for "egg" in "veggie" or similar, but simpler string search is fine here since items are explicit
            // For safety, let's use word boundary or just hope they are exact. We'll stick to includes.
            if (item.includes(word)) return { ok: false, item, word };
          }
        }
        return { ok: true };
      });
      logTestResult("Test 3a: Profile-Based Dietary Exclusions", templateExclusionsOk.ok, 
        templateExclusionsOk.ok ? "Clean across all logged records" : `Found forbidden word '${templateExclusionsOk.word}' in: "${templateExclusionsOk.item}"`);

      // Verify Monday is 100% vegetarian, no eggs
      const mondayVegOk = await page.evaluate(() => {
        const mealLogs = JSON.parse(localStorage.getItem('ft_meal_logs') || '{}');
        // Monday date (2026-06-08)
        const mondayLog = mealLogs['2026-06-08'] || [];
        if (mondayLog.length === 0) return { ok: false, reason: "No logs found for Monday 2026-06-08" };

        const forbiddenMondays = ['egg', 'chicken', 'fish', 'meat'];
        for (const meal of mondayLog) {
          // Filter out advice texts before checking
          const items = (meal.items || []).filter(item => !item.toLowerCase().includes('cardio advice'));
          const food = items.join(' ').toLowerCase();
          for (const word of forbiddenMondays) {
            if (food.includes(word)) return { ok: false, reason: `Monday meal contains '${word}': "${food}"` };
          }
        }
        return { ok: true };
      });
      logTestResult("Test 3b: Monday Vegetarian Rule (Zero Egg/Non-Veg)", mondayVegOk.ok, 
        mondayVegOk.ok ? "Complete vegetarian menu confirmed" : mondayVegOk.reason);
    } catch (e) {
      logTestResult("Test 3: Dietary Rules Verification", false, e.message);
    }

    // ── TEST 4: Bi-Directional Sync (Meals to Checklist) ──
    try {
      // Navigate to Meals page
      await page.click('.mobile-nav-item[data-screen="meals"]');
      await new Promise(r => setTimeout(r, 600));

      // Uncheck "I ate this" on First Meal (Breakfast) card (since it starts checked from mock data)
      const breakfastAteToggled = await page.evaluate(() => {
        const firstCheckbox = document.querySelector('.meal-card input[type="checkbox"]');
        if (!firstCheckbox) return false;
        if (firstCheckbox.checked) {
          firstCheckbox.click(); // Uncheck it
        }
        return !firstCheckbox.checked; // Should return true (unchecked)
      });
      await new Promise(r => setTimeout(r, 500));
      logTestResult("Test 4a: Unmarked Meal Eaten on Meal Plan Screen", breakfastAteToggled);

      // Navigate back to Today page to verify checklist updated to unchecked
      await page.click('.mobile-nav-item[data-screen="today"]');
      await new Promise(r => setTimeout(r, 600));

      const checklistSyncOk = await page.evaluate(() => {
        const chk = document.querySelector('input[data-category="food"][data-key="protein_breakfast"]');
        return chk && chk.checked === false; // Sync check
      });
      logTestResult("Test 4b: Today's Checklist Synchronized (Unchecked) from Meal Plan", checklistSyncOk);
    } catch (e) {
      logTestResult("Test 4: Bi-Directional Sync", false, e.message);
    }

    // ── TEST 5: Inline Custom Meal Editor & Reset ──
    try {
      // Go to Meals page
      await page.click('.mobile-nav-item[data-screen="meals"]');
      await new Promise(r => setTimeout(r, 600));

      // Click "Log / Update" button on the first meal card (Breakfast)
      await page.evaluate(() => {
        const updateBtn = document.querySelector('.meal-card .edit-meal-btn');
        if (updateBtn) updateBtn.click();
      });
      await new Promise(r => setTimeout(r, 400));

      // Enter custom food details and protein grams
      await page.evaluate(() => {
        const card = document.querySelector('.meal-card');
        const textarea = card.querySelector('.meal-items-textarea');
        const input = card.querySelector('.meal-protein-input');
        if (textarea) textarea.value = "Custom Whey Protein Shake + 4 Almonds";
        if (input) input.value = "30";
        // Click Save inside card
        const saveBtn = card.querySelector('.save-meal-btn');
        if (saveBtn) saveBtn.click();
      });
      await new Promise(r => setTimeout(r, 500));

      const mealLogUpdated = await page.evaluate(() => {
        const mealLogs = JSON.parse(localStorage.getItem('ft_meal_logs') || '{}');
        const dateKeys = Object.keys(mealLogs);
        const todayMeals = mealLogs[dateKeys[dateKeys.length - 1]] || [];
        return todayMeals[0] && todayMeals[0].items[0] === "Custom Whey Protein Shake + 4 Almonds" && todayMeals[0].protein_estimated === 30;
      });
      logTestResult("Test 5a: Saved Custom Meal with Protein Grams", mealLogUpdated);

      // Test Reset template functionality
      await page.evaluate(() => {
        const card = document.querySelector('.meal-card');
        const resetBtn = card.querySelector('.reset-meal-btn');
        if (resetBtn) resetBtn.click();
      });
      await new Promise(r => setTimeout(r, 500));

      const mealLogReset = await page.evaluate(() => {
        const mealLogs = JSON.parse(localStorage.getItem('ft_meal_logs') || '{}');
        const dateKeys = Object.keys(mealLogs);
        const todayMeals = mealLogs[dateKeys[dateKeys.length - 1]] || [];
        return todayMeals[0] && todayMeals[0].items[0] !== "Custom Whey Protein Shake + 4 Almonds"; // Reverted back to template
      });
      logTestResult("Test 5b: Reverted Custom Meal back to Default Template", mealLogReset);
    } catch (e) {
      logTestResult("Test 5: Inline Custom Meal Editor", false, e.message);
    }

    // ── TEST 6: Checklist Logging & Score Calculations ──
    try {
      // Navigate to Today
      await page.click('.mobile-nav-item[data-screen="today"]');
      await new Promise(r => setTimeout(r, 600));

      // Check all items on today's checklist
      await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
        checkboxes.forEach((c, idx) => {
          if (idx < 5) c.checked = true;
          c.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
      await new Promise(r => setTimeout(r, 500));

      // Enter manual measurements in Quick Log and save
      await page.evaluate(() => {
        document.getElementById('inputWeight').value = "85.5";
        document.getElementById('inputWaist').value = "36.0";
        document.getElementById('inputSteps').value = "10500";
        document.getElementById('inputSleep').value = "7.5";
        document.getElementById('inputWater').value = "3.5";
        document.getElementById('saveQuickLog').click();
      });
      await new Promise(r => setTimeout(r, 800));

      const dailyScore = await page.evaluate(() => {
        return parseInt(document.getElementById('todayScoreValue').textContent || '0');
      });
      logTestResult("Test 6a: Score Calculated and Rendered Live", dailyScore > 0 && dailyScore <= 100, `Score: ${dailyScore}`);

      const savedInStorageResult = await page.evaluate(() => {
        const logs = JSON.parse(localStorage.getItem('ft_daily_logs') || '{}');
        const keys = Object.keys(logs).sort();
        const lastLog = logs[keys[keys.length - 1]] || {};
        const success = lastLog.weight_kg === 85.5 && lastLog.waist_in === 36 && lastLog.steps === 10500;
        return { success, lastLog, keys, logs };
      });
      logTestResult("Test 6b: Measurements Saved to LocalStorage Daily Logs", savedInStorageResult.success, `keys: ${JSON.stringify(savedInStorageResult.keys)}, logs: ${JSON.stringify(savedInStorageResult.logs)}`);
    } catch (e) {
      logTestResult("Test 6: Checklist & Score Calculations", false, e.message);
    }

    // ── TEST 7: Training, Difficulty Stars & Communal Timings ──
    try {
      // Go to Workout
      await page.click('.mobile-nav-item[data-screen="workout"]');
      await new Promise(r => setTimeout(r, 600));

      // Click difficulty star rating
      const ratingSuccess = await page.evaluate(() => {
        const star = document.querySelector('.difficulty-stars .star[data-val="4"]');
        if (star) {
          star.click();
          return star.classList.contains('active') || document.querySelectorAll('.difficulty-stars .star.active').length === 4;
        }
        return false;
      });
      logTestResult("Test 7a: Rated Workout Difficulty (Star Feedback)", ratingSuccess);

      // Verify Walking Timeline slots (Post-Lunch & Post-Dinner timings alignment)
      const walkTimesCorrect = await page.evaluate(() => {
        const checklistItems = document.querySelectorAll('#walkingChecklist .checklist-item');
        if (checklistItems.length !== 2) return `Length was ${checklistItems.length}`;
        
        const t1El = checklistItems[0].querySelector('.checklist-item__time');
        const t2El = checklistItems[1].querySelector('.checklist-item__time');
        
        if (!t1El || !t2El) return `One of the elements was null: t1El=${!!t1El}, t2El=${!!t2El}`;
        
        const t1 = t1El.textContent.trim();
        const t2 = t2El.textContent.trim();
        
        if (t1 === "1:15 PM" && t2 === "9:45 PM") {
          return true;
        }
        return `t1='${t1}', t2='${t2}'`;
      });
      logTestResult("Test 7b: walking Timeline Slots Aligned (Post-Dinner 9:45 PM)", walkTimesCorrect === true, typeof walkTimesCorrect === 'string' ? walkTimesCorrect : '');
    } catch (e) {
      logTestResult("Test 7: Workout & Timeline Timings", false, e.message);
    }

    // ── TEST 8: Charts & Recommendations ──
    try {
      // Go to Progress page
      await page.click('.mobile-nav-item[data-screen="progress"]');
      await new Promise(r => setTimeout(r, 800));

      const canvasListOk = await page.evaluate(() => {
        const ids = ['weightChart', 'waistChart', 'stepsChart', 'proteinChart', 'trajectoryChart', 'complianceChart', 'workoutHeatmap', 'streakChart'];
        return ids.every(id => {
          const canvas = document.getElementById(id);
          return canvas !== null;
        });
      });
      logTestResult("Test 8a: Chart.js Progress Canvas Containers Rendered", canvasListOk);

      // Navigate to Review screen
      await page.click('.mobile-nav-item[data-screen="review"]');
      await new Promise(r => setTimeout(r, 800));

      const coachMessageRendered = await page.evaluate(() => {
        const coachMsg = document.getElementById('coachMessage');
        const emptyMsg = document.querySelector('.recommendations .review-list__empty');
        return coachMsg && window.getComputedStyle(coachMsg.parentElement).display !== 'none' && !emptyMsg;
      });
      logTestResult("Test 8b: Coach Recommendations Engine Calculated Recommendations", coachMessageRendered);
    } catch (e) {
      logTestResult("Test 8: Progress Charts & Recommendations", false, e.message);
    }

    // ── TEST 9: Terms & Conditions Checkbox Validation ──
    try {
      // Open settings programmatically
      await page.evaluate(() => {
        document.getElementById('settingsModal').showModal();
      });
      await new Promise(r => setTimeout(r, 400));

      // Uncheck settings terms checkbox
      await page.evaluate(() => {
        const chk = document.getElementById('settingAcceptTerms');
        if (chk) chk.checked = false;
      });

      // Try to save, check that it's blocked (modal stays open)
      await page.click('#saveSettings');
      await new Promise(r => setTimeout(r, 300));
      const modalStillOpen = await page.evaluate(() => {
        const modal = document.getElementById('settingsModal');
        return modal && modal.open === true;
      });
      logTestResult("Test 9a: Saving Settings Blocked when Terms Unchecked", modalStillOpen);

      // Check settings terms checkbox
      await page.evaluate(() => {
        const chk = document.getElementById('settingAcceptTerms');
        if (chk) chk.checked = true;
      });

      // Save again, check that it succeeds (modal closes)
      await page.click('#saveSettings');
      await new Promise(r => setTimeout(r, 500));
      const modalClosed = await page.evaluate(() => {
        const modal = document.getElementById('settingsModal');
        return modal && modal.open === false;
      });
      logTestResult("Test 9b: Saving Settings Succeeds when Terms Checked", modalClosed);
    } catch (e) {
      logTestResult("Test 9: Terms & Conditions Checkbox Validation", false, e.message);
    }

    // ── TEST 10: Cardiac Exercise Blocking & Doctor Consult Warning ──
    try {
      // Open settings programmatically
      await page.evaluate(() => {
        document.getElementById('settingsModal').showModal();
      });
      await new Promise(r => setTimeout(r, 400));

      await page.evaluate(() => {
        const chkHeart = document.getElementById('settingHasHeartBlockage');
        if (chkHeart) chkHeart.checked = true;
        const chkTerms = document.getElementById('settingAcceptTerms');
        if (chkTerms) chkTerms.checked = true;
      });

      // Save settings
      await page.click('#saveSettings');
      await new Promise(r => setTimeout(r, 500));

      // Navigate to Workout page
      await page.click('.mobile-nav-item[data-screen="workout"]');
      await new Promise(r => setTimeout(r, 600));

      // Check that exercises are hidden and consult warning is shown
      const cardiacBlockValid = await page.evaluate(() => {
        const alertDiv = document.getElementById('workoutMedicalAlert');
        const exercisesContainer = document.getElementById('exerciseList');
        const cardFooter = document.querySelector('#workoutCard .card-footer');

        const alertVisible = alertDiv && window.getComputedStyle(alertDiv).display !== 'none' && alertDiv.innerText.includes('Medical Clearance Required');
        const listHidden = !exercisesContainer || window.getComputedStyle(exercisesContainer).display === 'none';
        const footerHidden = !cardFooter || window.getComputedStyle(cardFooter).display === 'none';

        return alertVisible && listHidden && footerHidden;
      });

      logTestResult("Test 10: Cardiac Heart Blockage / CAD Workout Block", cardiacBlockValid);
    } catch (e) {
      logTestResult("Test 10: Cardiac Heart Blockage / CAD Workout Block", false, e.message);
    }

    // ── TEST 11: Hypertension Adaptation & Medication Safety Warnings ──
    try {
      // Open settings programmatically
      await page.evaluate(() => {
        document.getElementById('settingsModal').showModal();
      });
      await new Promise(r => setTimeout(r, 400));

      await page.evaluate(() => {
        const chkHeart = document.getElementById('settingHasHeartBlockage');
        if (chkHeart) chkHeart.checked = false;
        
        const chkBP = document.getElementById('settingHasHypertension');
        if (chkBP) chkBP.checked = true;

        const medsInput = document.getElementById('settingMeds');
        if (medsInput) medsInput.value = "Atenolol, Amlodipine";

        const chkTerms = document.getElementById('settingAcceptTerms');
        if (chkTerms) chkTerms.checked = true;
      });

      // Save settings
      await page.click('#saveSettings');
      await new Promise(r => setTimeout(r, 500));

      // Go to Workout screen
      await page.click('.mobile-nav-item[data-screen="workout"]');
      await new Promise(r => setTimeout(r, 600));

      // Verify that exercises are shown, alert div is shown, and specific medication warnings are listed
      const bpAdaptationValid = await page.evaluate(() => {
        const alertDiv = document.getElementById('workoutMedicalAlert');
        const exercisesContainer = document.getElementById('exerciseList');
        
        const alertText = alertDiv ? alertDiv.innerText : "";
        const hasBetaBlockerWarn = alertText.includes('Beta-blockers');
        const hasAceCcbWarn = alertText.includes('ACE inhibitors/CCBs');
        const exercisesShown = exercisesContainer && window.getComputedStyle(exercisesContainer).display !== 'none';

        // Check if there are adapted exercise names
        const exerciseText = exercisesContainer ? exercisesContainer.innerText : "";
        const hasAdaptedEx = exerciseText.includes('Wall Push-ups') || exerciseText.includes('Chair Squats') || exerciseText.includes('Bird-dog') || exerciseText.includes('Breathing') || exerciseText.includes('Active Recovery');

        return exercisesShown && hasBetaBlockerWarn && hasAceCcbWarn && hasAdaptedEx;
      });

      logTestResult("Test 11: Hypertension Exercise Adaptation & Safety Warnings", bpAdaptationValid);
    } catch (e) {
      logTestResult("Test 11: Hypertension Exercise Adaptation & Safety Warnings", false, e.message);
    }

    // ── TEST 12: Healthy Regional Food Suggestions ──
    try {
      // Go to Meals screen
      await page.click('.mobile-nav-item[data-screen="meals"]');
      await new Promise(r => setTimeout(r, 600));

      // Verify that the meal suggestions don't contain unhealthy regional specialties but do contain healthy ones
      const regionalFoodsHealthy = await page.evaluate(() => {
        // Look at the text inside the meals page
        const mealsPage = document.getElementById('screen-meals');
        if (!mealsPage) return false;
        
        const pageText = mealsPage.innerText;
        
        // Unhealthy indicators that shouldn't be present
        const hasUnhealthy = pageText.includes('Vada Pav') || pageText.includes('Chole Bhature') || pageText.includes('Roshogolla') || pageText.includes('Mango Mastani');
        
        // Healthy indicators that we added
        const hasHealthy = pageText.includes('Zunka') || pageText.includes('Idli') || pageText.includes('Tikka') || pageText.includes('Dhokla') || pageText.includes('Sundal') || pageText.includes('Bhakri') || pageText.includes('Pesarattu');

        return !hasUnhealthy && hasHealthy;
      });

      logTestResult("Test 12: Healthy Regional Specialties Displayed", regionalFoodsHealthy);
    } catch (e) {
      logTestResult("Test 12: Healthy Regional Specialties Displayed", false, e.message);
    }



    // Close browser
    console.log("---------------------------------------------------------");
    console.log(`E2E Testing Finished: ${passedTests} passed, ${failedTests} failed.`);
    console.log("=========================================================");
    await browser.close();

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (err) {
    console.error("CRITICAL TEST RUNNER EXCEPTION:", err);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runTests();
