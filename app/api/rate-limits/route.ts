/**
 * @fileoverview API routes for rate limit configuration management
 * @module app/api/rate-limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateTenantCache } from '@/lib/rate-limiter';
import { z } from 'zod';
import { RateLimitType } from '@prisma/client';

const createRateLimitSchema = z.object({
  tenantId: z.string(),
  type: z.enum(['GENERAL', 'IP', 'API', 'USER']),
  maxRequests: z.number().int().positive(),
  windowMs: z.number().int().positive(),
  apiPath: z.string().optional(),
});

/**
 * POST /api/rate-limits - Create a new rate limit configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRateLimitSchema.parse(body);

    // Validate that API type has apiPath
    if (validatedData.type === 'API' && !validatedData.apiPath) {
      return NextResponse.json(
        { error: 'API type rate limit requires apiPath' },
        { status: 400 }
      );
    }

    // Check for existing rate limit of the same type and API path
    const existingRateLimit = await prisma.rateLimit.findFirst({
      where: {
        tenantId: validatedData.tenantId,
        type: validatedData.type as RateLimitType,
        apiPath: validatedData.apiPath || null,
        isActive: true,
      },
    });

    if (existingRateLimit) {
      const duplicateType = validatedData.type === 'API' 
        ? `${validatedData.type} (${validatedData.apiPath})`
        : validatedData.type;
      
      return NextResponse.json(
        { error: `A rate limit of type "${duplicateType}" already exists for this tenant. Please update the existing one or delete it first.` },
        { status: 409 }
      );
    }

    const rateLimit = await prisma.rateLimit.create({
      data: {
        tenantId: validatedData.tenantId,
        type: validatedData.type as RateLimitType,
        maxRequests: validatedData.maxRequests,
        windowMs: validatedData.windowMs,
        apiPath: validatedData.apiPath,
      },
    });

    // Invalidate cache for this tenant
    invalidateTenantCache(validatedData.tenantId);

    return NextResponse.json({ rateLimit }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating rate limit:', error);
    return NextResponse.json(
      { error: 'Failed to create rate limit' },
      { status: 500 }
    );
  }
}
