/**
 * @fileoverview API analytics and statistics
 * @module app/api/analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/analytics?tenantId=xxx&days=7
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const days = parseInt(searchParams.get('days') || '7');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total requests
    const totalRequests = await prisma.apiLog.count({
      where: {
        tenantId,
        timestamp: { gte: startDate },
      },
    });

    // Get rate limited requests
    const rateLimitedRequests = await prisma.apiLog.count({
      where: {
        tenantId,
        rateLimited: true,
        timestamp: { gte: startDate },
      },
    });

    // Get successful requests
    const successfulRequests = await prisma.apiLog.count({
      where: {
        tenantId,
        success: true,
        timestamp: { gte: startDate },
      },
    });

    // Get requests by day
    const requestsByDay = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM "ApiLog"
      WHERE "tenantId" = ${tenantId}
        AND timestamp >= ${startDate}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;

    // Get top APIs
    const topApis = await prisma.apiLog.groupBy({
      by: ['apiUrl'],
      where: {
        tenantId,
        timestamp: { gte: startDate },
      },
      _count: {
        apiUrl: true,
      },
      orderBy: {
        _count: {
          apiUrl: 'desc',
        },
      },
      take: 10,
    });

    // Get top IPs
    const topIps = await prisma.apiLog.groupBy({
      by: ['ipAddress'],
      where: {
        tenantId,
        timestamp: { gte: startDate },
        ipAddress: { not: null },
      },
      _count: {
        ipAddress: true,
      },
      orderBy: {
        _count: {
          ipAddress: 'desc',
        },
      },
      take: 10,
    });

    return NextResponse.json({
      summary: {
        totalRequests,
        rateLimitedRequests,
        successfulRequests,
        rateLimitRate: totalRequests > 0 ? (rateLimitedRequests / totalRequests) * 100 : 0,
      },
      requestsByDay: requestsByDay.map(r => ({
        date: r.date,
        count: Number(r.count),
      })),
      topApis: topApis.map(a => ({
        apiUrl: a.apiUrl,
        count: a._count.apiUrl,
      })),
      topIps: topIps.map(i => ({
        ipAddress: i.ipAddress,
        count: i._count.ipAddress,
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
