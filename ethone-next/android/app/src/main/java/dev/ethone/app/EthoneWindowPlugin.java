package dev.ethone.app;

import android.content.Context;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.util.Consumer;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.ProcessLifecycleOwner;
import androidx.window.core.layout.WindowHeightSizeClass;
import androidx.window.core.layout.WindowSizeClass;
import androidx.window.core.layout.WindowWidthSizeClass;
import androidx.window.java.layout.WindowInfoTracker;
import androidx.window.layout.DisplayFeature;
import androidx.window.layout.FoldingFeature;
import androidx.window.layout.WindowLayoutInfo;
import androidx.window.layout.WindowMetrics;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "EthoneWindow")
public class EthoneWindowPlugin extends Plugin {

    private Executor executor = Executors.newSingleThreadExecutor();
    private androidx.core.util.Consumer<WindowLayoutInfo> layoutConsumer;

    @Override
    public void load() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;

        WindowInfoTracker tracker = WindowInfoTracker.Companion.getOrCreate(getContext());
        layoutConsumer = new androidx.core.util.Consumer<WindowLayoutInfo>() {
            @Override
            public void accept(WindowLayoutInfo info) {
                notifyLayout(info);
            }
        };
        tracker.addWindowLayoutInfoListener(getActivity(), executor, layoutConsumer);
    }

    @Override
    public void handleOnDestroy() {
        if (layoutConsumer != null) {
            WindowInfoTracker tracker = WindowInfoTracker.Companion.getOrCreate(getContext());
            tracker.removeWindowLayoutInfoListener(layoutConsumer);
        }
    }

    @PluginMethod
    public void getWindowLayout(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            call.resolve(new JSObject().put("deviceType", "phone"));
            return;
        }

        WindowMetrics metrics = androidx.window.layout.WindowMetricsCalculator.getOrCreate().computeCurrentWindowMetrics(getActivity());
        int widthPx = metrics.getBounds().width();
        int heightPx = metrics.getBounds().height();
        float density = getContext().getResources().getDisplayMetrics().density;
        int widthDp = (int) (widthPx / density);
        int heightDp = (int) (heightPx / density);

        WindowSizeClass sizeClass = WindowSizeClass.Companion.compute(widthDp, heightDp);
        String deviceType = "phone";
        if (widthDp >= 600 || heightDp >= 600) {
            deviceType = widthDp > heightDp ? "tablet" : "foldable";
        }

        JSObject ret = new JSObject();
        ret.put("deviceType", deviceType);
        ret.put("widthDp", widthDp);
        ret.put("heightDp", heightDp);
        ret.put("sizeClassWidth", sizeClass.getWindowWidthSizeClass().toString());
        ret.put("sizeClassHeight", sizeClass.getWindowHeightSizeClass().toString());
        call.resolve(ret);
    }

    private void notifyLayout(WindowLayoutInfo info) {
        List<DisplayFeature> features = info.getDisplayFeatures();
        boolean isTableTop = false;
        boolean isHalfOpen = false;

        for (DisplayFeature feature : features) {
            if (feature instanceof FoldingFeature) {
                FoldingFeature folding = (FoldingFeature) feature;
                FoldingFeature.State state = folding.getState();
                isHalfOpen = state == FoldingFeature.State.HALF_OPENED;
                isTableTop = folding.getOrientation() == FoldingFeature.Orientation.HORIZONTAL && isHalfOpen;
            }
        }

        JSObject ret = new JSObject();
        ret.put("isTableTop", isTableTop);
        ret.put("isHalfOpen", isHalfOpen);
        ret.put("hasFold", !features.isEmpty());
        notifyListeners("windowLayoutChanged", ret);
    }
}
