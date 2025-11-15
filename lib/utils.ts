/**
 * @fileoverview Utility functions
 * @module lib/utils
 */

import { NextRequest } from 'next/server';

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Format time window in human-readable format
 */
export function formatTimeWindow(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Parse time window string to milliseconds
 */
export function parseTimeWindow(value: string, unit: 'seconds' | 'minutes' | 'hours' | 'days'): number {
  const num = parseInt(value);
  if (isNaN(num)) return 60000; // default 1 minute

  switch (unit) {
    case 'seconds':
      return num * 1000;
    case 'minutes':
      return num * 60 * 1000;
    case 'hours':
      return num * 60 * 60 * 1000;
    case 'days':
      return num * 24 * 60 * 60 * 1000;
    default:
      return num * 60 * 1000;
  }
}
