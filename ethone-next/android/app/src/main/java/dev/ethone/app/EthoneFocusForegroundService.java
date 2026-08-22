package dev.ethone.app;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

public class EthoneFocusForegroundService extends Service {

    private static final int NOTIFICATION_ID = 0xF0C5;
    private static final String CHANNEL_ID = "ethone_focus";

    private CountDownTimer timer;
    private long durationMillis = 25 * 60 * 1000L;
    private long remainingMillis = durationMillis;
    private boolean isPaused = false;

    @Override
    public void onCreate() {
        super.onCreate();
        new EthoneNotificationChannels(this).create();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();
        if ("STOP".equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if ("PAUSE".equals(action)) {
            isPaused = !isPaused;
            if (isPaused) {
                if (timer != null) timer.cancel();
            } else {
                startTimer(remainingMillis);
            }
            updateNotification();
            return START_STICKY;
        }
        if ("COMPLETE".equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        durationMillis = intent.getLongExtra("durationMillis", durationMillis);
        remainingMillis = durationMillis;

        startForeground(NOTIFICATION_ID, buildNotification());
        startTimer(remainingMillis);
        return START_STICKY;
    }

    private void startTimer(long millis) {
        if (timer != null) timer.cancel();
        timer = new CountDownTimer(millis, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                remainingMillis = millisUntilFinished;
                updateNotification();
            }

            @Override
            public void onFinish() {
                remainingMillis = 0;
                updateNotification();
            }
        }.start();
    }

    private Notification buildNotification() {
        Intent openApp = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, openApp, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent pauseIntent = new Intent(this, EthoneFocusForegroundService.class).setAction("PAUSE");
        PendingIntent pausePending = PendingIntent.getService(this, 1, pauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, EthoneFocusForegroundService.class).setAction("STOP");
        PendingIntent stopPending = PendingIntent.getService(this, 2, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent completeIntent = new Intent(this, EthoneFocusForegroundService.class).setAction("COMPLETE");
        PendingIntent completePending = PendingIntent.getService(this, 3, completeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        int progress = durationMillis > 0 ? (int) (((durationMillis - remainingMillis) * 100) / durationMillis) : 0;
        String timeText = formatTime(remainingMillis);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentTitle("ETHONE Focus")
            .setContentText(timeText + " restant")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(contentIntent)
            .setProgress(100, progress, false)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setWhen(System.currentTimeMillis() + remainingMillis)
            .addAction(R.drawable.ic_launcher_monochrome, isPaused ? "Reprendre" : "Pause", pausePending)
            .addAction(R.drawable.ic_launcher_monochrome, "Arrêter", stopPending)
            .addAction(R.drawable.ic_launcher_monochrome, "Terminer", completePending)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    private void updateNotification() {
        NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, buildNotification());
    }

    private String formatTime(long millis) {
        long minutes = (millis / 1000) / 60;
        long seconds = (millis / 1000) % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }

    @Override
    public void onDestroy() {
        if (timer != null) timer.cancel();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
