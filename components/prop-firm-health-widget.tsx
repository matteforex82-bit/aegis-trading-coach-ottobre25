'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface PropFirmHealthProps {
  propFirmChallenge: {
    provider: string;
    phase: string;
    maxDailyLossPercent: number;
    maxTotalLossPercent: number;
    profitTargetPercent: number;
    currentDailyLoss: number;
    currentTotalDrawdown: number;
    currentProfit: number;
    tradingDaysCompleted: number;
    minTradingDays?: number | null;
  };
  account: {
    startBalance: number;
    currentBalance: number;
  };
}

type HealthStatus = 'HEALTHY' | 'WARNING' | 'DANGER' | 'CRITICAL';

export function PropFirmHealthWidget({ propFirmChallenge, account }: PropFirmHealthProps) {
  const {
    provider,
    phase,
    maxDailyLossPercent,
    maxTotalLossPercent,
    profitTargetPercent,
    currentDailyLoss,
    currentTotalDrawdown,
    currentProfit,
    tradingDaysCompleted,
    minTradingDays,
  } = propFirmChallenge;

  // Calculate percentages
  const dailyLossPercent = (Math.abs(currentDailyLoss) / account.startBalance) * 100;
  const dailyLossUsagePercent = (dailyLossPercent / maxDailyLossPercent) * 100;

  const totalDDPercent = (Math.abs(currentTotalDrawdown) / account.startBalance) * 100;
  const totalDDUsagePercent = (totalDDPercent / maxTotalLossPercent) * 100;

  const profitPercent = (currentProfit / account.startBalance) * 100;
  const profitProgressPercent = (profitPercent / profitTargetPercent) * 100;

  const daysProgressPercent = minTradingDays
    ? (tradingDaysCompleted / minTradingDays) * 100
    : 100;

  // Calculate remaining
  const dailyLossRemaining = maxDailyLossPercent - dailyLossPercent;
  const totalDDRemaining = maxTotalLossPercent - totalDDPercent;
  const profitRemaining = profitTargetPercent - profitPercent;

  // Determine overall health status
  const getHealthStatus = (): HealthStatus => {
    if (dailyLossPercent > maxDailyLossPercent * 0.9 || totalDDPercent > maxTotalLossPercent * 0.9) {
      return 'CRITICAL';
    }
    if (dailyLossPercent > maxDailyLossPercent * 0.7 || totalDDPercent > maxTotalLossPercent * 0.7) {
      return 'DANGER';
    }
    if (dailyLossPercent > maxDailyLossPercent * 0.5 || totalDDPercent > maxTotalLossPercent * 0.5) {
      return 'WARNING';
    }
    return 'HEALTHY';
  };

  const healthStatus = getHealthStatus();

  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'HEALTHY':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'DANGER':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'CRITICAL':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus) {
      case 'HEALTHY':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'WARNING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'DANGER':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 70) return 'bg-orange-500';
    if (percent > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const suggestMaxRisk = () => {
    const maxFromDaily = dailyLossRemaining;
    const maxFromTotal = totalDDRemaining;
    const safeMax = Math.min(maxFromDaily, maxFromTotal) * 0.8; // 20% safety buffer
    return Math.max(0.5, Math.floor(safeMax * 2) / 2); // Round to 0.5%
  };

  const maxRiskSuggestion = suggestMaxRisk();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {provider} {phase}
              {getStatusIcon()}
            </CardTitle>
            <CardDescription>
              Challenge Progress & Health Monitor
            </CardDescription>
          </div>
          <Badge variant="outline" className={`${getStatusColor()} border`}>
            {healthStatus}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Critical Warning Banner */}
        {healthStatus === 'CRITICAL' && (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div>
                <div className="font-bold text-red-900">🚨 CRITICAL: STOP TRADING</div>
                <div className="text-sm text-red-700 mt-1">
                  You are dangerously close to failing this challenge.
                  One more loss could end your account.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daily Loss */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Daily Loss</span>
            <span className="text-muted-foreground">
              {dailyLossPercent.toFixed(2)}% / {maxDailyLossPercent}%
            </span>
          </div>
          <Progress
            value={dailyLossUsagePercent}
            className="h-3"
            indicatorClassName={getProgressColor(dailyLossUsagePercent)}
          />
          <div className="text-xs text-muted-foreground">
            {dailyLossRemaining.toFixed(2)}% remaining
          </div>
        </div>

        {/* Total Drawdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total Drawdown</span>
            <span className="text-muted-foreground">
              {totalDDPercent.toFixed(2)}% / {maxTotalLossPercent}%
            </span>
          </div>
          <Progress
            value={totalDDUsagePercent}
            className="h-3"
            indicatorClassName={getProgressColor(totalDDUsagePercent)}
          />
          <div className="text-xs text-muted-foreground">
            {totalDDRemaining.toFixed(2)}% remaining
          </div>
        </div>

        {/* Profit Target */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Profit Target</span>
            <span className="text-muted-foreground">
              {profitPercent.toFixed(2)}% / {profitTargetPercent}%
            </span>
          </div>
          <Progress
            value={Math.min(profitProgressPercent, 100)}
            className="h-3"
            indicatorClassName={profitPercent >= profitTargetPercent ? 'bg-green-500' : 'bg-blue-500'}
          />
          {profitPercent >= profitTargetPercent ? (
            <div className="text-xs text-green-600 font-medium">
              ✅ Target reached! Protect your gains
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {profitRemaining.toFixed(2)}% remaining to target
            </div>
          )}
        </div>

        {/* Trading Days */}
        {minTradingDays && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Trading Days</span>
              <span className="text-muted-foreground">
                {tradingDaysCompleted} / {minTradingDays}
              </span>
            </div>
            <Progress
              value={daysProgressPercent}
              className="h-3"
              indicatorClassName={tradingDaysCompleted >= minTradingDays ? 'bg-green-500' : 'bg-blue-500'}
            />
            {tradingDaysCompleted >= minTradingDays ? (
              <div className="text-xs text-green-600 font-medium">
                ✅ Minimum days completed
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {minTradingDays - tradingDaysCompleted} more day(s) required
              </div>
            )}
          </div>
        )}

        {/* Risk Recommendation */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-900 mb-2">
            💡 Recommended Max Risk
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {maxRiskSuggestion}%
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Per trade, based on current limits
          </div>
        </div>

        {/* Health Messages */}
        {healthStatus === 'DANGER' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
            ⚠️ <strong>High risk level.</strong> Trade carefully. Consider reducing risk to 0.5% per trade.
          </div>
        )}

        {healthStatus === 'WARNING' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚡ <strong>Moderate risk level.</strong> Focus on high-probability setups only.
          </div>
        )}

        {healthStatus === 'HEALTHY' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            ✅ <strong>Challenge progressing well.</strong> Stick to your trading plan.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
