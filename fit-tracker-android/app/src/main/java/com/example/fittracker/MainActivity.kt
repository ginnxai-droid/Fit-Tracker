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
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
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

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val activityGranted = permissions[Manifest.permission.ACTIVITY_RECOGNITION] ?: false
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

        if (permissionsToRequest.isNotEmpty()) {
            requestPermissionLauncher.launch(permissionsToRequest.toTypedArray())
        } else {
            startStepCounterService()
        }
    }

    private fun startStepCounterService() {
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
        fun getPendingWalkReminder(): String? {
            val res = pendingWalkReminder
            pendingWalkReminder = null
            return res
        }

        @JavascriptInterface
        fun getStepsToday(): Int {
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            return prefs.getInt("steps_$todayStr", 0)
        }

        @JavascriptInterface
        fun saveStepsToday(steps: Int) {
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
            prefs.edit().putInt("steps_$todayStr", steps).apply()
        }

        @JavascriptInterface
        fun getDeviceInfo(): String {
            val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as android.hardware.SensorManager
            val hasCounter = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_COUNTER) != null
            val hasDetector = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_STEP_DETECTOR) != null
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
