package dev.ethone.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import androidx.annotation.RequiresApi;

@RequiresApi(api = Build.VERSION_CODES.N)
public class FocusTileService extends TileService {

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        tile.setLabel(getString(R.string.tile_focus_label));
        tile.setContentDescription(getString(R.string.tile_focus_desc));
        tile.setState(Tile.STATE_INACTIVE);
        tile.updateTile();
    }

    @SuppressLint("NewApi")
    @Override
    public void onClick() {
        super.onClick();
        Tile tile = getQsTile();
        boolean active = tile.getState() == Tile.STATE_ACTIVE;
        tile.setState(active ? Tile.STATE_INACTIVE : Tile.STATE_ACTIVE);
        tile.updateTile();

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("ethone:///focus?toggle=tile"))
            .setPackage(getPackageName())
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivityAndCollapse(intent);
    }
}
