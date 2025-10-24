'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { validateSetup } from '@/lib/setup-validator';

interface RiskConfigurationStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export function RiskConfigurationStep({ data, updateData }: RiskConfigurationStepProps) {
  const validation = validateSetup({
    accountSize: data.accountSize,
    overRollMaxPercent: data.overRollMaxPercent,
    dailyMaxPercent: data.dailyMaxPercent,
    userRiskPerTradePercent: data.userRiskPerTradePercent,
    userRiskPerAssetPercent: data.userRiskPerAssetPercent,
    maxOrdersPerAsset: data.maxOrdersPerAsset,
    minTimeBetweenOrdersSec: data.minTimeBetweenOrdersSec,
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="userRiskPerTradePercent">
            Risk Per Trade (%) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="userRiskPerTradePercent"
            type="number"
            value={data.userRiskPerTradePercent || ''}
            onChange={(e) => updateData({ userRiskPerTradePercent: parseFloat(e.target.value) || 0 })}
            placeholder="1.5"
            min="0"
            max="5"
            step="0.1"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum risk per single trade (recommended: 1-2%)
          </p>
        </div>

        <div>
          <Label htmlFor="userRiskPerAssetPercent">
            Risk Per Asset (%) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="userRiskPerAssetPercent"
            type="number"
            value={data.userRiskPerAssetPercent || ''}
            onChange={(e) => updateData({ userRiskPerAssetPercent: parseFloat(e.target.value) || 0 })}
            placeholder="3.0"
            min="0"
            max="10"
            step="0.1"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum total exposure per asset (must be ≥ risk per trade)
          </p>
        </div>
      </div>

      {!validation.isValid && validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validation.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validation.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
