'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface DisciplineSettingsStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export function DisciplineSettingsStep({ data, updateData }: DisciplineSettingsStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <Label htmlFor="pnlHideMode" className="font-medium">
              Hide Real-Time P&L
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Prevents emotional trading by hiding live profit/loss updates
            </p>
          </div>
          <Switch
            id="pnlHideMode"
            checked={data.pnlHideMode}
            onCheckedChange={(checked) => updateData({ pnlHideMode: checked })}
          />
        </div>

        {data.pnlHideMode && (
          <div className="ml-4">
            <Label htmlFor="pnlRefreshRateHours">
              P&L Refresh Rate (hours)
            </Label>
            <Input
              id="pnlRefreshRateHours"
              type="number"
              value={data.pnlRefreshRateHours || ''}
              onChange={(e) => updateData({ pnlRefreshRateHours: parseInt(e.target.value) || 4 })}
              placeholder="4"
              min="1"
              max="24"
              className="mt-2 max-w-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How often P&L updates are shown (default: 4 hours)
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <Label htmlFor="orderLockEnabled" className="font-medium">
              Order Lock
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Prevents modification of orders after placement (immutable)
            </p>
          </div>
          <Switch
            id="orderLockEnabled"
            checked={data.orderLockEnabled}
            onCheckedChange={(checked) => updateData({ orderLockEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <Label htmlFor="autoCloseInvalidation" className="font-medium">
              Auto-Close on Invalidation
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically close positions when Elliott Wave pattern invalidates
            </p>
          </div>
          <Switch
            id="autoCloseInvalidation"
            checked={data.autoCloseInvalidation}
            onCheckedChange={(checked) => updateData({ autoCloseInvalidation: checked })}
          />
        </div>
      </div>
    </div>
  );
}
