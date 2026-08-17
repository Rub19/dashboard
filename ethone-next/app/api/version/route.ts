import { NextResponse } from "next/server";
import packageJson from "../../../package.json";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const version = packageJson.version;
  const commit =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    null;

  return NextResponse.json(
    { version, commit, buildAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
