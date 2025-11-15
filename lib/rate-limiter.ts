/**
 * @fileoverview Advanced rate limiting with Redis and database caching
 * @module lib/rate-limiter
 */

import { redis } from './redis';
import { prisma } from './prisma';
import { RateLimitType } from '@prisma/client';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  type: RateLimitType;
  apiPath?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Cache for tenant rate limit configurations to reduce database calls
 * Key: tenantId, Value: RateLimitConfig[]
 */
const configCache = new Map<string, { configs: RateLimitConfig[], timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get rate limit configurations for a tenant with caching
 */
async function getTenantRateLimits(tenantId: string): Promise<RateLimitConfig[]> {
  const cached = configCache.get(tenantId);
  const now = Date.now();

  // Return cached config if still valid
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.configs;
  }

  // Fetch from database
  const rateLimits = await prisma.rateLimit.findMany({
    where: {
      tenantId,
      isActive: true,
    },
  });

  const configs: RateLimitConfig[] = rateLimits.map(rl => ({
    maxRequests: rl.maxRequests,
    windowMs: rl.windowMs,
    type: rl.type,
    apiPath: rl.apiPath || undefined,
  }));

  // Update cache
  configCache.set(tenantId, { configs, timestamp: now });

  return configs;
}

/**
 * Generate Redis key for rate limiting
 */
function generateRedisKey(
  tenantId: string,
  type: RateLimitType,
  identifier: string,
  apiPath?: string
): string {
  const parts = ['rl', tenantId, type.toLowerCase()];
  
  if (type === 'API' && apiPath) {
    parts.push(apiPath.replace(/\//g, ':'));
  }
  
  parts.push(identifier);
  
  return parts.join(':');
}

/**
 * Sliding window rate limiter using Redis
 */
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry on the key
    pipeline.pexpire(key, windowMs);
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    // Get count before adding current request
    const count = (results[1][1] as number) || 0;
    const remaining = Math.max(0, maxRequests - count - 1);
    const success = count < maxRequests;
    
    const reset = now + windowMs;
    const retryAfter = success ? undefined : Math.ceil(windowMs / 1000);

    return {
      success,
      limit: maxRequests,
      remaining,
      reset,
      retryAfter,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if Redis is down
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests,
      reset: now + windowMs,
    };
  }
}

/**
 * Apply rate limiting for a tenant request
 */
export async function applyRateLimit(
  tenantId: string,
  options: {
    ipAddress?: string;
    userId?: string;
    apiPath?: string;
  }
): Promise<RateLimitResult> {
  const configs = await getTenantRateLimits(tenantId);

  if (configs.length === 0) {
    // No rate limits configured, allow request
    return {
      success: true,
      limit: 1000000, // Large number instead of Infinity
      remaining: 1000000,
      reset: Date.now() + 60000,
    };
  }

  // Group configs by type and find the most restrictive for each type
  const configsByType = new Map<string, RateLimitConfig>();
  
  for (const config of configs) {
    const typeKey = config.type + (config.apiPath || '');
    const existing = configsByType.get(typeKey);
    
    if (!existing || config.maxRequests < existing.maxRequests) {
      configsByType.set(typeKey, config);
    }
  }

  // Check all applicable rate limits using the most restrictive configs
  const results: RateLimitResult[] = [];

  for (const config of configsByType.values()) {
    let identifier: string;
    let shouldCheck = false;

    switch (config.type) {
      case 'GENERAL':
        identifier = 'general';
        shouldCheck = true;
        break;
      
      case 'IP':
        if (options.ipAddress) {
          identifier = options.ipAddress;
          shouldCheck = true;
        }
        break;
      
      case 'USER':
        if (options.userId) {
          identifier = options.userId;
          shouldCheck = true;
        }
        break;
      
      case 'API':
        if (options.apiPath && config.apiPath) {
          // Check if the API path matches
          if (options.apiPath === config.apiPath || options.apiPath.startsWith(config.apiPath)) {
            identifier = options.apiPath;
            shouldCheck = true;
          }
        }
        break;
    }

    if (shouldCheck) {
      const key = generateRedisKey(tenantId, config.type, identifier!, config.apiPath);
      const result = await checkRateLimit(key, config.maxRequests, config.windowMs);
      results.push(result);
    }
  }

  // If any rate limit fails, return the most restrictive one
  const failedResult = results.find(r => !r.success);
  if (failedResult) {
    return failedResult;
  }

  // Return the most restrictive successful result
  if (results.length > 0) {
    return results.reduce((prev, curr) => 
      curr.remaining < prev.remaining ? curr : prev
    );
  }

  // No applicable rate limits
  return {
    success: true,
    limit: 1000000, // Large number instead of Infinity
    remaining: 1000000,
    reset: Date.now() + 60000,
  };
}

/**
 * Invalidate cache for a tenant (call when rate limits are updated)
 */
export function invalidateTenantCache(tenantId: string): void {
  configCache.delete(tenantId);
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  configCache.clear();
}
