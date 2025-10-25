import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { generateDailyReport } from '@/lib/discipline-calculator';

/**
 * GET /api/discipline
 *
 * Returns discipline reports for an account
 *
 * Query params:
 * - accountId: Trading account ID
 * - date: (optional) Specific date (YYYY-MM-DD), defaults to today
 * - range: (optional) 'week' | 'month' for historical data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const dateParam = searchParams.get('date');
    const range = searchParams.get('range');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId parameter' },
        { status: 400 }
      );
    }

    // Verify ownership
    const account = await prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 403 }
      );
    }

    // Parse date
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Get or generate report for target date
    let report = await prisma.disciplineReport.findUnique({
      where: {
        accountId_reportDate: {
          accountId,
          reportDate: targetDate,
        },
      },
    });

    // If no report exists and it's today or past, generate it
    if (!report && targetDate <= new Date()) {
      const scoreResult = await generateDailyReport(
        accountId,
        new Date(targetDate),
        prisma
      );

      report = await prisma.disciplineReport.create({
        data: {
          accountId,
          reportDate: targetDate,
          disciplineScore: scoreResult.totalScore,
          totalTrades: scoreResult.rawData.trades.length,
          winningTrades: scoreResult.rawData.trades.filter(
            (t: any) => t.finalPnL > 0
          ).length,
          losingTrades: scoreResult.rawData.trades.filter(
            (t: any) => t.finalPnL < 0
          ).length,
          netPnL: scoreResult.rawData.trades.reduce(
            (sum: number, t: any) => sum + (t.finalPnL || 0),
            0
          ),
          dailyDrawdown:
            scoreResult.rawData.latestSnapshot?.dailyDrawdownTotal || 0,
          overRollDrawdown:
            scoreResult.rawData.latestSnapshot?.overRollDrawdownTotal || 0,
          reportData: {
            breakdown: scoreResult.breakdown,
            grade: scoreResult.grade,
            feedback: scoreResult.feedback,
            recommendations: scoreResult.recommendations,
          },
        },
      });
    }

    // If range requested, get historical reports
    let historicalReports: any[] = [];
    if (range) {
      const daysBack = range === 'week' ? 7 : range === 'month' ? 30 : 7;
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - daysBack);

      historicalReports = await prisma.disciplineReport.findMany({
        where: {
          accountId,
          reportDate: {
            gte: startDate,
            lte: targetDate,
          },
        },
        orderBy: {
          reportDate: 'asc',
        },
      });
    }

    return NextResponse.json({
      todayReport: report,
      historicalReports: range ? historicalReports : undefined,
      accountId,
      reportDate: targetDate,
    });
  } catch (error: any) {
    console.error('Error fetching discipline report:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/discipline
 *
 * Generate discipline report manually (or via cron)
 *
 * Body:
 * - accountId: Trading account ID
 * - date: (optional) Date to generate report for
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, date } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      );
    }

    // Verify ownership
    const account = await prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 403 }
      );
    }

    // Parse date
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    // Generate report
    const scoreResult = await generateDailyReport(
      accountId,
      new Date(reportDate),
      prisma
    );

    // Check if report already exists
    const existingReport = await prisma.disciplineReport.findUnique({
      where: {
        accountId_reportDate: {
          accountId,
          reportDate,
        },
      },
    });

    let report;
    if (existingReport) {
      // Update existing
      report = await prisma.disciplineReport.update({
        where: { id: existingReport.id },
        data: {
          disciplineScore: scoreResult.totalScore,
          totalTrades: scoreResult.rawData.trades.length,
          winningTrades: scoreResult.rawData.trades.filter(
            (t: any) => t.finalPnL > 0
          ).length,
          losingTrades: scoreResult.rawData.trades.filter(
            (t: any) => t.finalPnL < 0
          ).length,
          netPnL: scoreResult.rawData.trades.reduce(
            (sum: number, t: any) => sum + (t.finalPnL || 0),
            0
          ),
          dailyDrawdown:
            scoreResult.rawData.latestSnapshot?.dailyDrawdownTotal || 0,
          overRollDrawdown:
            scoreResult.rawData.latestSnapshot?.overRollDrawdownTotal || 0,
          reportData: {
            breakdown: scoreResult.breakdown,
            grade: scoreResult.grade,
            feedback: scoreResult.feedback,
            recommendations: scoreResult.recommendations,
          },
        },
      });
    } else {
      // Create new
      report = await prisma.disciplineReport.create({
        data: {
          accountId,
          reportDate,
          disciplineScore: scoreResult.totalScore,
          totalTrades: scoreResult.rawData.trades.length,
          winningTrades: scoreResult.rawData.trades.filter(
            (t: any) => t.finalPnL > 0
          ).length,
          losingTrades: scoreResult.rawData.trades.filter(
            (t: any) => t.finalPnL < 0
          ).length,
          netPnL: scoreResult.rawData.trades.reduce(
            (sum: number, t: any) => sum + (t.finalPnL || 0),
            0
          ),
          dailyDrawdown:
            scoreResult.rawData.latestSnapshot?.dailyDrawdownTotal || 0,
          overRollDrawdown:
            scoreResult.rawData.latestSnapshot?.overRollDrawdownTotal || 0,
          reportData: {
            breakdown: scoreResult.breakdown,
            grade: scoreResult.grade,
            feedback: scoreResult.feedback,
            recommendations: scoreResult.recommendations,
          },
        },
      });
    }

    console.log(
      `📊 Discipline report generated: ${accountId} - Score: ${scoreResult.totalScore} (${scoreResult.grade})`
    );

    return NextResponse.json({
      success: true,
      report,
      scoreResult,
    });
  } catch (error: any) {
    console.error('Error generating discipline report:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
