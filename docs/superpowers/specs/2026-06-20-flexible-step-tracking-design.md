# Design Specification: Flexible Step Tracking & Battery Optimization

## Goal
Implement a flexible step tracking strategy in FitTracker that resolves battery drain issues, supports manual step overrides, and accommodates users tracking steps via external smartwatches/fitness bands.

---

## Proposed System Changes

### 1. Storage & State (`SharedPreferences`)
Add a new preference key `step_tracking_strategy` in the Android `SharedPreferences` to govern pedometer lifecycle behavior:
* `"background"` (default): Pedometer runs always as a background service.
* `"app_open"`: Pedometer runs while the app is active or minimized (pocket/screen-off/multitasking), but terminates cleanly without auto-restart when swiped away.
* `"disabled"`: Native sensors are fully turned off, saving 100% battery.

### 2. Android Native Layer

#### [MainActivity.kt](file:///d:/Antigravity%20Project/Fit%20tracker/fit-tracker-android/app/src/main/java/com/example/fittracker/MainActivity.kt)
* Add `@JavascriptInterface` helper methods:
  * `getStepTrackingStrategy(): String`
  * `setStepTrackingStrategy(strategy: String)`
* Modify `startStepCounterService()` to verify that strategy is not `"disabled"`.
* Modify `promptBatteryOptimizationIfNeeded()` to only prompt for battery whitelist exemptions if strategy is `"background"`.
* Update `restartStepCounterService()` to stop the service and only restart it if the strategy is not `"disabled"`.

#### [StepCounterService.kt](file:///d:/Antigravity%20Project/Fit%20tracker/fit-tracker-android/app/src/main/java/com/example/fittracker/StepCounterService.kt)
* In `scheduleRestartAlarm()`, check the strategy value. If the strategy is `"app_open"` or `"disabled"`, skip scheduling the 3-second restart alarm. This ensures that if the service is stopped or if the app is swiped away (`onTaskRemoved`), the service stays dead.

#### [StepCounterRestartReceiver.kt](file:///d:/Antigravity%20Project/Fit%20tracker/fit-tracker-android/app/src/main/java/com/example/fittracker/StepCounterRestartReceiver.kt)
* Inside `onReceive()`, read the tracking strategy. If it is not `"background"`, ignore the restart request and do not start the service.

---

### 3. Web & UI Layer

#### [index.html](file:///d:/Antigravity%20Project/Fit%20tracker/index.html)
* Add a select dropdown `#settingStepStrategy` in the Settings modal (under Pedometer settings):
  ```html
  <div class="input-group">
    <label for="settingStepStrategy">Step Tracking Strategy</label>
    <select id="settingStepStrategy" class="input" style="background: var(--bg-elevated); color: var(--text);">
      <option value="background">Always On (Background Service)</option>
      <option value="app_open">App Open & Minimized Only (Battery Saver)</option>
      <option value="disabled">Disabled (Manual smartwatch key-in)</option>
    </select>
  </div>
  ```

#### [app.js](file:///d:/Antigravity%20Project/Fit%20tracker/app.js)
* **Allow Editing**: Make the `#inputSteps` text field fully enabled/editable on Android so users can type manually.
* **Save Logic**:
  * In `openSettings()`, fetch and populate the strategy selector:
    ```javascript
    if (typeof window.AndroidInterface.getStepTrackingStrategy === 'function') {
      setInputValue('settingStepStrategy', window.AndroidInterface.getStepTrackingStrategy());
    }
    ```
  * In `saveSettings` listener, store the new strategy and restart the service:
    ```javascript
    if (typeof window.AndroidInterface.setStepTrackingStrategy === 'function') {
      const strategy = document.getElementById('settingStepStrategy')?.value || 'background';
      window.AndroidInterface.setStepTrackingStrategy(strategy);
      if (typeof window.AndroidInterface.restartStepCounterService === 'function') {
        window.AndroidInterface.restartStepCounterService();
      }
    }
    ```
  * In `renderDashboard()`, check strategy and only display `#androidBatteryBanner` if strategy is `"background"`.
  * In `bindQuickLogEvents()`, check the strategy when saving today's logs. If strategy is `"disabled"` or the user manually entered steps:
    * Save it natively using `window.AndroidInterface.saveStepsToday(steps)` (this syncs the baseline count).
    * Tag the record with `steps_source = "manual"` so background polling does not overwrite it.
