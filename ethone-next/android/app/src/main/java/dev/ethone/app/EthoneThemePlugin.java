package dev.ethone.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EthoneTheme")
public class EthoneThemePlugin extends Plugin {

    @PluginMethod
    public void getMaterialColors(PluginCall call) {
        new Handler(Looper.getMainLooper()).post(() -> {
            JSObject ret = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                ret.put("supported", true);
                ret.put("primary", intToHex(android.R.attr.colorPrimary));
                ret.put("primaryContainer", intToHex(android.R.attr.colorPrimaryContainer));
                ret.put("secondary", intToHex(android.R.attr.colorSecondary));
                ret.put("tertiary", intToHex(android.R.attr.colorTertiary));
                ret.put("surface", intToHex(android.R.attr.colorSurface));
                ret.put("surfaceVariant", intToHex(android.R.attr.colorSurfaceVariant));
                ret.put("onSurface", intToHex(android.R.attr.colorOnSurface));
                ret.put("background", intToHex(android.R.attr.colorBackground));
            } else {
                ret.put("supported", false);
            }
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void applyDynamicColors(PluginCall call) {
        new Handler(Looper.getMainLooper()).post(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                getActivity().getWindow().getDecorView().post(() -> {
                    android.util.Log.d("ETHONE", "Dynamic colors should be handled by the web layer");
                });
            }
            call.resolve();
        });
    }

    private String intToHex(int attr) {
        try {
            android.util.TypedValue typedValue = new android.util.TypedValue();
            getContext().getTheme().resolveAttribute(attr, typedValue, true);
            return String.format("#%06X", (0xFFFFFF & typedValue.data));
        } catch (Exception e) {
            return "#000000";
        }
    }
}
