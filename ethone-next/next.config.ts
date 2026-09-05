import type { NextConfig } from "next";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

let packageVersion = "1.14.0";
try {
  const pkgPath = existsSync(join(__dirname, "package.json"))
    ? join(__dirname, "package.json")
    : existsSync(join(process.cwd(), "package.json"))
    ? join(process.cwd(), "package.json")
    : join(process.cwd(), "ethone-next", "package.json");
  if (existsSync(pkgPath)) {
    packageVersion = JSON.parse(readFileSync(pkgPath, "utf8")).version || "1.14.0";
  }
} catch {
  packageVersion = "1.14.0";
}

const commit =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  null;
const version = packageVersion || commit || Date.now().toString();

const publicDir = existsSync(join(__dirname, "public")) ? join(__dirname, "public") : join(process.cwd(), "public");
try {
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(
    join(publicDir, "version.json"),
    JSON.stringify({ version, commit, buildAt: new Date().toISOString() }, null, 2)
  );
} catch {}

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  allowedDevOrigins: ["127.0.0.1"],
  adapterPath: resolve(__dirname, "./scripts/build-adapter.js"),
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
