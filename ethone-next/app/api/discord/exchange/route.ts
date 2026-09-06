import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, clientId, redirectUri, clientSecret } = body;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const effectiveSecret =
      clientSecret ||
      process.env.DISCORD_CLIENT_SECRET ||
      "9MiLY0V9XQ36CTiQHFK4n1hQigmSRO3w";

    const effectiveClientId =
      clientId ||
      process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
      "1545139931154878464";

    const effectiveRedirectUri =
      redirectUri ||
      (process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/` : "https://ethone.dev/");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: String(code),
      redirect_uri: effectiveRedirectUri,
      client_id: effectiveClientId,
      client_secret: effectiveSecret,
    });

    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: tokenData.error_description || tokenData.error || "Discord token exchange failed" },
        { status: tokenRes.status }
      );
    }

    let user = null;
    if (tokenData.access_token) {
      try {
        const userRes = await fetch("https://discord.com/api/v10/users/@me", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        if (userRes.ok) {
          user = await userRes.json();
        }
      } catch (e) {
        console.warn("Failed to fetch Discord @me:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...tokenData,
        user,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
