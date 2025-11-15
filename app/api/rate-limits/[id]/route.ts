/**
 * @fileoverview API routes for individual rate limit operations
 * @module app/api/rate-limits/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateTenantCache } from '@/lib/rate-limiter';
import { z } from 'zod';
import { RateLimitType } from '@prisma/client';

const updateRateLimitSchema = z.object({
  type: z.enum(['GENERAL', 'IP', 'API', 'USER']).optional(),
  maxRequests: z.number().int().positive().optional(),
  windowMs: z.number().int().positive().optional(),
  apiPath: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/rate-limits/[id] - Update rate limit configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateRateLimitSchema.parse(body);

    const rateLimit = await prisma.rateLimit.update({
      where: { id },
      data: validatedData,
    });

    // Invalidate cache for this tenant
    invalidateTenantCache(rateLimit.tenantId);

    return NextResponse.json({ rateLimit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating rate limit:', error);
    return NextResponse.json(
      { error: 'Failed to update rate limit' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rate-limits/[id] - Delete rate limit configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rateLimit = await prisma.rateLimit.delete({
      where: { id },
    });

    // Invalidate cache for this tenant
    invalidateTenantCache(rateLimit.tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rate limit:', error);
    return NextResponse.json(
      { error: 'Failed to delete rate limit' },
      { status: 500 }
    );
  }
}
