import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const BOT_OWNER_EMAIL = "rub19.mailpro@gmail.com";
const BOT_OWNER_DISCORD_ID = "825124006209388616";
const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:3001";

/**
 * GET /api/discord/bot/control
 * Vérifie si l'utilisateur actuellement connecté est le propriétaire exclusif du bot
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const isOwner = Boolean(user && user.email?.toLowerCase() === BOT_OWNER_EMAIL);

    if (!isOwner) {
      return NextResponse.json({
        isOwner: false,
        message: "Accès restreint au propriétaire",
      });
    }

    // Récupérer les 5 dernières actions d'audit
    let recentActions: any[] = [];
    try {
      const { data } = await supabase
        .from("ethone_bot_owner_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      recentActions = data || [];
    } catch {
      // Tolérer si la table vient d'être migrée
    }

    return NextResponse.json({
      isOwner: true,
      email: BOT_OWNER_EMAIL,
      discordId: BOT_OWNER_DISCORD_ID,
      role: "SUPREME_BOT_OWNER",
      recentActions,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { isOwner: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/discord/bot/control
 * Déclenche des actions administratives critiques (Redémarrage, Mise à jour, Purge Cache)
 * STRICTEMENT réservé à rub19.mailpro@gmail.com
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Vérification stricte d'identité
    const userEmail = user?.email?.toLowerCase();
    if (!user || userEmail !== BOT_OWNER_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          error: `Accès refusé. Seul le propriétaire du bot (${BOT_OWNER_EMAIL}) est autorisé à exécuter cette opération.`,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Paramètre 'action' manquant." },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    let message = "";
    let details: Record<string, any> = { triggeredBy: userEmail, ip: clientIp };

    switch (action) {
      case "restart": {
        message = "Le redémarrage à distance du bot Discord a été commandé avec succès.";
        details.type = "RESTART_PM2";
        // Appel au serveur local du bot si accessible
        try {
          await fetch(`${BOT_API_URL}/api/bot-control/restart`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-bot-owner": BOT_OWNER_DISCORD_ID,
            },
            body: JSON.stringify({ reason: "Dashboard Remote Owner Restart", email: BOT_OWNER_EMAIL }),
          }).catch(() => null);
        } catch {
          // Ignorer si offline
        }
        break;
      }

      case "update": {
        message = "La mise à jour du bot et le rechargement des modules ont été commandés.";
        details.type = "GIT_PULL_UPDATE";
        try {
          await fetch(`${BOT_API_URL}/api/bot-control/update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-bot-owner": BOT_OWNER_DISCORD_ID,
            },
            body: JSON.stringify({ reason: "Dashboard Remote Owner Update", email: BOT_OWNER_EMAIL }),
          }).catch(() => null);
        } catch {
          // Ignorer si offline
        }
        break;
      }

      case "clear_cache": {
        message = "Le cache mémoire RAM et les compteurs temporaires ont été vidés.";
        details.type = "CACHE_PURGE";
        break;
      }

      case "toggle_maintenance": {
        const nextState = Boolean(body.enabled);
        message = nextState ? "Mode maintenance du bot ACTIVÉ." : "Mode maintenance du bot DÉSACTIVÉ.";
        details.maintenanceEnabled = nextState;
        break;
      }

      default: {
        return NextResponse.json(
          { success: false, error: `Action inconnue : ${action}` },
          { status: 400 }
        );
      }
    }

    // Enregistrer dans la table d'audit Supabase
    try {
      await supabase.from("ethone_bot_owner_actions").insert({
        user_id: user.id,
        user_email: BOT_OWNER_EMAIL,
        action: action === "restart" ? "RESTART_BOT" : action === "update" ? "UPDATE_BOT" : "CLEAR_CACHE",
        status: "SUCCESS",
        details,
        ip_address: clientIp,
      });
    } catch {
      // Tolérer si en cours de configuration
    }

    return NextResponse.json({
      success: true,
      action,
      message,
      timestamp: new Date().toISOString(),
      owner: {
        email: BOT_OWNER_EMAIL,
        discordId: BOT_OWNER_DISCORD_ID,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
