'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface UploadResult {
  status: 'success' | 'error';
  message?: string;
  analysisId?: string;
  assetsCount?: number;
  assets?: Array<{
    symbol: string;
    scenario: string;
    direction: string;
    entry: number;
    stopLoss: number;
    takeProfit?: number;
    invalidation?: number;
  }>;
  error?: string;
  validationErrors?: string[];
}

export default function YAMLUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccount(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file extension
      if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml') && !file.name.endsWith('.txt')) {
        alert('Please upload a YAML (.yaml, .yml) or TXT file');
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedAccount) {
      alert('Please select a file and account');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('accountId', selectedAccount);

      const response = await fetch('/api/yaml/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // Redirect to review page
        router.push(`/dashboard/yaml-review/${result.analysisId}`);
      } else {
        setUploadResult({
          status: 'error',
          error: result.error || 'Upload failed',
          validationErrors: result.validationErrors,
        });
      }
    } catch (error: any) {
      setUploadResult({
        status: 'error',
        error: error.message || 'Network error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">YAML Setup Upload</h1>
        <p className="text-muted-foreground mt-2">
          Upload your Elliott Wave trading setups in YAML format
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload YAML File
          </CardTitle>
          <CardDescription>
            Select your trading account and upload a YAML file with your Elliott Wave analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Trading Account</label>
            {loadingAccounts ? (
              <div className="text-sm text-muted-foreground">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No trading accounts found. Please add an account first.
                </AlertDescription>
              </Alert>
            ) : (
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.login} - {account.broker} ({account.accountType})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium mb-2">YAML File</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".yaml,.yml,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
              />
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedAccount || isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload & Validate'}
          </Button>
        </CardContent>
      </Card>

      {/* Upload Result */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.status === 'success' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Upload Successful
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  Upload Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadResult.status === 'success' ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {uploadResult.message}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                  <div>
                    <div className="text-sm font-medium">Analysis ID</div>
                    <div className="text-xs text-muted-foreground font-mono">{uploadResult.analysisId}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Assets Found</div>
                    <div className="text-2xl font-bold">{uploadResult.assetsCount}</div>
                  </div>
                </div>

                {uploadResult.assets && uploadResult.assets.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Extracted Trading Setups</h3>
                    <div className="space-y-3">
                      {uploadResult.assets.map((asset, index) => (
                        <div key={index} className="p-3 border rounded-md bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-lg">{asset.symbol}</div>
                            <div className={`px-2 py-1 rounded text-xs font-semibold ${
                              asset.direction.includes('buy')
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {asset.direction.toUpperCase()}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Entry:</span>{' '}
                              <span className="font-medium">{asset.entry}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Stop Loss:</span>{' '}
                              <span className="font-medium">{asset.stopLoss}</span>
                            </div>
                            {asset.takeProfit && (
                              <div>
                                <span className="text-muted-foreground">Take Profit:</span>{' '}
                                <span className="font-medium">{asset.takeProfit}</span>
                              </div>
                            )}
                            {asset.invalidation && (
                              <div>
                                <span className="text-muted-foreground">Invalidation:</span>{' '}
                                <span className="font-medium text-red-600">{asset.invalidation}</span>
                              </div>
                            )}
                          </div>
                          {asset.scenario && asset.scenario !== 'N/A' && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Scenario: {asset.scenario}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <Button onClick={() => {
                    setSelectedFile(null);
                    setUploadResult(null);
                  }}>
                    Upload Another File
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/dashboard/trade-entry'}>
                    Create Trade Orders
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {uploadResult.error}
                  </AlertDescription>
                </Alert>

                {uploadResult.validationErrors && uploadResult.validationErrors.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-600">Validation Errors:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {uploadResult.validationErrors.map((error, index) => (
                        <li key={index} className="text-red-700">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={() => setUploadResult(null)}>
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>YAML Format Requirements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Your YAML file must include:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
            <li><code>assets</code> array with at least one trading setup</li>
            <li>Each asset must have: <code>symbol</code>, <code>trading_setup</code></li>
            <li><code>trading_setup</code> must have: <code>primary_entry</code> (or <code>secondary_entry</code>), <code>stop_loss</code></li>
            <li><code>primary_entry</code> must have: <code>type</code> (buy_limit/sell_limit), <code>price</code></li>
            <li><code>stop_loss</code> must have: <code>price</code></li>
            <li>Optional but recommended: <code>take_profit_targets</code>, <code>invalidation</code></li>
          </ul>
          <div className="mt-4">
            <a
              href="/test-elliott-wave-setup.yaml"
              download
              className="text-primary hover:underline text-sm font-medium"
            >
              Download Example YAML Template
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
