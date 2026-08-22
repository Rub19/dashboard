package dev.ethone.app.service

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import dev.ethone.app.MainActivity
import dev.ethone.app.R

class EthoneFocusTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.let {
            it.label = getString(R.string.tile_focus_label)
            it.contentDescription = getString(R.string.tile_focus_desc)
            it.icon = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.graphics.drawable.Icon.createWithResource(this, android.R.drawable.ic_media_play)
            } else null
            it.state = Tile.STATE_INACTIVE
            it.updateTile()
        }
    }

    override fun onClick() {
        super.onClick()
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data = android.net.Uri.parse("ethone:///focus")
        }
        val pending = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startActivityAndCollapse(pending)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}

class EthoneBrainTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.let {
            it.label = getString(R.string.shortcut_brain)
            it.contentDescription = getString(R.string.shortcut_brain_long)
            it.icon = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.graphics.drawable.Icon.createWithResource(this, android.R.drawable.ic_menu_add)
            } else null
            it.state = Tile.STATE_INACTIVE
            it.updateTile()
        }
    }

    override fun onClick() {
        super.onClick()
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data = android.net.Uri.parse("ethone:///brain?new=1")
        }
        val pending = PendingIntent.getActivity(
            this,
            1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startActivityAndCollapse(pending)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
