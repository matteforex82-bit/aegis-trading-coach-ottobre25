'use client';

import { calculateDerivedValues } from '@/lib/setup-validator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface ReviewCalculateStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export function ReviewCalculateStep({ data, updateData }: ReviewCalculateStepProps) {
  const derived = calculateDerivedValues({
    accountSize: data.accountSize,
    overRollMaxPercent: data.overRollMaxPercent,
    dailyMaxPercent: data.dailyMaxPercent,
    userRiskPerTradePercent: data.userRiskPerTradePercent,
    userRiskPerAssetPercent: data.userRiskPerAssetPercent,
    maxOrdersPerAsset: data.maxOrdersPerAsset,
    minTimeBetweenOrdersSec: data.minTimeBetweenOrdersSec,
  });

  // Store calculated values
  if (derived.dailyBudgetDollars !== data.dailyBudgetDollars) {
    updateData(derived);
  }

  return (
    <div className="space-y-6">
      {/* Challenge Info */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Challenge Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Provider:</span>
            <p className="font-medium">{data.challengeProvider}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phase:</span>
            <p className="font-medium">{data.challengePhase}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Account Size:</span>
            <p className="font-medium">${data.accountSize.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Drawdown:</span>
            <p className="font-medium">{data.overRollMaxPercent}%</p>
          </div>
        </div>
      </div>

      {/* Risk Parameters */}
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-3">Risk Parameters</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Risk Per Trade:</span>
            <p className="font-medium">{data.userRiskPerTradePercent}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Risk Per Asset:</span>
            <p className="font-medium">{data.userRiskPerAssetPercent}%</p>
          </div>
        </div>
      </div>

      {/* Calculated Budgets */}
      <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
        <h3 className="font-semibold mb-3 text-green-900">Calculated Budgets</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-green-700">Daily Budget:</span>
            <p className="text-2xl font-bold text-green-900">
              ${derived.dailyBudgetDollars.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Maximum loss per day
            </p>
          </div>
          <div>
            <span className="text-sm text-green-700">Total Budget:</span>
            <p className="text-2xl font-bold text-green-900">
              ${derived.overRollBudgetDollars.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Maximum cumulative loss
            </p>
          </div>
          <div>
            <span className="text-sm text-green-700">Max Trade Risk:</span>
            <p className="text-2xl font-bold text-green-900">
              ${derived.maxTradeRiskDollars.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Per single trade
            </p>
          </div>
          <div>
            <span className="text-sm text-green-700">Max Asset Allocation:</span>
            <p className="text-2xl font-bold text-green-900">
              ${derived.maxAssetAllocationDollars.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Total exposure per asset
            </p>
          </div>
        </div>
      </div>

      {/* Discipline Settings */}
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-3">Discipline Settings</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hide P&L:</span>
            <Badge variant={data.pnlHideMode ? "default" : "outline"}>
              {data.pnlHideMode ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          {data.pnlHideMode && (
            <div className="flex justify-between ml-4">
              <span className="text-muted-foreground">Refresh Rate:</span>
              <span className="font-medium">{data.pnlRefreshRateHours}h</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order Lock:</span>
            <Badge variant={data.orderLockEnabled ? "default" : "outline"}>
              {data.orderLockEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-Close Invalidation:</span>
            <Badge variant={data.autoCloseInvalidation ? "default" : "outline"}>
              {data.autoCloseInvalidation ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
