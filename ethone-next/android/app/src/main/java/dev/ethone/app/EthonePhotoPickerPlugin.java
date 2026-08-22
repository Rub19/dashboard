package dev.ethone.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "EthonePhotoPicker")
public class EthonePhotoPickerPlugin extends Plugin {

    private ActivityResultLauncher<PickVisualMediaRequest> singleLauncher;
    private ActivityResultLauncher<PickVisualMediaRequest> multipleLauncher;
    private PluginCall pendingCall;

    @Override
    public void load() {
        singleLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.PickVisualMedia(),
            result -> {
                if (pendingCall == null) return;
                if (result != null) {
                    pendingCall.resolve(new JSObject().put("uris", new JSArray().put(result.toString())));
                } else {
                    pendingCall.reject("No selection");
                }
                pendingCall = null;
            }
        );

        multipleLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.PickMultipleVisualMedia(),
            result -> {
                if (pendingCall == null) return;
                if (result != null && !result.isEmpty()) {
                    JSArray arr = new JSArray();
                    for (Uri uri : result) {
                        arr.put(uri.toString());
                    }
                    pendingCall.resolve(new JSObject().put("uris", arr));
                } else {
                    pendingCall.reject("No selection");
                }
                pendingCall = null;
            }
        );
    }

    @PluginMethod
    public void pickPhoto(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            call.reject("Photo Picker requires Android 14+");
            return;
        }
        if (singleLauncher == null) {
            call.reject("Launcher not available");
            return;
        }
        pendingCall = call;
        singleLauncher.launch(new PickVisualMediaRequest.Builder()
            .setMediaType(ActivityResultContracts.PickVisualMedia.ImageAndVideo.INSTANCE)
            .build());
    }

    @PluginMethod
    public void pickMultiplePhotos(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            call.reject("Photo Picker requires Android 14+");
            return;
        }
        int limit = call.getInt("limit", 10);
        if (multipleLauncher == null) {
            call.reject("Launcher not available");
            return;
        }
        pendingCall = call;
        multipleLauncher.launch(new PickVisualMediaRequest.Builder()
            .setMediaType(ActivityResultContracts.PickVisualMedia.ImageAndVideo.INSTANCE)
            .build());
    }
}
