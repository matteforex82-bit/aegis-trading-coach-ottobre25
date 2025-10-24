'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

// Step Components
import { ProviderSelectionStep } from '@/components/challenge-wizard/ProviderSelectionStep';
import { PhaseRulesStep } from '@/components/challenge-wizard/PhaseRulesStep';
import { RiskConfigurationStep } from '@/components/challenge-wizard/RiskConfigurationStep';
import { OrderManagementStep } from '@/components/challenge-wizard/OrderManagementStep';
import { DisciplineSettingsStep } from '@/components/challenge-wizard/DisciplineSettingsStep';
import { ReviewCalculateStep } from '@/components/challenge-wizard/ReviewCalculateStep';
import { ActivationStep } from '@/components/challenge-wizard/ActivationStep';

interface ChallengeSetupData {
  // Step 1: Provider Selection
  accountId: string;
  challengeProvider: string;
  presetId: string;

  // Step 2: Phase & Rules
  challengePhase: string;
  overRollMaxPercent: number;
  dailyMaxPercent: number;
  accountSize: number;

  // Step 3: Risk Configuration
  userRiskPerTradePercent: number;
  userRiskPerAssetPercent: number;

  // Step 4: Order Management
  maxOrdersPerAsset: number;
  minTimeBetweenOrdersSec: number;

  // Step 5: Discipline Settings
  pnlHideMode: boolean;
  pnlRefreshRateHours: number;
  orderLockEnabled: boolean;
  autoCloseInvalidation: boolean;

  // Step 6: Calculated Values (read-only)
  dailyBudgetDollars?: number;
  overRollBudgetDollars?: number;
  maxTradeRiskDollars?: number;
  maxAssetAllocationDollars?: number;
}

const STEPS = [
  { id: 1, name: 'Provider', description: 'Select Challenge Provider' },
  { id: 2, name: 'Rules', description: 'Challenge Phase & Rules' },
  { id: 3, name: 'Risk', description: 'Risk Configuration' },
  { id: 4, name: 'Orders', description: 'Order Management' },
  { id: 5, name: 'Discipline', description: 'Discipline Settings' },
  { id: 6, name: 'Review', description: 'Review & Calculate' },
  { id: 7, name: 'Activate', description: 'Activation' },
];

export default function ChallengeSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [setupData, setSetupData] = useState<ChallengeSetupData>({
    accountId: '',
    challengeProvider: '',
    presetId: '',
    challengePhase: '',
    overRollMaxPercent: 0,
    dailyMaxPercent: 0,
    accountSize: 0,
    userRiskPerTradePercent: 1.5,
    userRiskPerAssetPercent: 3.0,
    maxOrdersPerAsset: 3,
    minTimeBetweenOrdersSec: 900, // 15 minutes
    pnlHideMode: true,
    pnlRefreshRateHours: 4,
    orderLockEnabled: true,
    autoCloseInvalidation: true,
  });

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Pre-select account from URL if provided
  useEffect(() => {
    const accountId = searchParams.get('accountId');
    if (accountId && accounts.length > 0) {
      setSetupData(prev => ({ ...prev, accountId }));
    }
  }, [searchParams, accounts]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        // Filter accounts that don't have a challenge setup yet
        const availableAccounts = data.filter((acc: any) => !acc.challengeSetup);
        setAccounts(availableAccounts);

        if (availableAccounts.length > 0 && !setupData.accountId) {
          setSetupData(prev => ({ ...prev, accountId: availableAccounts[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const updateSetupData = (updates: Partial<ChallengeSetupData>) => {
    setSetupData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!setupData.accountId && !!setupData.presetId;
      case 2:
        return setupData.accountSize > 0 && setupData.overRollMaxPercent > 0 && setupData.dailyMaxPercent > 0;
      case 3:
        return setupData.userRiskPerTradePercent > 0 && setupData.userRiskPerAssetPercent > 0;
      case 4:
        return setupData.maxOrdersPerAsset > 0 && setupData.minTimeBetweenOrdersSec > 0;
      case 5:
        return true; // All discipline settings have defaults
      case 6:
        return true; // Review step
      case 7:
        return true; // Activation step
      default:
        return false;
    }
  };

  const renderStep = () => {
    const stepProps = {
      data: setupData,
      updateData: updateSetupData,
      accounts,
      loadingAccounts,
    };

    switch (currentStep) {
      case 1:
        return <ProviderSelectionStep {...stepProps} />;
      case 2:
        return <PhaseRulesStep {...stepProps} />;
      case 3:
        return <RiskConfigurationStep {...stepProps} />;
      case 4:
        return <OrderManagementStep {...stepProps} />;
      case 5:
        return <DisciplineSettingsStep {...stepProps} />;
      case 6:
        return <ReviewCalculateStep {...stepProps} />;
      case 7:
        return <ActivationStep {...stepProps} onComplete={() => router.push('/dashboard/accounts')} />;
      default:
        return null;
    }
  };

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Challenge Setup Wizard</h1>
            <p className="text-muted-foreground">
              Configure your prop firm challenge rules and risk management
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercent)}% Complete
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id === currentStep
                    ? 'text-primary font-semibold'
                    : step.id < currentStep
                    ? 'text-green-600'
                    : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    step.id === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.id < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-muted'
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm">{step.id}</span>
                  )}
                </div>
                <span className="text-xs hidden md:block">{step.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => router.push('/dashboard/accounts')} variant="default">
            Complete
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Help Alert */}
      {!canProceed() && currentStep < 7 && (
        <Alert className="mt-4">
          <AlertDescription>
            Please complete all required fields before proceeding to the next step.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
