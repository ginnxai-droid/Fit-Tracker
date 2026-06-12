package com.example.fittracker

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

    // Selected sensor mode: "counter", "detector", "accelerometer", or "none"
    private var activeTrackingMode = "none"

    // Session variables for TYPE_STEP_COUNTER (Mode 1)
    private var sessionBaseline = -1
    private var sessionStartSteps = 0
    private var currentSessionDate = ""

    // Accelerometer variables for peak detection (Mode 3)
    private var lastStepTime: Long = 0
    private val STEP_DEBOUNCE_MS = 350L
    private val STEP_THRESHOLD = 2.0f // m/s^2 peak threshold for step detection (gravity subtracted)
    private val RESET_THRESHOLD = 1.0f // return threshold to reset peak state (gravity subtracted)
    private var isPeakDetected = false

    // Exponential smoothing factor for raw accelerometer values
    private val alpha = 0.8f
    private var gravity = floatArrayOf(0f, 9.8f, 0f)

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate")
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        setupOptimalSensor()
        
        createNotificationChannel()
        startServiceForeground()
    }

    private fun setupOptimalSensor() {
        val stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        val stepDetector = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        val prefs = getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)

        if (stepCounter != null) {
            // Mode 1: Hardware Step Counter (Session-Baseline)
            sensorManager.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_UI)
            activeTrackingMode = "counter"
            Log.d(TAG, "Step Pedometer: Registered Hardware Step Counter (Mode 1)")
        } else if (stepDetector != null) {
            // Mode 2: Hardware Step Detector (Incremental)
            sensorManager.registerListener(this, stepDetector, SensorManager.SENSOR_DELAY_UI)
            activeTrackingMode = "detector"
            Log.d(TAG, "Step Pedometer: Registered Hardware Step Detector (Mode 2)")
        } else if (accelerometer != null) {
            // Mode 3: Software Accelerometer Peak Detection Fallback
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME)
            activeTrackingMode = "accelerometer"
            Log.d(TAG, "Step Pedometer: Registered Accelerometer Fallback (Mode 3)")
        } else {
            activeTrackingMode = "none"
            Log.e(TAG, "Step Pedometer: No suitable sensors found on this device!")
        }

        // Save tracking mode for UI visibility
        prefs.edit().putString("tracking_mode", activeTrackingMode).apply()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service onStartCommand")
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
        val savedDate = prefs.getString("saved_date", todayStr) ?: todayStr
        if (savedDate != todayStr) {
            // Day Rollover
            prefs.edit()
                .putString("saved_date", todayStr)
                .putInt("steps_$todayStr", 0)
                .putInt("last_calculated_steps", 0)
                .apply()
            
            sessionBaseline = -1
            sessionStartSteps = 0
            currentSessionDate = todayStr
            Log.d(TAG, "Day rollover reset. New day: $todayStr")
            return
        }

        when (event.sensor.type) {
            Sensor.TYPE_STEP_COUNTER -> {
                val sensorSteps = event.values[0].toInt()
                var savedSteps = prefs.getInt("steps_$todayStr", 0)
                val lastCalculatedSteps = prefs.getInt("last_calculated_steps", -1)

                // Re-baseline if initial, date rollover, or modified externally (e.g. simulator)
                if (sessionBaseline == -1 || currentSessionDate != todayStr || savedSteps != lastCalculatedSteps) {
                    sessionBaseline = sensorSteps
                    sessionStartSteps = savedSteps
                    currentSessionDate = todayStr
                    prefs.edit().putInt("last_calculated_steps", savedSteps).apply()
                    Log.d(TAG, "Counter baseline initialized. Steps: $savedSteps, Sensor: $sensorSteps")
                    return
                }

                // Handle reboot
                if (sensorSteps < sessionBaseline) {
                    sessionBaseline = sensorSteps
                    sessionStartSteps = savedSteps
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
                // Software Accelerometer fallback peak detector
                // Apply low-pass filter to isolate gravity
                gravity[0] = alpha * gravity[0] + (1 - alpha) * event.values[0]
                gravity[1] = alpha * gravity[1] + (1 - alpha) * event.values[1]
                gravity[2] = alpha * gravity[2] + (1 - alpha) * event.values[2]

                // Subtract gravity to get true user acceleration
                val x = event.values[0] - gravity[0]
                val y = event.values[1] - gravity[1]
                val z = event.values[2] - gravity[2]

                // Compute acceleration magnitude vector
                val magnitude = sqrt(x * x + y * y + z * z)

                // Peak threshold counting with debouncing
                if (magnitude > STEP_THRESHOLD) {
                    if (!isPeakDetected) {
                        val currentTime = System.currentTimeMillis()
                        if (currentTime - lastStepTime > STEP_DEBOUNCE_MS) {
                            isPeakDetected = true
                            lastStepTime = currentTime
                            
                            var savedSteps = prefs.getInt("steps_$todayStr", 0)
                            savedSteps += 1
                            prefs.edit()
                                .putInt("steps_$todayStr", savedSteps)
                                .putInt("last_calculated_steps", savedSteps)
                                .apply()
                            Log.d(TAG, "Accelerometer step detected! steps=$savedSteps, magnitude=$magnitude")
                        }
                    }
                } else if (magnitude < RESET_THRESHOLD) {
                    // Reset peak state once magnitude drops below resting gravity deviation
                    isPeakDetected = false
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // No action needed
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service onDestroy")
        sensorManager.unregisterListener(this)
    }
}
