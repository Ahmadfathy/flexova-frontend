import type { NextConfig } from "next";
import path from "node:path";

// Next.js always runs next.config.ts with cwd = this app's own directory
// (apps/storefront), whether invoked directly or via `pnpm --filter`/turbo.
// Using process.cwd() instead of import.meta.url keeps this file loadable
// regardless of how Next's config loader compiles it (CJS vs ESM).
const appDir = process.cwd();

const nextConfig: NextConfig = {
  // Standalone server output for the Docker image (docker-compose.yml /
  // apps/storefront/Dockerfile) — copies only the traced production deps.
  output: "standalone",

  // Monorepo: trace file dependencies from the workspace root, not this
  // app's own folder, so pnpm's hoisted/symlinked node_modules resolve
  // correctly in the standalone build.
  outputFileTracingRoot: path.join(appDir, "../../"),

  // Redis-backed cache handler (lib/cache/redis-handler.mjs) — see that
  // file for why. cacheMaxMemorySize: 0 disables Next's default in-memory
  // LRU cache in front of it, so every instance reads/writes Redis
  // directly and tag invalidation is visible to all instances immediately.
  cacheHandler: path.resolve(appDir, "lib/cache/redis-handler.mjs"),
  cacheMaxMemorySize: 0,
};

export default nextConfig;
