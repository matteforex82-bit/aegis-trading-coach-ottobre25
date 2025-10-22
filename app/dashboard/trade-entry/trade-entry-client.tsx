'use client';

import { useState } from 'react';
import { TradeEntryForm } from '@/components/trade-entry-form';
import { CooldownGuard } from '@/components/cooldown-guard';
import { PropFirmHealthWidget } from '@/components/prop-firm-health-widget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Target } from 'lucide-react';

interface Account {
  id: string;
  login: string;
  broker: string;
  accountType: string;
  currentBalance: number;
  startBalance: number;
  lockMode: string;
  propFirmChallenge?: {
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
  } | null;
}

interface PrefilledSetup {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  wavePattern?: string | null;
  waveCount?: string | null;
}

interface TradeEntryClientProps {
  accounts: Account[];
  prefilledSetup?: PrefilledSetup | null;
}

export function TradeEntryClient({ accounts, prefilledSetup }: TradeEntryClientProps) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  const handleTradeSuccess = () => {
    // Redirect to accounts page or show success message
    router.push('/dashboard/accounts?success=trade-created');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Trade Entry Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Account Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="account-select">Select Trading Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger id="account-select">
                  <SelectValue placeholder="Choose account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.login} - {account.broker} ({account.accountType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccount && (
                <p className="text-sm text-muted-foreground">
                  Balance: ${selectedAccount.currentBalance.toLocaleString()} •{' '}
                  Lock Mode: {selectedAccount.lockMode}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trading Room Setup Indicator */}
        {prefilledSetup && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Trading Room Setup</h3>
                    <p className="text-sm text-muted-foreground">
                      Form pre-filled from Elliott Wave analysis
                      {prefilledSetup.wavePattern && ` • ${prefilledSetup.wavePattern}`}
                      {prefilledSetup.waveCount && ` (${prefilledSetup.waveCount})`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  PRO Setup
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cooldown Guard wraps Trade Entry Form */}
        {selectedAccountId && (
          <CooldownGuard accountId={selectedAccountId}>
            <TradeEntryForm
              accountId={selectedAccountId}
              onSuccess={handleTradeSuccess}
              prefilledSetup={prefilledSetup || undefined}
            />
          </CooldownGuard>
        )}
      </div>

      {/* Right Column - Prop Firm Health (if applicable) */}
      <div className="space-y-6">
        {selectedAccount?.propFirmChallenge && (
          <PropFirmHealthWidget
            propFirmChallenge={selectedAccount.propFirmChallenge}
            account={{
              startBalance: selectedAccount.startBalance,
              currentBalance: selectedAccount.currentBalance,
            }}
          />
        )}

        {!selectedAccount?.propFirmChallenge && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No prop firm challenge configured for this account.</p>
              <a
                href="/dashboard/accounts"
                className="text-primary hover:underline mt-2 inline-block"
              >
                Configure Challenge
              </a>
            </CardContent>
          </Card>
        )}

        {/* Trade Guidelines */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h3 className="font-medium">📋 Trading Guidelines</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Risk 1-2% max per trade</li>
              <li>• R:R ratio minimum 1:1, prefer 2:1+</li>
              <li>• Max 3 trades per day recommended</li>
              <li>• No trading after 2 consecutive losses</li>
              <li>• Always follow your setup rules</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
