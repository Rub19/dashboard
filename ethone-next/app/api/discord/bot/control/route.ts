import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ethone-bot-control",
    owner: "rub19.mailpro@gmail.com",
    discordId: "825124006209388616",
    role: "SUPREME_BOT_OWNER",
  });
}

