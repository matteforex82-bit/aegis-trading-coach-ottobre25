'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, BookOpen } from 'lucide-react';

interface CooldownGuardProps {
  accountId: string;
  onCooldownEnd?: () => void;
  children: React.ReactNode;
}

interface PatternDetectionResult {
  detected: boolean;
  patterns: string[];
  warnings: string[];
  severity: 'OK' | 'WARNING' | 'DANGER' | 'CRITICAL';
  cooldown: {
    recommended: number;
    active: boolean;
    remainingMinutes: number;
  };
  statistics: {
    tradesLast30Min: number;
    tradesToday: number;
    recentLosses: number;
  };
  lastTrade: {
    closeTime: string;
    profit: number;
    symbol: string;
  } | null;
}

export function CooldownGuard({ accountId, onCooldownEnd, children }: CooldownGuardProps) {
  const [patternResult, setPatternResult] = useState<PatternDetectionResult | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [journalEntry, setJournalEntry] = useState('');
  const [canProceed, setCanProceed] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    checkPatterns();
  }, [accountId]);

  // Countdown timer
  useEffect(() => {
    if (!patternResult?.cooldown.active) return;

    setRemainingTime(patternResult.cooldown.remainingMinutes * 60); // Convert to seconds

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanProceed(true);
          onCooldownEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [patternResult]);

  const checkPatterns = async () => {
    setIsChecking(true);

    try {
      const response = await fetch('/api/trades/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        throw new Error('Pattern detection failed');
      }

      const result: PatternDetectionResult = await response.json();
      setPatternResult(result);

      // If no cooldown active, allow trading immediately
      if (!result.cooldown.active) {
        setCanProceed(true);
      }
    } catch (error) {
      console.error('Pattern check error:', error);
      // On error, allow trading (fail-safe)
      setCanProceed(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleJournalSubmit = () => {
    if (journalEntry.trim().length >= 50) {
      setCanProceed(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If still checking, show loading
  if (isChecking) {
    return (
      <Card className="w-full">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">Checking trading patterns...</div>
        </CardContent>
      </Card>
    );
  }

  // If can proceed (no cooldown or completed), show children
  if (canProceed) {
    return <>{children}</>;
  }

  // If cooldown active, show cooldown screen
  if (patternResult?.cooldown.active) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-orange-600" />
            <div>
              <CardTitle>Trading Cooldown Active</CardTitle>
              <CardDescription>
                Take a break and reflect before your next trade
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Cooldown Timer */}
          <div className="p-6 bg-orange-50 border-2 border-orange-300 rounded-lg text-center">
            <div className="text-sm text-orange-700 font-medium mb-2">
              Cooldown Time Remaining
            </div>
            <div className="text-5xl font-bold text-orange-600 mb-2">
              {formatTime(remainingTime)}
            </div>
            <div className="text-sm text-orange-600">
              Trading will unlock automatically
            </div>
          </div>

          {/* Patterns Detected */}
          {patternResult.patterns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="font-medium">Patterns Detected</h3>
              </div>
              <div className="space-y-2">
                {patternResult.patterns.map((pattern, i) => (
                  <Badge key={i} variant="outline" className="mr-2">
                    {pattern.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {patternResult.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">⚠️ Warnings:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {patternResult.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {patternResult.statistics.tradesLast30Min}
              </div>
              <div className="text-xs text-muted-foreground">Trades (30 min)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {patternResult.statistics.tradesToday}
              </div>
              <div className="text-xs text-muted-foreground">Trades Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {patternResult.statistics.recentLosses}
              </div>
              <div className="text-xs text-muted-foreground">Recent Losses</div>
            </div>
          </div>

          {/* Last Trade Info */}
          {patternResult.lastTrade && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm font-medium text-red-900 mb-2">
                Last Trade (Loss)
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-700">{patternResult.lastTrade.symbol}</span>
                <span className="font-mono font-bold text-red-600">
                  -${Math.abs(patternResult.lastTrade.profit).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-red-600 mt-1">
                {new Date(patternResult.lastTrade.closeTime).toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Mandatory Journal (if severity is DANGER or CRITICAL) */}
          {(patternResult.severity === 'DANGER' || patternResult.severity === 'CRITICAL') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">Reflection Required</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Before your next trade, explain your reasoning (minimum 50 characters):
              </p>
              <Textarea
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
                placeholder="Why do you want to take this trade? What is your setup? What is your edge?"
                rows={4}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {journalEntry.length} / 50 characters
                </span>
                <Button
                  onClick={handleJournalSubmit}
                  disabled={journalEntry.trim().length < 50}
                  size="sm"
                >
                  Submit & Continue
                </Button>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <div className="font-medium text-blue-900">💡 Recommendations</div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Close MT5 and step away from charts</li>
              <li>• Review what went wrong in your last trade</li>
              <li>• Wait for high-probability setups only</li>
              <li>• Don't try to "recover" losses immediately</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: show children
  return <>{children}</>;
}
