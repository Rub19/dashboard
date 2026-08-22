package dev.ethone.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

public class EthoneNotificationChannels {
    private final Context context;

    public EthoneNotificationChannels(Context context) {
        this.context = context;
    }

    public void create() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        // High priority reminders
        NotificationChannel reminders = new NotificationChannel(
            "ethone_reminders",
            context.getString(R.string.channel_reminders),
            NotificationManager.IMPORTANCE_HIGH
        );
        reminders.setDescription(context.getString(R.string.channel_reminders_desc));
        reminders.enableVibration(true);

        // Focus persistent
        NotificationChannel focus = new NotificationChannel(
            "ethone_focus",
            context.getString(R.string.channel_focus),
            NotificationManager.IMPORTANCE_LOW
        );
        focus.setDescription(context.getString(R.string.channel_focus_desc));
        focus.setSound(null, null);

        // Sync silent
        NotificationChannel sync = new NotificationChannel(
            "ethone_sync",
            context.getString(R.string.channel_sync),
            NotificationManager.IMPORTANCE_MIN
        );
        sync.setDescription(context.getString(R.string.channel_sync_desc));
        sync.setSound(null, null);
        sync.enableVibration(false);

        manager.createNotificationChannel(reminders);
        manager.createNotificationChannel(focus);
        manager.createNotificationChannel(sync);
    }
}
