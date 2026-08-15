// apps/storefront/lib/cache/redis-handler.mjs
//
// Custom Next.js cache handler backed by Redis — replaces the default
// filesystem/in-memory ISR + data-cache implementation so that:
//   - ISR pages and `fetch()`/`unstable_cache` data are cached in Redis,
//     shared across every storefront container instance (not per-process).
//   - `revalidateTag()` (called by the admin's revalidation hook / ERP
//     webhooks) invalidates the tag everywhere at once, instead of only
//     the instance that happened to serve the mutating request.
//
// Wired via `cacheHandler` in next.config.ts, with `cacheMaxMemorySize: 0`
// to disable Next's in-memory LRU layer in front of it — every read/write
// goes through Redis, which is the point in a horizontally-scaled deploy.
//
// Written as plain ESM (.mjs), not TypeScript: Next.js loads this file
// directly (outside the app's own TS/webpack compilation), so it must be
// runnable as-is in both `next dev` and the standalone server.

import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_PREFIX = "flexova:cache:";
const TAG_PREFIX = "flexova:tag:";

// One connection per server process (dev, build worker, or standalone
// server) — ioredis handles reconnects on its own.
//
// enableOfflineQueue:false + a short connectTimeout + maxRetriesPerRequest:1
// are deliberate: without them, a command issued while Redis is unreachable
// gets *queued* and waits through several reconnect/backoff cycles before
// failing (discovered chasing a real bug in S4 — a live re-check call was
// silently hanging for 60s+ with no Redis running, instead of the "degrades
// gracefully" behavior this handler documents above). With these set, an
// unreachable Redis fails a get()/set() almost immediately, so a page/action
// still degrades to "cache miss" fast instead of hanging the whole request.
const redis = new Redis(REDIS_URL, {
  lazyConnect: false,
  connectTimeout: 1000,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on("error", (err) => {
  // Never let a Redis blip crash page rendering — log and let get()/set()
  // degrade to "cache miss" below instead of throwing.
  console.error("[redis-cache-handler] redis connection error:", err.message);
});

export default class RedisCacheHandler {
  constructor(options) {
    this.options = options ?? {};
  }

  /** @param {string} key */
  async get(key) {
    try {
      const raw = await redis.get(CACHE_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error("[redis-cache-handler] get failed:", err.message);
      return null;
    }
  }

  /**
   * @param {string} key
   * @param {unknown} data
   * @param {{ tags?: string[] }} [ctx]
   */
  async set(key, data, ctx) {
    const tags = ctx?.tags ?? [];
    const entry = {
      value: data,
      lastModified: Date.now(),
      tags,
    };
    try {
      await redis.set(CACHE_PREFIX + key, JSON.stringify(entry));
      if (tags.length) {
        const pipeline = redis.pipeline();
        for (const tag of tags) {
          pipeline.sadd(TAG_PREFIX + tag, key);
        }
        await pipeline.exec();
      }
    } catch (err) {
      console.error("[redis-cache-handler] set failed:", err.message);
    }
  }

  /** @param {string | string[]} tagOrTags */
  async revalidateTag(tagOrTags) {
    const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags];
    try {
      for (const tag of tags) {
        const keys = await redis.smembers(TAG_PREFIX + tag);
        if (keys.length) {
          await redis.del(...keys.map((k) => CACHE_PREFIX + k));
        }
        await redis.del(TAG_PREFIX + tag);
      }
    } catch (err) {
      console.error("[redis-cache-handler] revalidateTag failed:", err.message);
    }
  }

  // Some Next.js versions probe for `resetRequestCache` between requests
  // during dev; it's a per-request in-memory step (not the shared cache),
  // so it's a safe no-op here.
  resetRequestCache() {}
}
