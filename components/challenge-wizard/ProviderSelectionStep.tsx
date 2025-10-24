'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, TrendingUp } from 'lucide-react';
import { CHALLENGE_PRESETS, getAllChallengePresets } from '@/lib/challenge-presets';

interface ProviderSelectionStepProps {
  data: any;
  updateData: (updates: any) => void;
  accounts: any[];
  loadingAccounts: boolean;
}

export function ProviderSelectionStep({
  data,
  updateData,
  accounts,
  loadingAccounts,
}: ProviderSelectionStepProps) {
  const presets = getAllChallengePresets();

  const handlePresetSelect = (presetId: string) => {
    const preset = CHALLENGE_PRESETS[presetId];
    if (preset) {
      updateData({
        presetId,
        challengeProvider: preset.provider,
        overRollMaxPercent: preset.overRollMaxPercent,
        dailyMaxPercent: preset.dailyMaxPercent,
        challengePhase: presetId.includes('PHASE1') || presetId.includes('P1')
          ? 'Phase 1'
          : presetId.includes('PHASE2') || presetId.includes('P2')
          ? 'Phase 2'
          : presetId.includes('FUNDED')
          ? 'Funded'
          : 'Standard',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Select Trading Account <span className="text-red-500">*</span>
        </label>
        {loadingAccounts ? (
          <div className="text-sm text-muted-foreground">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              No accounts available for challenge setup. All your accounts already have challenge configurations.
            </AlertDescription>
          </Alert>
        ) : (
          <select
            value={data.accountId}
            onChange={(e) => updateData({ accountId: e.target.value })}
            className="w-full p-3 border rounded-md bg-background"
          >
            <option value="">Select an account...</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.login} - {account.broker} ({account.accountType}) - $
                {account.currentBalance.toLocaleString()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Challenge Provider Presets */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Select Challenge Provider <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((preset) => {
            const isSelected = data.presetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className={`p-4 border-2 rounded-lg text-left transition-all hover:border-primary ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{preset.provider}</h3>
                    <p className="text-sm text-muted-foreground">{preset.name}</p>
                  </div>
                  {isSelected && (
                    <Badge className="bg-primary">Selected</Badge>
                  )}
                </div>

                <div className="space-y-1 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Max Drawdown:</span>
                    <span className="font-medium">{preset.overRollMaxPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Daily Loss:</span>
                    <span className="font-medium">{preset.dailyMaxPercent}%</span>
                  </div>
                  {preset.profitTargetPercent && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Profit Target:</span>
                      <span className="font-medium text-green-600">
                        {preset.profitTargetPercent}%
                      </span>
                    </div>
                  )}
                  {preset.minTradingDays && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Min Days:</span>
                      <span className="font-medium">{preset.minTradingDays}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-3 border-t pt-2">
                  {preset.description}
                </p>

                {preset.prohibitedStrategies && preset.prohibitedStrategies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {preset.prohibitedStrategies.map((strategy) => (
                      <Badge key={strategy} variant="outline" className="text-xs">
                        No {strategy}
                      </Badge>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Alert */}
      {data.presetId && (
        <Alert className="bg-blue-50 border-blue-200">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Important:</strong> Once activated, these challenge rules cannot be
            modified. Make sure you select the correct provider and phase.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
