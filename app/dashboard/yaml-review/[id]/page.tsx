'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowRight,
  DollarSign
} from 'lucide-react';

interface YAMLAsset {
  symbol: string;
  asset_type?: string;
  scenario?: string;
  wave_structure?: string;
  confidence?: number;
  trading_setup: {
    primary_entry?: { type: string; price: number; rationale?: string };
    secondary_entry?: { type: string; price: number; rationale?: string };
    stop_loss: { price: number; rationale?: string };
    take_profit_targets?: Array<{ level: string; price: number; percentage?: number }>;
    invalidation?: { price: number; rule?: string };
  };
}

interface PreviewData {
  preview: boolean;
  success: boolean;
  ordersPreview: any[];
  summary: {
    totalOrders: number;
    totalRiskAmount: number;
    totalRiskPercent: number;
    remainingDailyBudget: number;
  };
  errors: string[];
  warnings: string[];
  challengeSetup: any;
}

export default function YAMLReviewPage() {
  const router = useRouter();
  const params = useParams();
  const yamlAnalysisId = params.id as string;

  const [yamlData, setYamlData] = useState<any>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadYAMLAnalysis();
  }, [yamlAnalysisId]);

  const loadYAMLAnalysis = async () => {
    try {
      // Fetch YAML analysis
      const yamlRes = await fetch(`/api/yaml/upload?id=${yamlAnalysisId}`);
      if (!yamlRes.ok) throw new Error('Failed to load YAML analysis');
      const yamlData = await yamlRes.json();
      setYamlData(yamlData);

      // Fetch preview
      const previewRes = await fetch(`/api/yaml/generate-orders?yamlAnalysisId=${yamlAnalysisId}`);
      if (previewRes.ok) {
        const previewData = await previewRes.json();
        setPreview(previewData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOrders = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/yaml/generate-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yamlAnalysisId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to generate orders');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/trade-orders');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Trade Orders Generated!</h2>
          <p className="text-muted-foreground mb-4">
            {preview?.summary.totalOrders} trade orders created successfully
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to trades...</p>
        </div>
      </div>
    );
  }

  const assets: YAMLAsset[] = yamlData?.extractedAssets || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">YAML Analysis Review</h1>
            <p className="text-muted-foreground">
              Review and generate trade orders from your Elliott Wave analysis
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      {preview && preview.success && (
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Order Generation Preview</CardTitle>
            <CardDescription>Summary of trade orders that will be created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{preview.summary.totalOrders}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Orders</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  ${preview.summary.totalRiskAmount.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Risk</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {preview.summary.totalRiskPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Risk Percent</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${preview.summary.remainingDailyBudget.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Remaining Budget</div>
              </div>
            </div>

            {preview.warnings.length > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm">
                    {preview.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {(preview && !preview.success) || error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Unable to generate orders. Please check errors below.'}
            {preview?.errors && (
              <ul className="list-disc list-inside mt-2">
                {preview.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Assets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {assets.map((asset, index) => (
          <AssetCard key={index} asset={asset} preview={preview} />
        ))}
      </div>

      {/* Generate Button */}
      {preview && preview.success && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/yaml-upload')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateOrders}
            disabled={generating}
            size="lg"
            className="min-w-[200px]"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate {preview.summary.totalOrders} Trade Orders
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset, preview }: { asset: YAMLAsset; preview: PreviewData | null }) {
  const isBuy = asset.trading_setup.primary_entry?.type.toLowerCase().includes('buy');
  const Icon = isBuy ? TrendingUp : TrendingDown;
  const colorClass = isBuy ? 'text-green-600' : 'text-red-600';
  const bgClass = isBuy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

  return (
    <Card className={`border-2 ${bgClass}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${colorClass}`} />
            <div>
              <CardTitle className="text-xl">{asset.symbol}</CardTitle>
              {asset.wave_structure && (
                <CardDescription className="text-xs mt-1">
                  {asset.wave_structure}
                </CardDescription>
              )}
            </div>
          </div>
          {asset.confidence && (
            <Badge variant="outline" className="text-xs">
              {asset.confidence}% confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario */}
        {asset.scenario && (
          <div className="text-sm">
            <span className="font-medium">Scenario:</span>{' '}
            <span className="text-muted-foreground">{asset.scenario}</span>
          </div>
        )}

        {/* Entries */}
        <div className="space-y-2">
          {asset.trading_setup.primary_entry && (
            <div className="flex justify-between text-sm">
              <span className="font-medium">Primary Entry:</span>
              <span>{asset.trading_setup.primary_entry.price}</span>
            </div>
          )}
          {asset.trading_setup.secondary_entry && (
            <div className="flex justify-between text-sm">
              <span className="font-medium">Secondary Entry:</span>
              <span>{asset.trading_setup.secondary_entry.price}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="font-medium">Stop Loss:</span>
            <span className="text-red-600">{asset.trading_setup.stop_loss.price}</span>
          </div>
        </div>

        {/* Take Profits */}
        {asset.trading_setup.take_profit_targets && asset.trading_setup.take_profit_targets.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Take Profits:</div>
            {asset.trading_setup.take_profit_targets.map((tp, idx) => (
              <div key={idx} className="flex justify-between text-sm text-muted-foreground">
                <span>{tp.level}:</span>
                <span className="text-green-600">{tp.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* Invalidation */}
        {asset.trading_setup.invalidation && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-xs">
                <div className="font-medium">Invalidation: {asset.trading_setup.invalidation.price}</div>
                {asset.trading_setup.invalidation.rule && (
                  <div className="text-muted-foreground mt-1">
                    {asset.trading_setup.invalidation.rule}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Risk Info from Preview */}
        {preview && preview.ordersPreview && (
          <div className="pt-3 border-t">
            {preview.ordersPreview
              .filter((order: any) => order.symbol === asset.symbol)
              .map((order: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {idx === 0 ? 'Primary' : 'Secondary'} Risk:
                  </span>
                  <span className="font-medium">
                    ${order.riskAmount.toFixed(2)} ({order.riskPercent}%)
                  </span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
