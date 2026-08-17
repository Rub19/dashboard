import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const version =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    Date.now().toString();

  return NextResponse.json(
    { version, buildAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
