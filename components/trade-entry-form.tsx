'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface TradeEntryFormProps {
  accountId: string;
  onSuccess?: () => void;
  prefilledSetup?: {
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    takeProfit1?: number;
    takeProfit2?: number;
    takeProfit3?: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  canExecute: boolean;
  severity: 'OK' | 'WARNING' | 'ERROR' | 'BLOCKED';
  lotSize: number;
  riskAmount: number;
  pipDistance: number;
  violations: string[];
  warnings: string[];
  recommendations: string[];
  lockMode?: string;
}

export function TradeEntryForm({ accountId, onSuccess, prefilledSetup }: TradeEntryFormProps) {
  const [symbol, setSymbol] = useState(prefilledSetup?.symbol || 'EURUSD');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>(prefilledSetup?.direction || 'BUY');
  const [entryPrice, setEntryPrice] = useState(prefilledSetup?.entryPrice?.toString() || '');
  const [stopLoss, setStopLoss] = useState(prefilledSetup?.stopLoss?.toString() || '');
  const [takeProfit1, setTakeProfit1] = useState(prefilledSetup?.takeProfit1?.toString() || '');
  const [riskPercent, setRiskPercent] = useState('1.5');

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-validate when form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (entryPrice && stopLoss && riskPercent) {
        validateTrade();
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [symbol, direction, entryPrice, stopLoss, takeProfit1, riskPercent]);

  const validateTrade = async () => {
    if (!entryPrice || !stopLoss || !riskPercent) {
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch('/api/trades/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          symbol,
          direction,
          entryPrice: parseFloat(entryPrice),
          stopLoss: parseFloat(stopLoss),
          takeProfit1: takeProfit1 ? parseFloat(takeProfit1) : undefined,
          riskPercent: parseFloat(riskPercent),
        }),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result: ValidationResult = await response.json();
      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation?.canExecute) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/trades/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          symbol,
          type: direction,
          lotSize: validation.lotSize,
          entryPrice: parseFloat(entryPrice),
          stopLoss: parseFloat(stopLoss),
          takeProfit1: takeProfit1 ? parseFloat(takeProfit1) : undefined,
          riskPercent: parseFloat(riskPercent),
          riskAmount: validation.riskAmount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create trade order');
      }

      // Success
      onSuccess?.();

      // Reset form
      setSymbol('EURUSD');
      setEntryPrice('');
      setStopLoss('');
      setTakeProfit1('');
      setRiskPercent('1.5');
      setValidation(null);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to create trade order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'OK': return 'text-green-600 bg-green-50 border-green-200';
      case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ERROR': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'BLOCKED': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'OK': return <CheckCircle className="h-5 w-5" />;
      case 'WARNING': return <AlertTriangle className="h-5 w-5" />;
      case 'ERROR': return <AlertCircle className="h-5 w-5" />;
      case 'BLOCKED': return <Lock className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {direction === 'BUY' ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
          New Trade Entry
        </CardTitle>
        <CardDescription>
          Enter trade details. AEGIS will validate automatically.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Direction Selector */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant={direction === 'BUY' ? 'default' : 'outline'}
              onClick={() => setDirection('BUY')}
              className="flex-1"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              BUY
            </Button>
            <Button
              type="button"
              variant={direction === 'SELL' ? 'default' : 'outline'}
              onClick={() => setDirection('SELL')}
              className="flex-1"
            >
              <TrendingDown className="mr-2 h-4 w-4" />
              SELL
            </Button>
          </div>

          {/* Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="EURUSD"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Entry Price */}
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price</Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.00001"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="1.08500"
                required
              />
            </div>

            {/* Stop Loss */}
            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.00001"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="1.08200"
                required
              />
            </div>
          </div>

          {/* Take Profit */}
          <div className="space-y-2">
            <Label htmlFor="takeProfit1">Take Profit 1 (Optional)</Label>
            <Input
              id="takeProfit1"
              type="number"
              step="0.00001"
              value={takeProfit1}
              onChange={(e) => setTakeProfit1(e.target.value)}
              placeholder="1.08800"
            />
          </div>

          {/* Risk Percent */}
          <div className="space-y-2">
            <Label htmlFor="riskPercent">Risk % per Trade</Label>
            <Input
              id="riskPercent"
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Recommended: 1-2% max
            </p>
          </div>

          {/* Validation Results */}
          {validation && (
            <div className={`p-4 border rounded-lg ${getSeverityColor(validation.severity)}`}>
              <div className="flex items-start gap-3">
                {getSeverityIcon(validation.severity)}
                <div className="flex-1 space-y-2">
                  <div className="font-medium">
                    {validation.severity === 'OK' && 'Trade Valid ✅'}
                    {validation.severity === 'WARNING' && 'Trade Valid with Warnings ⚠️'}
                    {validation.severity === 'ERROR' && 'Trade Has Errors'}
                    {validation.severity === 'BLOCKED' && 'Trade Blocked 🚫'}
                  </div>

                  {/* Calculated Values */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="font-medium">Lot Size</div>
                      <div>{validation.lotSize.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Risk Amount</div>
                      <div>${validation.riskAmount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Pip Distance</div>
                      <div>{validation.pipDistance.toFixed(1)} pips</div>
                    </div>
                  </div>

                  {/* Violations */}
                  {validation.violations.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-sm">❌ Violations:</div>
                      <ul className="text-sm space-y-1">
                        {validation.violations.map((v, i) => (
                          <li key={i}>• {v}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-sm">⚠️ Warnings:</div>
                      <ul className="text-sm space-y-1">
                        {validation.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {validation.recommendations.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-sm">💡 Recommendations:</div>
                      <ul className="text-sm space-y-1">
                        {validation.recommendations.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={!validation?.canExecute || isSubmitting || isValidating}
              className="flex-1"
            >
              {isSubmitting ? 'Creating Order...' : 'Create Trade Order'}
            </Button>

            {validation?.lockMode && (
              <Badge variant="outline" className="self-center">
                {validation.lockMode} Mode
              </Badge>
            )}
          </div>

          {!validation?.canExecute && validation && (
            <p className="text-sm text-center text-muted-foreground">
              Fix violations to enable trade execution
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
