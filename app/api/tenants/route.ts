/**
 * @fileoverview API routes for tenant management
 * @module app/api/tenants
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

/**
 * GET /api/tenants - List all tenants
 */
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        rateLimits: true,
        _count: {
          select: {
            apiLogs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants - Create a new tenant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTenantSchema.parse(body);

    const tenant = await prisma.tenant.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
      },
      include: {
        rateLimits: true,
      },
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
