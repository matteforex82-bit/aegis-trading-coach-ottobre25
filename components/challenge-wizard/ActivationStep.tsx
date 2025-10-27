'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, AlertTriangle, CheckCircle } from 'lucide-react';

interface ActivationStepProps {
  data: any;
  onComplete: () => void;
}

export function ActivationStep({ data, onComplete }: ActivationStepProps) {
  const [agreed, setAgreed] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const handleActivation = async () => {
    if (!agreed) {
      setError('Please confirm that you understand the setup is immutable');
      return;
    }

    setIsActivating(true);
    setError(null);
    setValidationErrors([]);

    try {
      const response = await fetch('/api/challenge-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Show detailed validation errors if available
        if (result.validationErrors && result.validationErrors.length > 0) {
          setValidationErrors(result.validationErrors);
          setError('Please fix the following issues:');
          return;
        }
        throw new Error(result.error || 'Failed to activate challenge setup');
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsActivating(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Challenge Setup Activated!</h2>
        <p className="text-muted-foreground">
          Your challenge configuration is now locked and active.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-900">
          <strong>Important:</strong> Once activated, your challenge setup becomes <strong>immutable</strong> and cannot be changed. Please review all settings carefully before proceeding.
        </AlertDescription>
      </Alert>

      <div className="p-6 border-2 border-primary/20 rounded-lg bg-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          What Happens After Activation
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>All challenge rules and risk parameters are locked</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>AEGIS will enforce all limits automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>Drawdown tracking starts immediately</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>Discipline settings are applied to all new trades</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span>You can upload YAML setups and create trade orders</span>
          </li>
        </ul>
      </div>

      <div className="flex items-start gap-3 p-4 border rounded-lg">
        <Checkbox
          id="agreement"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked as boolean)}
        />
        <Label htmlFor="agreement" className="text-sm font-normal cursor-pointer">
          I understand that this challenge setup is <strong>immutable</strong> and cannot be modified after activation. I have reviewed all settings and confirm they are correct.
        </Label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>{error}</div>
            {validationErrors.length > 0 && (
              <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                {validationErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleActivation}
        disabled={!agreed || isActivating}
        className="w-full"
        size="lg"
      >
        {isActivating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Activating Challenge...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Activate Challenge Setup
          </>
        )}
      </Button>
    </div>
  );
}
