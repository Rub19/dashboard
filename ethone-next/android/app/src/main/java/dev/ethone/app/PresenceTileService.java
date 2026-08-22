package dev.ethone.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import androidx.annotation.RequiresApi;

@RequiresApi(api = Build.VERSION_CODES.N)
public class PresenceTileService extends TileService {

    private static final String[] STATUSES = {"online", "focus", "busy", "invisible"};
    private int currentStatus = 0;

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        tile.setLabel(getString(R.string.tile_presence_label));
        tile.setContentDescription(getString(R.string.tile_presence_desc));
        tile.setState(Tile.STATE_ACTIVE);
        tile.updateTile();
    }

    @SuppressLint("NewApi")
    @Override
    public void onClick() {
        super.onClick();
        currentStatus = (currentStatus + 1) % STATUSES.length;
        String status = STATUSES[currentStatus];

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("ethone:///system?status=" + status))
            .setPackage(getPackageName())
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivityAndCollapse(intent);
    }
}
