package dev.ethone.app;

import android.annotation.SuppressLint;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import androidx.core.content.ContextCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.material.color.DynamicColors;
import java.util.Arrays;

public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        registerPlugin(EthoneThemePlugin.class);
        registerPlugin(EthoneHapticsPlugin.class);
        super.load();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge immersive display
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(ContextCompat.getColor(this, android.R.color.transparent));
            window.setNavigationBarColor(ContextCompat.getColor(this, android.R.color.transparent));
        }
        WindowCompat.setDecorFitsSystemWindows(window, false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            DynamicColors.applyToActivitiesIfAvailable(getApplication());
        }

        // Ensure the WebView receives the latest insets for CSS env(safe-area-inset-*) values
        final View root = window.getDecorView().getRootView();
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> insets);

        registerAppShortcuts();
        startNotificationChannels();
    }

    @SuppressLint("NewApi")
    private void registerAppShortcuts() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return;
        ShortcutManager shortcutManager = getSystemService(ShortcutManager.class);
        if (shortcutManager == null) return;

        ShortcutInfo newNote = new ShortcutInfo.Builder(this, "new-note")
            .setShortLabel(getString(R.string.shortcut_new_note))
            .setLongLabel(getString(R.string.shortcut_new_note_long))
            .setIcon(Icon.createWithResource(this, android.R.drawable.ic_menu_edit))
            .setIntent(new android.content.Intent(android.content.Intent.ACTION_VIEW, null, this, MainActivity.class)
                .setData(android.net.Uri.parse("ethone:///notes?new=1"))
                .setAction(android.content.Intent.ACTION_VIEW))
            .build();

        ShortcutInfo focus = new ShortcutInfo.Builder(this, "start-focus")
            .setShortLabel(getString(R.string.shortcut_start_focus))
            .setLongLabel(getString(R.string.shortcut_start_focus_long))
            .setIcon(Icon.createWithResource(this, android.R.drawable.ic_media_play))
            .setIntent(new android.content.Intent(android.content.Intent.ACTION_VIEW, null, this, MainActivity.class)
                .setData(android.net.Uri.parse("ethone:///focus"))
                .setAction(android.content.Intent.ACTION_VIEW))
            .build();

        ShortcutInfo addTask = new ShortcutInfo.Builder(this, "add-task")
            .setShortLabel(getString(R.string.shortcut_add_task))
            .setLongLabel(getString(R.string.shortcut_add_task_long))
            .setIcon(Icon.createWithResource(this, android.R.drawable.ic_menu_add))
            .setIntent(new android.content.Intent(android.content.Intent.ACTION_VIEW, null, this, MainActivity.class)
                .setData(android.net.Uri.parse("ethone:///tasks?new=1"))
                .setAction(android.content.Intent.ACTION_VIEW))
            .build();

        ShortcutInfo search = new ShortcutInfo.Builder(this, "search")
            .setShortLabel(getString(R.string.shortcut_search))
            .setLongLabel(getString(R.string.shortcut_search_long))
            .setIcon(Icon.createWithResource(this, android.R.drawable.ic_menu_search))
            .setIntent(new android.content.Intent(android.content.Intent.ACTION_VIEW, null, this, MainActivity.class)
                .setData(android.net.Uri.parse("ethone:///"))
                .setAction("ethone.intent.action.OPEN_COMMAND"))
            .build();

        try {
            shortcutManager.setDynamicShortcuts(Arrays.asList(newNote, focus, addTask, search));
        } catch (Exception e) {
            Log.w("ETHONE", "Could not set app shortcuts", e);
        }
    }

    private void startNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            new EthoneNotificationChannels(this).create();
        }
    }

    @SuppressWarnings("unused")
    public int getStatusBarHeight() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return 0;
        return getWindow().getDecorView().getRootWindowInsets()
            .getInsets(WindowInsetsCompat.Type.statusBars()).top;
    }
}
