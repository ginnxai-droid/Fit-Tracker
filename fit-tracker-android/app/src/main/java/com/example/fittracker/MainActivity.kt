package com.example.fittracker

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var pendingWalkReminder: String? = null

    private var pendingGeolocationOrigin: String? = null
    private var pendingGeolocationCallback: GeolocationPermissions.Callback? = null

    private var filePathCallback: android.webkit.ValueCallback<Array<android.net.Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val data = result.data
            val uris = if (data != null) {
                val clipData = data.clipData
                if (clipData != null) {
                    val list = mutableListOf<android.net.Uri>()
                    for (i in 0 until clipData.itemCount) {
                        list.add(clipData.getItemAt(i).uri)
                    }
                    list.toTypedArray()
                } else {
                    val dataUri = data.data
                    if (dataUri != null) arrayOf(dataUri) else null
                }
            } else null
            filePathCallback?.onReceiveValue(uris)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        val granted = fineGranted || coarseGranted
        pendingGeolocationCallback?.invoke(pendingGeolocationOrigin, granted, false)
        pendingGeolocationOrigin = null
        pendingGeolocationCallback = null
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val activityGranted = permissions[Manifest.permission.ACTIVITY_RECOGNITION]
            ?: (ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED)
        if (activityGranted) {
            startStepCounterService()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        webView.webViewClient = object : WebViewClient() {
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                return false
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: android.webkit.WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString()
                if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                return false
            }
        }

        // Capture console logs for debugging
        webView.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                if (consoleMessage != null) {
                    android.util.Log.d("WebViewConsole", "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}")
                }
                return true
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                val hasFine = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                val hasCoarse = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED

                if (hasFine || hasCoarse) {
                    callback?.invoke(origin, true, false)
                } else {
                    pendingGeolocationOrigin = origin
                    pendingGeolocationCallback = callback
                    locationPermissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: android.webkit.ValueCallback<Array<android.net.Uri>>?,
                fileChooserParams: android.webkit.WebChromeClient.FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent()
                if (intent == null) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    return false
                }
                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.databaseEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true

        // Allow cross-origin requests on file scheme (required for ES Modules in WebView assets)
        webSettings.allowFileAccessFromFileURLs = true
        webSettings.allowUniversalAccessFromFileURLs = true

        // Force viewport settings to scale according to HTML viewport meta tag
        webSettings.useWideViewPort = true
        webSettings.loadWithOverviewMode = true

        // Bind JavaScript interface for communication
        webView.addJavascriptInterface(AndroidInterface(this), "AndroidInterface")

        webView.loadUrl("file:///android_asset/index.html")

        setContentView(webView)

        // Request physical activity recognition and notification permissions
        checkAndRequestPermissions()

        // Handle intent if launched via notification click
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        // Sync steps from native service to WebView whenever app comes to foreground
        webView.post {
            webView.evaluateJavascript("javascript:if (typeof syncAndroidSteps === 'function') { syncAndroidSteps(); }", null)
        }
        
        // Proactively prompt battery optimization exemption on first launch
        promptBatteryOptimizationIfNeeded()
    }

    private fun promptBatteryOptimizationIfNeeded() {
        val prefs = getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
        val strategy = prefs.getString("step_tracking_strategy", "background") ?: "background"
        val dismissed = prefs.getBoolean("battery_opt_warning_dismissed", false)
        if (strategy != "background" || dismissed) {
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val lastPromptTime = prefs.getLong("battery_opt_last_prompt", 0)
                val now = System.currentTimeMillis()
                // Prompt at most once every 24 hours
                if (now - lastPromptTime > 24 * 60 * 60 * 1000) {
                    prefs.edit().putLong("battery_opt_last_prompt", now).apply()
                    try {
                        val intent = Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = android.net.Uri.parse("package:$packageName")
                        }
                        startActivity(intent)
                    } catch (e: Exception) {
                        Log.d("MainActivity", "Could not launch battery optimization settings", e)
                    }
                }
            }
        }
    }

    private fun handleIntent(intent: Intent?) {
        val action = intent?.getStringExtra("action")
        val walkType = intent?.getStringExtra("walk_type")
        if (action == "verify_walk" && walkType != null) {
            pendingWalkReminder = walkType
            webView.post {
                webView.evaluateJavascript("javascript:if (window.triggerWalkReminder) { window.triggerWalkReminder('$walkType'); }", null)
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val permissionsToRequest = mutableListOf<String>()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION)
            != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACTIVITY_RECOGNITION)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION)
        }

        if (permissionsToRequest.isNotEmpty()) {
            requestPermissionLauncher.launch(permissionsToRequest.toTypedArray())
        } else {
            startStepCounterService()
        }
    }

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

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    inner class AndroidInterface(private val context: Context) {
        @JavascriptInterface
        fun isAndroid(): Boolean {
            return true
        }

        @JavascriptInterface
        fun isBatteryOptimizationIgnored(): Boolean {
            val pm = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pm.isIgnoringBatteryOptimizations(context.packageName)
            } else {
                true
            }
        }

        @JavascriptInterface
        fun requestIgnoreBatteryOptimizations() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
                if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
                    try {
                        val intent = Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = android.net.Uri.parse("package:${context.packageName}")
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        context.startActivity(intent)
                        Log.d("MainActivity", "Launched ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS dialog")
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        }

        @JavascriptInterface
        fun getPendingWalkReminder(): String? {
            val res = pendingWalkReminder
            pendingWalkReminder = null
            return res
        }

        @JavascriptInterface
        fun getPreferredTrackingMode(): String {
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            return prefs.getString("preferred_tracking_mode", "auto") ?: "auto"
        }

        @JavascriptInterface
        fun setPreferredTrackingMode(mode: String) {
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            prefs.edit().putString("preferred_tracking_mode", mode).apply()
        }

        @JavascriptInterface
        fun getAccelerometerThreshold(): Float {
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            return prefs.getFloat("sensor_accelerometer_threshold", 1.2f)
        }

        @JavascriptInterface
        fun setAccelerometerThreshold(threshold: Float) {
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            prefs.edit().putFloat("sensor_accelerometer_threshold", threshold).apply()
        }

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

        @JavascriptInterface
        fun setBatteryWarningDismissed(dismissed: Boolean) {
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("battery_opt_warning_dismissed", dismissed).apply()
        }

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

        @JavascriptInterface
        fun getStepsToday(): Int {
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            return prefs.getInt("steps_$todayStr", 0)
        }

        @JavascriptInterface
        fun getStepActivityInfo(): String {
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            val stepsToday = prefs.getInt("steps_$todayStr", 0)
            val trackingMode = prefs.getString("tracking_mode", "unknown") ?: "unknown"
            val lastStepEventTime = prefs.getLong("last_step_event_time", 0L)
            val lastStepEventSteps = prefs.getInt("last_step_event_steps", stepsToday)
            val lastStepEventDelta = prefs.getInt("last_step_event_delta", 0)

            return """{
                "stepsToday": $stepsToday,
                "trackingMode": "$trackingMode",
                "lastStepEventTime": $lastStepEventTime,
                "lastStepEventSteps": $lastStepEventSteps,
                "lastStepEventDelta": $lastStepEventDelta,
                "now": ${System.currentTimeMillis()}
            }""".trimIndent()
        }

        @JavascriptInterface
        fun saveStepsToday(steps: Int) {
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putInt("steps_$todayStr", steps)
                .putInt("last_calculated_steps", steps)
                .putBoolean("steps_rebaseline_requested", true)
                .apply()
        }

        @JavascriptInterface
        fun getAccelerometerSensitivity(): Float {
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            return prefs.getFloat("accel_sensitivity", 1.0f)
        }

        @JavascriptInterface
        fun setAccelerometerSensitivity(sensitivity: Float) {
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            prefs.edit().putFloat("accel_sensitivity", sensitivity).apply()
            Log.d("MainActivity", "Accelerometer sensitivity set to $sensitivity")
        }

        @JavascriptInterface
        fun resetStepsToday() {
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putInt("steps_$todayStr", 0)
                .putInt("last_calculated_steps", 0)
                .putInt("sensor_baseline", -1)
                .putInt("session_start_steps", 0)
                .putBoolean("steps_rebaseline_requested", true)
                .apply()
            Log.d("MainActivity", "Steps reset for $todayStr")
        }

        @JavascriptInterface
        fun getSensorDebugInfo(): String {
            val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as android.hardware.SensorManager
            val hasCounter = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_COUNTER, true) != null
                || sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_COUNTER, false) != null
            val hasDetector = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_DETECTOR, true) != null
                || sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_DETECTOR, false) != null
            val hasAccel = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_ACCELEROMETER) != null

            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            val trackingMode = prefs.getString("tracking_mode", "unknown") ?: "unknown"
            val sensitivity = prefs.getFloat("accel_sensitivity", 1.0f)
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val stepsToday = prefs.getInt("steps_$todayStr", 0)

            return """{
                "hasStepCounter": $hasCounter,
                "hasStepDetector": $hasDetector,
                "hasAccelerometer": $hasAccel,
                "trackingMode": "$trackingMode",
                "sensitivity": $sensitivity,
                "stepsToday": $stepsToday,
                "sdk": ${android.os.Build.VERSION.SDK_INT}
            }""".trimIndent()
        }

        @JavascriptInterface
        fun getDeviceInfo(): String {
            val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as android.hardware.SensorManager
            val hasCounter = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_COUNTER, true) != null
                || sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_COUNTER, false) != null
            val hasDetector = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_DETECTOR, true) != null
                || sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_DETECTOR, false) != null
            val hasAccel = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_ACCELEROMETER) != null
            
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            val trackingMode = prefs.getString("tracking_mode", "unknown") ?: "unknown"
            
            return """{
                "manufacturer": "${android.os.Build.MANUFACTURER}",
                "model": "${android.os.Build.MODEL}",
                "hasStepCounter": $hasCounter,
                "hasStepDetector": $hasDetector,
                "hasAccelerometer": $hasAccel,
                "trackingMode": "$trackingMode"
            }""".trimIndent()
        }



        @JavascriptInterface
        fun showNotification(title: String, message: String, walkType: String) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channelId = "WalkRemindersChannel"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "Walk Reminders",
                    NotificationManager.IMPORTANCE_HIGH
                )
                notificationManager.createNotificationChannel(channel)
            }

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("action", "verify_walk")
                putExtra("walk_type", walkType)
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val pendingIntent = PendingIntent.getActivity(
                context,
                walkType.hashCode(),
                intent,
                flags
            )

            val notification = NotificationCompat.Builder(context, channelId)
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()

            notificationManager.notify(walkType.hashCode(), notification)
        }
    }
}
