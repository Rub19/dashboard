package dev.ethone.app;

import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EthoneFocus")
public class EthoneFocusServicePlugin extends Plugin {

    @PluginMethod
    public void setFocusState(PluginCall call) {
        boolean active = call.getBoolean("active", false);
        long duration = call.getInt("durationMinutes", 25) * 60 * 1000L;
        if (active) {
            Intent intent = new Intent(getContext(), EthoneFocusForegroundService.class);
            intent.putExtra("durationMillis", duration);
            ContextCompat.startForegroundService(getContext(), intent);
        } else {
            Intent intent = new Intent(getContext(), EthoneFocusForegroundService.class);
            intent.setAction("STOP");
            ContextCompat.startForegroundService(getContext(), intent);
        }
        call.resolve(new JSObject().put("active", active));
    }

    @PluginMethod
    public void setPresence(PluginCall call) {
        String presence = call.getString("presence", "En ligne");
        getContext().getSharedPreferences("ethone_focus", Context.MODE_PRIVATE)
            .edit()
            .putString("presence", presence)
            .apply();
        call.resolve(new JSObject().put("presence", presence));
    }

    @PluginMethod
    public void getFocusState(PluginCall call) {
        call.resolve(new JSObject()
            .put("active", false)
            .put("presence", getContext().getSharedPreferences("ethone_focus", Context.MODE_PRIVATE)
                .getString("presence", "En ligne")));
    }
}
