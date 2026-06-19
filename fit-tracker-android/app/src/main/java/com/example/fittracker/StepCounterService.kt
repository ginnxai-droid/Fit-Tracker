package com.example.fittracker

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.sqrt

class StepCounterService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private val TAG = "StepCounterService"
    private val CHANNEL_ID = "StepCounterChannel"
    private val NOTIFICATION_ID = 101
    private var wakeLock: android.os.PowerManager.WakeLock? = null

    // Selected sensor mode: "counter", "detector", "accelerometer", or "none"
    private var activeTrackingMode = "none"

    // Session variables for TYPE_STEP_COUNTER (Mode 1)
    private var sessionBaseline = -1
    private var sessionStartSteps = 0
    private var currentSessionDate = ""

    // Accelerometer variables for adaptive threshold peak detection (Mode 3)
    private var lastStepTime: Long = 0
    private val STEP_DEBOUNCE_MS = 250L // 4 Hz max step rate
    private var isPeakDetected = false

    // Exponential Moving Average filter for accelerometer fallback
    private var smoothedMagnitude = 9.8f
    private val FILTER_ALPHA = 0.15f // Low-pass filter coefficient for 50Hz (20ms delay)

    // Sliding window of magnitudes for adaptive baseline
    private val windowSize = 50
    private val magnitudeWindow = FloatArray(windowSize)
    private var windowIndex = 0
    private var windowCount = 0
    private var lastMagnitude = 9.8f

    // Pre-step validation buffer parameters
    private val candidateSteps = mutableListOf<Long>()
    private val REQUIRED_CONSECUTIVE_STEPS = 6
    private var isWalkingSessionActive = false

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate")
        
        // Acquire partial WakeLock to ensure service keeps running when screen is off
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            wakeLock = powerManager.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "FitTracker::StepCounterWakeLock")
            wakeLock?.acquire()
            Log.d(TAG, "WakeLock acquired successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire WakeLock", e)
        }
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        setupOptimalSensor()
        
        createNotificationChannel()
        startServiceForeground()
    }

    private fun setupOptimalSensor() {
        val prefs = getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
        val preferredMode = prefs.getString("preferred_tracking_mode", "auto") ?: "auto"

        val stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER, true)
            ?: sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER, false)
        val stepDetector = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR, true)
            ?: sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR, false)
        val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        var registered = false

        if (preferredMode == "counter" && stepCounter != null) {
            sensorManager.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_NORMAL)
            activeTrackingMode = "counter"
            registered = true
            Log.d(TAG, "Step Pedometer (Forced): Registered Hardware Step Counter")
        } else if (preferredMode == "detector" && stepDetector != null) {
            sensorManager.registerListener(this, stepDetector, SensorManager.SENSOR_DELAY_NORMAL)
            activeTrackingMode = "detector"
            registered = true
            Log.d(TAG, "Step Pedometer (Forced): Registered Hardware Step Detector")
        } else if (preferredMode == "accelerometer" && accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME)
            activeTrackingMode = "accelerometer"
            registered = true
            Log.d(TAG, "Step Pedometer (Forced): Registered Accelerometer Fallback")
        }

        // If forced selection failed or mode is auto, fall back to standard hierarchy
        if (!registered) {
            if (stepCounter != null) {
                sensorManager.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_NORMAL)
                activeTrackingMode = "counter"
                Log.d(TAG, "Step Pedometer (Auto): Registered Hardware Step Counter")
            } else if (stepDetector != null) {
                sensorManager.registerListener(this, stepDetector, SensorManager.SENSOR_DELAY_NORMAL)
                activeTrackingMode = "detector"
                Log.d(TAG, "Step Pedometer (Auto): Registered Hardware Step Detector")
            } else if (accelerometer != null) {
                sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME)
                activeTrackingMode = "accelerometer"
                Log.d(TAG, "Step Pedometer (Auto): Registered Accelerometer Fallback")
            } else {
                activeTrackingMode = "none"
                Log.e(TAG, "Step Pedometer: No suitable sensors found on this device!")
            }
        }

        // Save active tracking mode for UI visibility
        prefs.edit().putString("tracking_mode", activeTrackingMode).apply()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service onStartCommand")
        createNotificationChannel()
        startServiceForeground()
        return START_STICKY
    }

    private fun startServiceForeground() {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Fit Tracker")
            .setContentText("Fit Tracker is tracking your steps in the background.")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    NOTIFICATION_ID, 
                    notification, 
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
                )
            } else {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
            }
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Step Tracker Background Service Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null) return
        
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val prefs = getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)

        // Ensure saved date exists in preferences
        val savedDate = prefs.getString("saved_date", null)
        if (savedDate == null) {
            prefs.edit().putString("saved_date", todayStr).apply()
        } else if (savedDate != todayStr) {
            // Day Rollover
            prefs.edit()
                .putString("saved_date", todayStr)
                .putInt("steps_$todayStr", 0)
                .putInt("last_calculated_steps", 0)
                .putInt("sensor_baseline", -1)
                .putInt("session_start_steps", 0)
                .putString("sensor_baseline_date", todayStr)
                .apply()
            
            sessionBaseline = -1
            sessionStartSteps = 0
            currentSessionDate = todayStr
            candidateSteps.clear()
            isWalkingSessionActive = false
            Log.d(TAG, "Day rollover reset. New day: $todayStr")
            return
        }

        when (event.sensor.type) {
            Sensor.TYPE_STEP_COUNTER -> {
                val sensorSteps = event.values[0].toInt()
                val savedSteps = prefs.getInt("steps_$todayStr", 0)
                val lastCalculatedSteps = prefs.getInt("last_calculated_steps", -1)

                // Load from SharedPreferences if in-memory cache is not initialized
                if (sessionBaseline == -1) {
                    sessionBaseline = prefs.getInt("sensor_baseline", -1)
                    sessionStartSteps = prefs.getInt("session_start_steps", 0)
                    currentSessionDate = prefs.getString("sensor_baseline_date", "") ?: ""
                }

                // Re-baseline if initial, date rollover, or modified externally (e.g. simulator)
                if (sessionBaseline == -1 || currentSessionDate != todayStr || savedSteps != lastCalculatedSteps) {
                    sessionBaseline = sensorSteps
                    sessionStartSteps = savedSteps
                    currentSessionDate = todayStr
                    
                    prefs.edit()
                        .putInt("sensor_baseline", sessionBaseline)
                        .putInt("session_start_steps", sessionStartSteps)
                        .putString("sensor_baseline_date", currentSessionDate)
                        .putInt("last_calculated_steps", savedSteps)
                        .apply()
                    Log.d(TAG, "Counter baseline initialized. Steps: $savedSteps, Sensor: $sensorSteps")
                    return
                }

                // Handle reboot
                if (sensorSteps < sessionBaseline) {
                    sessionBaseline = sensorSteps
                    sessionStartSteps = savedSteps
                    prefs.edit()
                        .putInt("sensor_baseline", sessionBaseline)
                        .putInt("session_start_steps", sessionStartSteps)
                        .apply()
                    return
                }

                val delta = sensorSteps - sessionBaseline
                if (delta > 0) {
                    val newStepsToday = sessionStartSteps + delta
                    prefs.edit()
                        .putInt("steps_$todayStr", newStepsToday)
                        .putInt("last_calculated_steps", newStepsToday)
                        .apply()
                    Log.d(TAG, "Counter step update: steps=$newStepsToday (+$delta)")
                }
            }
            
            Sensor.TYPE_STEP_DETECTOR -> {
                // Hardware step detector triggers immediately on each single step
                var savedSteps = prefs.getInt("steps_$todayStr", 0)
                savedSteps += 1
                prefs.edit()
                    .putInt("steps_$todayStr", savedSteps)
                    .putInt("last_calculated_steps", savedSteps)
                    .apply()
                Log.d(TAG, "Detector step update: steps=$savedSteps")
            }
            
            Sensor.TYPE_ACCELEROMETER -> {
                // Software Accelerometer fallback peak detector with adaptive baseline
                val rawX = event.values[0]
                val rawY = event.values[1]
                val rawZ = event.values[2]
                val rawMagnitude = sqrt(rawX * rawX + rawY * rawY + rawZ * rawZ)

                // Exponential Moving Average low-pass filter to smooth signal jitter
                smoothedMagnitude = FILTER_ALPHA * rawMagnitude + (1 - FILTER_ALPHA) * smoothedMagnitude

                // Add to sliding window
                magnitudeWindow[windowIndex] = smoothedMagnitude
                windowIndex = (windowIndex + 1) % windowSize
                if (windowCount < windowSize) {
                    windowCount++
                }

                // Compute min, max of magnitude in current window
                var minMag = Float.MAX_VALUE
                var maxMag = Float.MIN_VALUE
                for (i in 0 until windowCount) {
                    val m = magnitudeWindow[i]
                    if (m < minMag) minMag = m
                    if (m > maxMag) maxMag = m
                }

                val range = maxMag - minMag
                val adaptiveThreshold = (maxMag + minMag) / 2.0f

                // Ensure the movement is significant enough to be walking (filtering noise)
                val MIN_STEP_P2P = prefs.getFloat("sensor_accelerometer_threshold", 1.2f)
                val now = System.currentTimeMillis()

                // Crossing above the dynamic baseline
                val crossedAbove = lastMagnitude < adaptiveThreshold && smoothedMagnitude >= adaptiveThreshold

                if (crossedAbove && range > MIN_STEP_P2P) {
                    if (!isPeakDetected) {
                        isPeakDetected = true
                        
                        // Check if step is within a reasonable cadence
                        val timeDiff = now - lastStepTime
                        lastStepTime = now

                        // Rhythmic walking cadence check: between 250ms (4Hz) and 1500ms (0.67Hz)
                        if (timeDiff in 250..1500) {
                            candidateSteps.add(now)

                            if (isWalkingSessionActive) {
                                // Already in active walking session, increment step immediately
                                var savedSteps = prefs.getInt("steps_$todayStr", 0)
                                savedSteps += 1
                                prefs.edit()
                                    .putInt("steps_$todayStr", savedSteps)
                                    .putInt("last_calculated_steps", savedSteps)
                                    .apply()
                                Log.d(TAG, "Accel: Step registered (active session). Total=$savedSteps")
                            } else {
                                // Check if we reached the required number of rhythmic steps to start a session
                                if (candidateSteps.size >= REQUIRED_CONSECUTIVE_STEPS) {
                                    isWalkingSessionActive = true
                                    var savedSteps = prefs.getInt("steps_$todayStr", 0)
                                    savedSteps += REQUIRED_CONSECUTIVE_STEPS
                                    prefs.edit()
                                        .putInt("steps_$todayStr", savedSteps)
                                        .putInt("last_calculated_steps", savedSteps)
                                        .apply()
                                    Log.d(TAG, "Accel: Stride rhythm validated! Credited $REQUIRED_CONSECUTIVE_STEPS steps. Total=$savedSteps")
                                } else {
                                    Log.d(TAG, "Accel: Rhythmic step candidate. Size=${candidateSteps.size}")
                                }
                            }
                        } else {
                            // Rhythm broken or start of a new movement. Reset candidate buffer.
                            candidateSteps.clear()
                            candidateSteps.add(now)
                            // If walking session was active, deactivate it after a prolonged pause (calibrated to 3000ms)
                            if (timeDiff > 3000) {
                                isWalkingSessionActive = false
                                Log.d(TAG, "Accel: Walking session timed out.")
                            }
                        }
                    }
                } else if (smoothedMagnitude < adaptiveThreshold) {
                    // Reset peak detection when signal crosses back below baseline
                    isPeakDetected = false
                }

                // Periodically check for timeout to deactivate session if user stopped walking (calibrated to 3000ms)
                if (now - lastStepTime > 3000 && (isWalkingSessionActive || candidateSteps.isNotEmpty())) {
                    isWalkingSessionActive = false
                    candidateSteps.clear()
                    Log.d(TAG, "Accel: Walk timed out (inactivity). Candidate buffer cleared.")
                }

                lastMagnitude = smoothedMagnitude
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // No action needed
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "onTaskRemoved called - app swiped away. Scheduling restart alarm.")
        scheduleRestartAlarm()
        super.onTaskRemoved(rootIntent)
    }

    private fun scheduleRestartAlarm() {
        try {
            val restartIntent = Intent(this, StepCounterRestartReceiver::class.java).apply {
                action = "com.example.fittracker.RESTART_STEP_SERVICE"
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_ONE_SHOT
            }
            val pendingIntent = PendingIntent.getBroadcast(
                this, 0, restartIntent, flags
            )
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.set(
                AlarmManager.RTC_WAKEUP,
                System.currentTimeMillis() + 3000, // Restart after 3 seconds
                pendingIntent
            )
            Log.d(TAG, "Restart alarm scheduled for 3 seconds from now")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule restart alarm", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service onDestroy")
        
        // Schedule restart in case service was killed unexpectedly
        scheduleRestartAlarm()

        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(TAG, "WakeLock released")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to release WakeLock", e)
        }
        
        sensorManager.unregisterListener(this)
    }
}
