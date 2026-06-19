package com.example.fittracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class StepCounterRestartReceiver : BroadcastReceiver() {
    private val TAG = "StepCounterRestart"

    override fun onReceive(context: Context, intent: Intent?) {
        Log.d(TAG, "onReceive triggered with action: ${intent?.action}")
        val prefs = context.getSharedPreferences("FitTrackerPrefs", Context.MODE_PRIVATE)
        val strategy = prefs.getString("step_tracking_strategy", "background") ?: "background"
        if (strategy != "background") {
            Log.d(TAG, "Step tracking strategy is $strategy. Ignoring restart broadcast.")
            return
        }
        
        val serviceIntent = Intent(context, StepCounterService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.d(TAG, "StepCounterService start command issued successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start StepCounterService on broadcast receive", e)
        }
    }
}
