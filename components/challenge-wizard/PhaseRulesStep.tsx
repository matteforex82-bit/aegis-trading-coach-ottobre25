'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoIcon } from 'lucide-react';

interface PhaseRulesStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export function PhaseRulesStep({ data, updateData }: PhaseRulesStepProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          These rules are pre-filled from your selected challenge provider. You can adjust them if needed.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Size */}
        <div>
          <Label htmlFor="accountSize">
            Account Size (USD) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="accountSize"
            type="number"
            value={data.accountSize || ''}
            onChange={(e) => updateData({ accountSize: parseFloat(e.target.value) || 0 })}
            placeholder="10000"
            min="0"
            step="1000"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Starting balance of your challenge account
          </p>
        </div>

        {/* Challenge Phase */}
        <div>
          <Label htmlFor="challengePhase">Challenge Phase</Label>
          <Input
            id="challengePhase"
            type="text"
            value={data.challengePhase}
            onChange={(e) => updateData({ challengePhase: e.target.value })}
            placeholder="Phase 1"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            E.g., Phase 1, Phase 2, Funded
          </p>
        </div>

        {/* Max Total Drawdown */}
        <div>
          <Label htmlFor="overRollMaxPercent">
            Max Total Drawdown (%) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="overRollMaxPercent"
            type="number"
            value={data.overRollMaxPercent || ''}
            onChange={(e) => updateData({ overRollMaxPercent: parseFloat(e.target.value) || 0 })}
            placeholder="10.0"
            min="0"
            max="100"
            step="0.1"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum cumulative loss allowed (over-roll)
          </p>
        </div>

        {/* Max Daily Loss */}
        <div>
          <Label htmlFor="dailyMaxPercent">
            Max Daily Loss (%) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dailyMaxPercent"
            type="number"
            value={data.dailyMaxPercent || ''}
            onChange={(e) => updateData({ dailyMaxPercent: parseFloat(e.target.value) || 0 })}
            placeholder="5.0"
            min="0"
            max="100"
            step="0.1"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum loss allowed in a single trading day
          </p>
        </div>
      </div>

      {/* Calculated Budgets Preview */}
      {data.accountSize > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-3">Calculated Budgets</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Daily Budget:</span>
              <span className="ml-2 font-medium">
                ${((data.accountSize * data.dailyMaxPercent) / 100).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Budget:</span>
              <span className="ml-2 font-medium">
                ${((data.accountSize * data.overRollMaxPercent) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
