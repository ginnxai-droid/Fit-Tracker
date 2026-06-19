# Flexible Step Tracking & Battery Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a flexible step tracking strategy selection in FitTracker settings that lets users choose between Background (Always On), App Open & Minimized (Battery Saver), or Disabled (Manual smartwatch input), and enable manual step entry overrides.

**Architecture:** Extend the Android `SharedPreferences` to support `step_tracking_strategy`. Update Android native service lifecycles and alarm schedules to respect the strategy, expose Javascript interfaces to the Web/WebView, and update the Web UI/Logic to enable editable fields, toggle warning banners, and store manual step overrides.

**Tech Stack:** HTML5, Vanilla JavaScript, CSS3, Kotlin (Android SDK).

## Global Constraints
- Do not use external CSS or UI frameworks.
- Preserve all existing file structures and imports.
- Make all changes compatible with both local web browser execution and Android WebView assets.

---

### Task 1: Android Service & Receiver Lifecycle Lifecycle Updates
**Files:**
- Modify: [StepCounterService.kt](file:///d:/Antigravity%20Project/Fit%20tracker/fit-tracker-android/app/src/main/java/com/example/fittracker/StepCounterService.kt)
- Modify: [StepCounterRestartReceiver.kt](file:///d:/Antigravity%20Project/Fit%20tracker/fit-tracker-android/app/src/main/java/com/example/fittracker/StepCounterRestartReceiver.kt)

- [ ] **Step 1: Modify StepCounterService.kt to skip restart alarm on Battery Saver/Disabled modes**
  Locate `scheduleRestartAlarm()` (around lines 385-408) and insert the strategy check:
  ```kotlin
      private fun scheduleRestartAlarm() {
          val prefs = getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
          val strategy = prefs.getString("step_tracking_strategy", "background") ?: "background"
          if (strategy != "background") {
              Log.d(TAG, "Not scheduling restart alarm because strategy is $strategy")
              return
          }
          try {
              val restartIntent = Intent(this, StepCounterRestartReceiver::class.java).apply {
                  action = "com.example.fittracker.RESTART_STEP_SERVICE"
              }
  ```

- [ ] **Step 2: Modify StepCounterRestartReceiver.kt to skip startup if not Background mode**
  Locate `onReceive()` (around lines 12-26) and insert the strategy check:
  ```kotlin
      override fun onReceive(context: Context, intent: Intent?) {
          Log.d(TAG, "onReceive triggered with action: ${intent?.action}")
          val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
          val strategy = prefs.getString("step_tracking_strategy", "background") ?: "background"
          if (strategy != "background") {
              Log.d(TAG, "Step tracking strategy is $strategy. Ignoring restart broadcast.")
              return
          }
          
          val serviceIntent = Intent(context, StepCounterService::class.java)
  ```

- [ ] **Step 3: Commit Task 1**
  Run:
  ```bash
  git add fit-tracker-android/app/src/main/java/com/example/fittracker/StepCounterService.kt fit-tracker-android/app/src/main/java/com/example/fittracker/StepCounterRestartReceiver.kt
  git commit -m "feat: implement strategy checks in background service and receiver"
  ```

---

### Task 2: Android MainActivity JavaScript Interface & Lifecycles
**Files:**
- Modify: [MainActivity.kt](file:///d:/Antigravity%20Project/Fit%20tracker/fit-tracker-android/app/src/main/java/com/example/fittracker/MainActivity.kt)

- [ ] **Step 1: Add JS Interface methods for strategy**
  Locate the `AndroidInterface` inner class (around lines 350-425) and append the new interfaces:
  ```kotlin
          @JavascriptInterface
          fun getStepTrackingStrategy(): String {
              val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
              return prefs.getString("step_tracking_strategy", "background") ?: "background"
          }

          @JavascriptInterface
          fun setStepTrackingStrategy(strategy: String) {
              val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
              prefs.edit().putString("step_tracking_strategy", strategy).apply()
          }
  ```

- [ ] **Step 2: Update startStepCounterService() to respect disabled mode**
  Locate `startStepCounterService()` (around lines 291-298) and update:
  ```kotlin
      private fun startStepCounterService() {
          val prefs = getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
          val strategy = prefs.getString("step_tracking_strategy", "background") ?: "background"
          if (strategy == "disabled") {
              Log.d("MainActivity", "Step tracking strategy is disabled. Not starting service.")
              return
          }
          val intent = Intent(this, StepCounterService::class.java)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              startForegroundService(intent)
          } else {
              startService(intent)
          }
      }
  ```

- [ ] **Step 3: Update promptBatteryOptimizationIfNeeded() to run only in background mode**
  Locate `promptBatteryOptimizationIfNeeded()` (around lines 225-246) and add the strategy guard:
  ```kotlin
      private fun promptBatteryOptimizationIfNeeded() {
          val prefs = getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
          val strategy = prefs.getString("step_tracking_strategy", "background") ?: "background"
          if (strategy != "background") {
              return
          }
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
              val pm = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
  ```

- [ ] **Step 4: Update restartStepCounterService() to respect disabled mode**
  Locate `restartStepCounterService()` inside the `AndroidInterface` inner class (around lines 375-390) and modify:
  ```kotlin
          @JavascriptInterface
          fun restartStepCounterService() {
              try {
                  Log.d("MainActivity", "Stopping StepCounterService to apply changes")
                  val stopIntent = Intent(context, StepCounterService::class.java)
                  context.stopService(stopIntent)
                  
                  val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
                  val strategy = prefs.getString("step_tracking_strategy", "background") ?: "background"
                  if (strategy == "disabled") {
                      Log.d("MainActivity", "Step tracking is disabled. Service will remain stopped.")
                      return
                  }
                  
                  Log.d("MainActivity", "Starting StepCounterService with strategy: $strategy")
                  val startIntent = Intent(context, StepCounterService::class.java)
                  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                      context.startForegroundService(startIntent)
                  } else {
                      context.startService(startIntent)
                  }
              } catch (e: Exception) {
                  e.printStackTrace()
              }
          }
  ```

- [ ] **Step 5: Commit Task 2**
  Run:
  ```bash
  git add fit-tracker-android/app/src/main/java/com/example/fittracker/MainActivity.kt
  git commit -m "feat: expose step strategy JS interfaces and update lifecycle in MainActivity"
  ```

---

### Task 3: HTML settings selector
**Files:**
- Modify: [index.html](file:///d:/Antigravity%20Project/Fit%20tracker/index.html)

- [ ] **Step 1: Add step tracking strategy setting selector**
  Locate `pedometerCalibrationSection` (around lines 1710-1725) and insert the new field:
  ```html
          <!-- Pedometer Calibration & Sensors (Android-only) -->
          <div class="settings-section" id="pedometerCalibrationSection" style="border-top: 1px solid var(--border-subtle); padding-top: var(--space-md); display: none;">
            <h3>Pedometer Calibration & Sensors</h3>
            <p style="margin: 0 0 var(--space-md) 0; font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
              Configure your step tracker mode based on your phone's capabilities, or calibrate the software accelerometer sensitivity.
            </p>
            <div class="input-group" style="margin-bottom: var(--space-md);">
              <label for="settingStepStrategy">Step Tracking Strategy</label>
              <select id="settingStepStrategy" class="input" style="background: var(--bg-elevated); color: var(--text);">
                <option value="background">Always On (Background Service)</option>
                <option value="app_open">App Open & Minimized Only (Battery Saver)</option>
                <option value="disabled">Disabled (Manual smartwatch key-in)</option>
              </select>
            </div>
            <div class="input-grid" style="grid-template-columns: repeat(2, 1fr); gap: var(--space-md);">
  ```

- [ ] **Step 2: Commit Task 3**
  Run:
  ```bash
  git add index.html
  git commit -m "feat: add step tracking strategy selection to Settings modal"
  ```

---

### Task 4: Web Application Logic & Sync
**Files:**
- Modify: [app.js](file:///d:/Antigravity%20Project/Fit%20tracker/app.js)

- [ ] **Step 1: Load strategy in openSettings**
  Locate `openSettings` (around lines 2496-2508) and load the strategy setting:
  ```javascript
      const pcalSection = document.getElementById('pedometerCalibrationSection');
      if (pcalSection) {
        if (isAndroid) {
          pcalSection.style.display = 'block';
          if (typeof window.AndroidInterface.getPreferredTrackingMode === 'function') {
            setInputValue('settingSensorMode', window.AndroidInterface.getPreferredTrackingMode());
          }
          if (typeof window.AndroidInterface.getAccelerometerThreshold === 'function') {
            setInputValue('settingSensorThreshold', window.AndroidInterface.getAccelerometerThreshold().toString());
          }
          if (typeof window.AndroidInterface.getStepTrackingStrategy === 'function') {
            setInputValue('settingStepStrategy', window.AndroidInterface.getStepTrackingStrategy());
          }
        } else {
  ```

- [ ] **Step 2: Save strategy in save settings handler**
  Locate the save settings button click listener (around line 2800) and save the strategy:
  ```javascript
        const settings = getSettings();
        settings.lunch_walk_alarm = profile.lunch_walk_time;
        settings.dinner_walk_alarm = profile.dinner_walk_time;
        settings.gemini_api_key = document.getElementById('settingGeminiApiKey')?.value.trim() || '';
        saveSettings(settings);
        
        if (typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid()) {
          if (typeof window.AndroidInterface.setStepTrackingStrategy === 'function') {
            const strategy = document.getElementById('settingStepStrategy')?.value || 'background';
            window.AndroidInterface.setStepTrackingStrategy(strategy);
            if (typeof window.AndroidInterface.restartStepCounterService === 'function') {
              window.AndroidInterface.restartStepCounterService();
            }
          }
        }
  ```

- [ ] **Step 3: Toggle battery optimization banner depending on strategy**
  Locate `renderDashboard` battery banner logic (around lines 418-428) and modify:
  ```javascript
    // Battery Optimization Banner (Android)
    const isAndroid = typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid();
    const batteryBanner = document.getElementById('androidBatteryBanner');
    if (batteryBanner) {
      let strategy = 'background';
      if (isAndroid && typeof window.AndroidInterface.getStepTrackingStrategy === 'function') {
        strategy = window.AndroidInterface.getStepTrackingStrategy();
      }
      
      if (isAndroid && strategy === 'background' && typeof window.AndroidInterface.isBatteryOptimizationIgnored === 'function') {
        const ignored = window.AndroidInterface.isBatteryOptimizationIgnored();
        batteryBanner.style.display = ignored ? 'none' : 'block';
      } else {
        batteryBanner.style.display = 'none';
      }
    }
  ```

- [ ] **Step 4: Enable steps input field permanently on Android**
  Locate `inputSteps` handling in `app.js` (around lines 883-896) and modify:
  ```javascript
    // Handle steps input block for Android vs Web
    const stepsInput = document.getElementById('inputSteps');
    if (stepsInput) {
      stepsInput.disabled = false;
      stepsInput.style.backgroundColor = '';
      if (isAndroid) {
        stepsInput.title = "Manually override steps or let the phone auto-track";
      } else {
        stepsInput.title = "";
      }
    }
  ```

- [ ] **Step 5: Handle manual step overrides in quick log save**
  Locate `saveQuickLog` click listener (around lines 940-946) and modify:
  ```javascript
        const isAndroid = typeof window.AndroidInterface !== 'undefined' && window.AndroidInterface.isAndroid();
        let strategy = "background";
        if (isAndroid && typeof window.AndroidInterface.getStepTrackingStrategy === 'function') {
          strategy = window.AndroidInterface.getStepTrackingStrategy();
        }
        
        if (isAndroid && strategy !== 'disabled' && currentDate === getDateStr(new Date()) && log.steps_source !== 'manual') {
          log.steps = window.AndroidInterface.getStepsToday();
        } else {
          const inputStepsVal = getInputNumber('inputSteps');
          if (inputStepsVal !== null) {
            log.steps = inputStepsVal;
            if (isAndroid) {
              log.steps_source = 'manual';
              if (typeof window.AndroidInterface.saveStepsToday === 'function') {
                window.AndroidInterface.saveStepsToday(log.steps);
              }
            }
          }
        }
  ```

- [ ] **Step 6: Commit Task 4**
  Run:
  ```bash
  git add app.js
  git commit -m "feat: allow manual step entry on Android and configure strategy-based sync"
  ```

---

### Task 5: Sync Assets, Compile & Verify
**Files:**
- None (Utility task)

- [ ] **Step 1: Sync Assets**
  Run: `py sync_assets.py`
  Expected: Successful copies of `app.js`, `data.js`, `index.html`, etc. to Android and iOS build assets directories.

- [ ] **Step 2: Build Android APK**
  Run: `.\gradlew assembleDebug` inside the directory `d:\Antigravity Project\Fit tracker\fit-tracker-android`
  Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Verify with automated E2E tests**
  Start background server `node server.js` inside `C:\Users\ADMIN\.gemini\antigravity\brain\269c3bc0-c4b6-4b8a-a3e7-0a20535c6b92\scratch` and run:
  Run: `node e2e_qa_test.js`
  Expected: All 22 tests pass successfully.

- [ ] **Step 4: Update build APKs**
  Run:
  ```powershell
  Copy-Item -Path "fit-tracker-android\app\build\outputs\apk\debug\app-debug.apk" -Destination "fit-tracker.apk" -Force
  Copy-Item -Path "fit-tracker-android\app\build\outputs\apk\debug\app-debug.apk" -Destination "fit-tracker-professional.apk" -Force
  ```

- [ ] **Step 5: Commit and push changes**
  Run:
  ```bash
  git add fit-tracker.apk fit-tracker-professional.apk
  git commit -m "build: compile and update binary APKs for flexible step tracking strategy"
  git push origin main
  ```
