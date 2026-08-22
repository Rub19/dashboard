package dev.ethone.app.service

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import dev.ethone.app.R

object LocalNotificationManager {

    private const val CHANNEL_ID_FOCUS = "ethone_focus"
    private const val CHANNEL_ID_REMINDERS = "ethone_reminders"
    private const val ACTION_FOCUS_END = "dev.ethone.app.FOCUS_END"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val focus = NotificationChannel(
                CHANNEL_ID_FOCUS,
                context.getString(R.string.channel_focus),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = context.getString(R.string.channel_focus_desc)
            }
            val reminders = NotificationChannel(
                CHANNEL_ID_REMINDERS,
                context.getString(R.string.channel_reminders),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = context.getString(R.string.channel_reminders_desc)
            }

            val manager = context.getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannels(listOf(focus, reminders))
        }
    }

    fun scheduleFocusEnd(delaySeconds: Long) {
        val context = applicationContext ?: return
        val intent = Intent(context, NotificationReceiver::class.java).apply {
            action = ACTION_FOCUS_END
        }
        val pending = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val triggerAt = SystemClock.elapsedRealtime() + (delaySeconds * 1000)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pending)
        } else {
            alarmManager.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pending)
        }
    }

    fun cancelFocusEnd() {
        val context = applicationContext ?: return
        val intent = Intent(context, NotificationReceiver::class.java).apply {
            action = ACTION_FOCUS_END
        }
        val pending = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (pending != null) {
            alarmManager.cancel(pending)
            pending.cancel()
        }
    }

    fun showTaskReminder(context: Context, title: String) {
        val builder = NotificationCompat.Builder(context, CHANNEL_ID_REMINDERS)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle("Rappel de tâche")
            .setContentText(title)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)

        NotificationManagerCompat.from(context).notify(title.hashCode(), builder.build())
    }

    private var applicationContext: Context? = null

    fun initContext(context: Context) {
        applicationContext = context.applicationContext
    }

    class NotificationReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent?) {
            if (intent?.action == ACTION_FOCUS_END) {
                val builder = NotificationCompat.Builder(context, CHANNEL_ID_FOCUS)
                    .setSmallIcon(android.R.drawable.ic_popup_reminder)
                    .setContentTitle("Session Focus terminée")
                    .setContentText("Prenez une pause.")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                NotificationManagerCompat.from(context).notify(1001, builder.build())
            }
        }
    }
}
