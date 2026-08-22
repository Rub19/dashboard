package dev.ethone.app;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "EthoneHaptics")
public class EthoneHapticsPlugin extends Plugin {

    private Vibrator getVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vm != null) return vm.getDefaultVibrator();
        }
        return (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void waveform(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve();
            return;
        }

        JSONArray timings = call.getArray("timings");
        JSONArray amplitudes = call.getArray("amplitudes");
        if (timings == null || amplitudes == null) {
            call.reject("Missing timings or amplitudes");
            return;
        }

        long[] timingsArr = new long[timings.length()];
        int[] amplitudesArr = new int[amplitudes.length()];
        try {
            for (int i = 0; i < timings.length(); i++) {
                timingsArr[i] = timings.getLong(i);
            }
            for (int i = 0; i < amplitudes.length(); i++) {
                amplitudesArr[i] = amplitudes.getInt(i);
            }
        } catch (Exception e) {
            call.reject("Invalid waveform arrays");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            VibrationEffect effect = VibrationEffect.createWaveform(timingsArr, amplitudesArr, -1);
            vibrator.vibrate(effect);
        } else {
            vibrator.vibrate(timingsArr, -1);
        }
        call.resolve();
    }

    @PluginMethod
    public void predefined(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve();
            return;
        }

        String effectName = call.getString("effect", "click");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int effectId;
            switch (effectName) {
                case "tick":
                    effectId = VibrationEffect.EFFECT_TICK;
                    break;
                case "click":
                    effectId = VibrationEffect.EFFECT_CLICK;
                    break;
                case "heavy":
                    effectId = VibrationEffect.EFFECT_HEAVY_CLICK;
                    break;
                case "double":
                    effectId = VibrationEffect.EFFECT_DOUBLE_CLICK;
                    break;
                default:
                    effectId = VibrationEffect.EFFECT_CLICK;
            }
            vibrator.vibrate(VibrationEffect.createPredefined(effectId));
        }
        call.resolve();
    }
}
