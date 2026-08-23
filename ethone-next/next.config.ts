import type { NextConfig } from "next";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, resolve } from "path";

const packageVersion = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")).version;
const commit =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  null;
const version = packageVersion || commit || Date.now().toString();

const publicDir = join(process.cwd(), "public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(
  join(publicDir, "version.json"),
  JSON.stringify({ version, commit, buildAt: new Date().toISOString() }, null, 2)
);

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  allowedDevOrigins: ["127.0.0.1"],
  adapterPath: resolve("./scripts/build-adapter.js"),
};

export default nextConfig;
