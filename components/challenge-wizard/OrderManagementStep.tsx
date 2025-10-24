'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OrderManagementStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export function OrderManagementStep({ data, updateData }: OrderManagementStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="maxOrdersPerAsset">
            Max Orders Per Asset <span className="text-red-500">*</span>
          </Label>
          <Input
            id="maxOrdersPerAsset"
            type="number"
            value={data.maxOrdersPerAsset || ''}
            onChange={(e) => updateData({ maxOrdersPerAsset: parseInt(e.target.value) || 0 })}
            placeholder="3"
            min="1"
            max="10"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum simultaneous orders allowed per single asset
          </p>
        </div>

        <div>
          <Label htmlFor="minTimeBetweenOrdersSec">
            Min Time Between Orders (seconds) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="minTimeBetweenOrdersSec"
            type="number"
            value={data.minTimeBetweenOrdersSec || ''}
            onChange={(e) => updateData({ minTimeBetweenOrdersSec: parseInt(e.target.value) || 0 })}
            placeholder="900"
            min="0"
            step="60"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cooldown period between orders (900s = 15 minutes)
          </p>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg text-sm">
        <p className="font-medium mb-2">Quick Reference:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• 300s = 5 minutes</li>
          <li>• 900s = 15 minutes</li>
          <li>• 1800s = 30 minutes</li>
          <li>• 3600s = 1 hour</li>
        </ul>
      </div>
    </div>
  );
}
