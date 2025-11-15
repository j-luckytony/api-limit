/**
 * @fileoverview Main proxy endpoint with rate limiting
 * This is the root API that accepts tenant ID and API URL for rate limiting
 * @module app/api/proxy
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/utils';
import { z } from 'zod';

const proxyRequestSchema = z.object({
  tenantId: z.string().optional(),
  apiKey: z.string().optional(),
  apiUrl: z.string().url(),
  userId: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
});

/**
 * POST /api/proxy - Proxy API requests with rate limiting
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let tenantId: string | undefined;
  let apiUrl: string | undefined;

  try {
    const body = await request.json();
    const validatedData = proxyRequestSchema.parse(body);

    apiUrl = validatedData.apiUrl;

    // Find tenant by ID or API key
    let tenant;
    if (validatedData.tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: validatedData.tenantId, isActive: true },
      });
    } else if (validatedData.apiKey) {
      tenant = await prisma.tenant.findUnique({
        where: { apiKey: validatedData.apiKey, isActive: true },
      });
    } else {
      return NextResponse.json(
        { error: 'Either tenantId or apiKey is required' },
        { status: 400 }
      );
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      );
    }

    tenantId = tenant.id;

    // Get client IP and user ID
    const ipAddress = getClientIp(request);
    const userId = validatedData.userId;

    // Extract API path from URL
    let apiPath: string;
    try {
      const url = new URL(validatedData.apiUrl);
      apiPath = url.pathname;
    } catch {
      apiPath = validatedData.apiUrl;
    }

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(tenant.id, {
      ipAddress,
      userId,
      apiPath,
    });

    // Log the API request
    await prisma.apiLog.create({
      data: {
        tenantId: tenant.id,
        apiUrl: validatedData.apiUrl,
        ipAddress,
        userId,
        success: rateLimitResult.success,
        rateLimited: !rateLimitResult.success,
        statusCode: rateLimitResult.success ? undefined : 429,
      },
    });

    // If rate limited, return 429
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': (rateLimitResult.retryAfter || 60).toString(),
          },
        }
      );
    }

    // Make the actual API request
    try {
      const fetchOptions: RequestInit = {
        method: validatedData.method,
        headers: {
          'Content-Type': 'application/json',
          ...validatedData.headers,
        },
      };

      if (validatedData.body && validatedData.method !== 'GET') {
        fetchOptions.body = JSON.stringify(validatedData.body);
      }

      const response = await fetch(validatedData.apiUrl, fetchOptions);
      const responseData = await response.json().catch(() => ({}));

      // Update log with response status
      await prisma.apiLog.updateMany({
        where: {
          tenantId: tenant.id,
          apiUrl: validatedData.apiUrl,
          timestamp: {
            gte: new Date(startTime),
          },
        },
        data: {
          statusCode: response.status,
          success: response.ok,
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: responseData,
          statusCode: response.status,
          rateLimit: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset,
          },
        },
        {
          status: response.status,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    } catch (fetchError) {
      console.error('Error fetching API:', fetchError);
      
      return NextResponse.json(
        {
          error: 'Failed to fetch API',
          rateLimit: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset,
          },
        },
        {
          status: 502,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in proxy endpoint:', error);

    // Log failed request if we have tenant info
    if (tenantId && apiUrl) {
      await prisma.apiLog.create({
        data: {
          tenantId,
          apiUrl,
          ipAddress: getClientIp(request),
          success: false,
          statusCode: 500,
        },
      }).catch(console.error);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
