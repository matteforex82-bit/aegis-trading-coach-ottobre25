'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { ApiKeyModal } from './api-key-modal';

interface AddAccountDialogProps {
  onAccountAdded: () => void;
}

export function AddAccountDialog({ onAccountAdded }: AddAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API Key Modal state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<{
    key: string;
    accountLogin: string;
    broker: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    login: '',
    broker: '',
    server: '',
    accountType: 'LIVE',
    propFirm: '',
    phase: '',
    startBalance: '',
    maxDailyLoss: '',
    maxDrawdown: '',
    profitTarget: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Success! Close form and show API key modal
      setIsOpen(false);
      setGeneratedApiKey({
        key: data.apiKey.key,
        accountLogin: data.account.login,
        broker: data.account.broker,
      });
      setShowApiKeyModal(true);

      // Reset form
      setFormData({
        login: '',
        broker: '',
        server: '',
        accountType: 'LIVE',
        propFirm: '',
        phase: '',
        startBalance: '',
        maxDailyLoss: '',
        maxDrawdown: '',
        profitTarget: '',
      });

      // Refresh accounts list
      onAccountAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Trading Account</DialogTitle>
            <DialogDescription>
              Connect your MT4/MT5 account to AEGIS Trading Coach. An API key will be generated automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Account Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login">Account Login *</Label>
                  <Input
                    id="login"
                    placeholder="e.g., 4000072938"
                    value={formData.login}
                    onChange={(e) => handleChange('login', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="broker">Broker Name *</Label>
                  <Input
                    id="broker"
                    placeholder="e.g., IC Markets"
                    value={formData.broker}
                    onChange={(e) => handleChange('broker', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="server">Server</Label>
                  <Input
                    id="server"
                    placeholder="e.g., ICMarkets-Live01"
                    value={formData.server}
                    onChange={(e) => handleChange('server', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type *</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value) => handleChange('accountType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEMO">Demo</SelectItem>
                      <SelectItem value="LIVE">Live</SelectItem>
                      <SelectItem value="CHALLENGE">Challenge</SelectItem>
                      <SelectItem value="FUNDED">Funded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startBalance">Starting Balance ($) *</Label>
                  <Input
                    id="startBalance"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 10000"
                    value={formData.startBalance}
                    onChange={(e) => handleChange('startBalance', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Challenge Info (optional) */}
            {(formData.accountType === 'CHALLENGE' || formData.accountType === 'FUNDED') && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm">Challenge Details</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propFirm">Prop Firm</Label>
                    <Input
                      id="propFirm"
                      placeholder="e.g., FTMO"
                      value={formData.propFirm}
                      onChange={(e) => handleChange('propFirm', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phase">Phase</Label>
                    <Input
                      id="phase"
                      placeholder="e.g., Phase 1"
                      value={formData.phase}
                      onChange={(e) => handleChange('phase', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxDailyLoss">Max Daily Loss ($)</Label>
                    <Input
                      id="maxDailyLoss"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 500"
                      value={formData.maxDailyLoss}
                      onChange={(e) => handleChange('maxDailyLoss', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDrawdown">Max Drawdown ($)</Label>
                    <Input
                      id="maxDrawdown"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1000"
                      value={formData.maxDrawdown}
                      onChange={(e) => handleChange('maxDrawdown', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profitTarget">Profit Target ($)</Label>
                    <Input
                      id="profitTarget"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1000"
                      value={formData.profitTarget}
                      onChange={(e) => handleChange('profitTarget', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Account & Generate API Key
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* API Key Modal - Shows after successful account creation */}
      {generatedApiKey && (
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => {
            setShowApiKeyModal(false);
            setGeneratedApiKey(null);
          }}
          apiKey={generatedApiKey.key}
          accountLogin={generatedApiKey.accountLogin}
          broker={generatedApiKey.broker}
        />
      )}
    </>
  );
}
