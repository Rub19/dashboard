package dev.ethone.app;

import android.app.Activity;
import android.os.Build;
import android.view.WindowManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EthoneSecurity")
public class EthoneSecurityPlugin extends Plugin {

    private boolean secureMode = false;

    @PluginMethod
    public void setSecureFlag(PluginCall call) {
        boolean secure = call.getBoolean("secure", false);
        secureMode = secure;
        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (secure) {
                    getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                } else {
                    getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void clearClipboard(PluginCall call) {
        ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) {
            cm.setPrimaryClip(ClipData.newPlainText("", ""));
        }
        call.resolve();
    }

    @PluginMethod
    public void isScreenRecording(PluginCall call) {
        call.resolve(new com.getcapacitor.JSObject().put("recording", false));
    }
}
