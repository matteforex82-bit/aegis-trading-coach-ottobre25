'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PnLSnapshot {
  id: string;
  balance: number;
  equity: number;
  profit: number;
  drawdown: number;
  dailyPnL: number;
  snapshotTime: string;
  isManualReveal: boolean;
}

interface PnLWidgetProps {
  accountId: string;
  initialBalance?: number;
}

export function PnLWidget({ accountId, initialBalance = 0 }: PnLWidgetProps) {
  const [snapshot, setSnapshot] = useState<PnLSnapshot | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [canReveal, setCanReveal] = useState(true);

  // Fetch P&L snapshot
  const fetchSnapshot = async (reveal = false) => {
    try {
      setIsLoading(true);
      const url = `/api/dashboard/pnl-snapshot?accountId=${accountId}${reveal ? '&reveal=true' : ''}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        setSnapshot(data.snapshot);
        setNextUpdate(new Date(data.nextUpdate));
        setIsRevealed(data.isRealTime || reveal);
        setCanReveal(data.canReveal);
      }
    } catch (error) {
      console.error('Error fetching P&L snapshot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reveal P&L
  const handleReveal = async () => {
    if (!canReveal) return;
    await fetchSnapshot(true);
  };

  // Calculate time remaining
  useEffect(() => {
    if (!nextUpdate) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextUpdate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Updating...');
        fetchSnapshot(); // Auto-refresh when time is up
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [nextUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchSnapshot();
  }, [accountId]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (isLoading && !snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L Overview</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>P&L Overview</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const profitPercent = initialBalance > 0 ? (snapshot.profit / initialBalance) * 100 : 0;
  const isProfitable = snapshot.profit >= 0;
  const isHidden = !isRevealed;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>P&L Overview</CardTitle>
            <CardDescription>
              {isRevealed ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Eye className="h-3 w-3" />
                  Real-time P&L
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Next update: {timeRemaining}
                </span>
              )}
            </CardDescription>
          </div>
          {!isRevealed && canReveal && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReveal}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Reveal P&L
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-2xl font-bold">
                {isHidden ? '••••••' : formatCurrency(snapshot.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Equity */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Equity</p>
              <p className="text-2xl font-bold">
                {isHidden ? '••••••' : formatCurrency(snapshot.equity)}
              </p>
            </div>
          </div>
        </div>

        {/* Profit */}
        <div
          className={cn(
            'flex items-center justify-between p-4 rounded-lg',
            isHidden
              ? 'bg-muted/50'
              : isProfitable
              ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
          )}
        >
          <div className="flex items-center gap-2">
            {!isHidden &&
              (isProfitable ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ))}
            {isHidden && <EyeOff className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="text-sm text-muted-foreground">Total Profit/Loss</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  isHidden
                    ? ''
                    : isProfitable
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {isHidden ? '••••••' : formatCurrency(snapshot.profit)}
              </p>
              {!isHidden && (
                <p
                  className={cn(
                    'text-sm font-medium',
                    isProfitable ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {formatPercent(profitPercent)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Daily P&L */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Daily P&L</p>
            <p
              className={cn(
                'text-lg font-bold',
                isHidden
                  ? ''
                  : snapshot.dailyPnL >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              )}
            >
              {isHidden ? '••••••' : formatCurrency(snapshot.dailyPnL)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Drawdown</p>
            <p
              className={cn(
                'text-lg font-bold',
                isHidden ? '' : 'text-red-600'
              )}
            >
              {isHidden ? '••••••' : formatPercent(snapshot.drawdown)}
            </p>
          </div>
        </div>

        {/* Snapshot info */}
        <div className="pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            {isRevealed ? (
              <>
                Showing real-time data •{' '}
                <span className="text-green-600 font-medium">Live</span>
              </>
            ) : (
              <>
                Snapshot from{' '}
                {new Date(snapshot.snapshotTime).toLocaleTimeString()} •{' '}
                <Badge variant="secondary" className="text-xs">
                  4h Cache
                </Badge>
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
