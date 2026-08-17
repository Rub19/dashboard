import type { NextConfig } from "next";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const version =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  Date.now().toString();

const publicDir = join(process.cwd(), "public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(
  join(publicDir, "version.json"),
  JSON.stringify({ version, buildAt: new Date().toISOString() }, null, 2)
);

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
