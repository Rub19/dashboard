package dev.ethone.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.google.android.material.color.DynamicColors;
import com.google.android.material.color.MaterialColors;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EthoneTheme")
public class EthoneThemePlugin extends Plugin {

    private static final String[] ATTRS = {
        "colorPrimary",
        "colorPrimaryContainer",
        "colorOnPrimaryContainer",
        "colorSecondary",
        "colorSecondaryContainer",
        "colorOnSecondaryContainer",
        "colorTertiary",
        "colorTertiaryContainer",
        "colorSurface",
        "colorSurfaceVariant",
        "colorOnSurface",
        "colorOnSurfaceVariant",
        "colorBackground",
        "colorOutline",
        "colorError",
        "colorOnError",
    };

    @PluginMethod
    public void getMaterialColors(PluginCall call) {
        new Handler(Looper.getMainLooper()).post(() -> {
            JSObject ret = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                ret.put("supported", true);
                for (String attr : ATTRS) {
                    ret.put(camelToSnake(attr), resolveColor(attr));
                }
                ret.put("isDynamic", DynamicColors.isDynamicColorAvailable());
            } else {
                ret.put("supported", false);
            }
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void applyDynamicColors(PluginCall call) {
        new Handler(Looper.getMainLooper()).post(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && DynamicColors.isDynamicColorAvailable()) {
                DynamicColors.applyToActivitiesIfAvailable(getActivity().getApplication());
            }
            call.resolve();
        });
    }

    private String resolveColor(String attr) {
        try {
            int resId = getContext().getResources().getIdentifier(attr, "attr", getContext().getPackageName());
            int color = MaterialColors.getColor(getContext(), resId, 0);
            return String.format("#%06X", (0xFFFFFF & color));
        } catch (Exception e) {
            return "#000000";
        }
    }

    private String camelToSnake(String input) {
        StringBuilder sb = new StringBuilder();
        for (char c : input.toCharArray()) {
            if (Character.isUpperCase(c) && sb.length() > 0) sb.append("-");
            sb.append(Character.toLowerCase(c));
        }
        return sb.toString();
    }
}
