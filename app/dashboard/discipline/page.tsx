'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Target,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Award,
  Shield,
  Brain,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisciplineReport {
  id: string;
  accountId: string;
  reportDate: string;
  disciplineScore: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  netPnL: number;
  reportData: {
    breakdown: {
      violationsScore: number;
      riskManagementScore: number;
      drawdownControlScore: number;
      tradingQualityScore: number;
    };
    grade: string;
    feedback: string[];
    recommendations: string[];
  };
  account: {
    login: string;
    broker: string;
  };
}

const gradeColors = {
  S: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
  A: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
  B: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white',
  C: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white',
  D: 'bg-gradient-to-r from-orange-600 to-red-600 text-white',
  F: 'bg-gradient-to-r from-red-600 to-red-800 text-white',
};

const gradeIcons = {
  S: Trophy,
  A: Award,
  B: Shield,
  C: Target,
  D: AlertCircle,
  F: AlertCircle,
};

function DisciplineContent() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get('accountId');

  const [report, setReport] = useState<DisciplineReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accountId || '');

  // Fetch accounts
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch report when account or date changes
  useEffect(() => {
    if (selectedAccountId) {
      fetchReport();
    }
  }, [selectedAccountId, selectedDate]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
        if (!selectedAccountId && data.accounts.length > 0) {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`/api/discipline?accountId=${selectedAccountId}&date=${dateStr}`);

      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching discipline report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Don't allow future dates
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  if (isLoading && !report) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedAccountId || accounts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Trading Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Connect a trading account to view your discipline scorecard.
          </p>
        </CardContent>
      </Card>
    );
  }

  const GradeIcon = report ? gradeIcons[report.reportData.grade as keyof typeof gradeIcons] : Trophy;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Discipline Scorecard</h2>
        <p className="text-muted-foreground">
          Track your trading discipline and performance
        </p>
      </div>

      {/* Account Selector and Date Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-background"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.broker} - {acc.login}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            disabled={selectedDate.toDateString() === new Date().toDateString()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="ml-2">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Badge>
          <Button variant="ghost" size="icon" onClick={fetchReport}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!report ? (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Report Available</h3>
            <p className="text-sm text-muted-foreground">
              No trading activity found for this date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Score Overview */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Main Score Card */}
            <Card className="relative overflow-hidden">
              <div className={cn('absolute inset-0 opacity-10', gradeColors[report.reportData.grade as keyof typeof gradeColors])} />
              <CardHeader>
                <CardTitle>Overall Score</CardTitle>
                <CardDescription>Your discipline rating for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-6xl font-bold">{report.disciplineScore}</div>
                    <p className="text-sm text-muted-foreground mt-2">out of 100</p>
                  </div>
                  <div className="text-center">
                    <Badge
                      className={cn('text-4xl px-6 py-3', gradeColors[report.reportData.grade as keyof typeof gradeColors])}
                    >
                      {report.reportData.grade}
                    </Badge>
                    <div className="mt-4">
                      <GradeIcon className="h-16 w-16 mx-auto text-primary" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trading Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Trading Summary</CardTitle>
                <CardDescription>Today's performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-2xl font-bold">{report.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">
                      {report.totalTrades > 0
                        ? ((report.winningTrades / report.totalTrades) * 100).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Winning Trades</p>
                    <p className="text-2xl font-bold text-green-600">
                      {report.winningTrades}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Losing Trades</p>
                    <p className="text-2xl font-bold text-red-600">
                      {report.losingTrades}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Net P&L</p>
                  <p
                    className={cn(
                      'text-3xl font-bold',
                      report.netPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {report.netPnL >= 0 ? '+' : ''}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(report.netPnL)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Score Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
              <CardDescription>Detailed analysis of your trading discipline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Violations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">Rule Compliance</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">
                      {report.reportData.breakdown.violationsScore}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">/30</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(report.reportData.breakdown.violationsScore / 30) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Risk Management */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Risk Management</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">
                      {report.reportData.breakdown.riskManagementScore}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">/30</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(report.reportData.breakdown.riskManagementScore / 30) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Drawdown Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Drawdown Control</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">
                      {report.reportData.breakdown.drawdownControlScore}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">/20</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(report.reportData.breakdown.drawdownControlScore / 20) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Trading Quality */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Trading Quality</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">
                      {report.reportData.breakdown.tradingQualityScore}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">/20</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(report.reportData.breakdown.tradingQualityScore / 20) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback and Recommendations */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Performance Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.reportData.feedback.length > 0 ? (
                  <ul className="space-y-2">
                    {report.reportData.feedback.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No feedback available.</p>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Improvement Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.reportData.recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {report.reportData.recommendations.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Keep up the good work!</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function DisciplinePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <DisciplineContent />
    </Suspense>
  );
}
