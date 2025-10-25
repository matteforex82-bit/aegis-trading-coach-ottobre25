'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Check, AlertTriangle, Download, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  accountLogin: string;
  broker: string;
  isRegenerated?: boolean;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  accountLogin,
  broker,
  isRegenerated = false,
}: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInstructions = () => {
    const instructions = `
AEGIS Trading Coach - MT5 Expert Advisor Setup
==============================================

Account: ${broker} - ${accountLogin}
Generated: ${new Date().toLocaleString()}

API KEY (copy this):
${apiKey}

IMPORTANT: Save this key securely! You will NOT be able to see it again.

SETUP INSTRUCTIONS:
===================

1. Download the Expert Advisor
   - Go to: https://aegis-trading-coach.vercel.app/dashboard/accounts
   - Click "Download EA" button
   - Save AegisExecutionController.ex5 to MT5/Experts folder

2. Install in MetaTrader 5
   - Open MetaTrader 5
   - File → Open Data Folder
   - Navigate to MQL5/Experts
   - Copy AegisExecutionController.ex5 here
   - Restart MT5

3. Configure the Expert Advisor
   - In MT5 Navigator, find "AegisExecutionController" under Expert Advisors
   - Drag it onto any chart
   - In the settings window, go to "Inputs" tab
   - Find "API_KEY" field
   - Paste your API key: ${apiKey}
   - Verify "API_URL" is: https://aegis-trading-coach.vercel.app
   - Click OK

4. Enable WebRequest
   - In MT5, go to: Tools → Options
   - Select "Expert Advisors" tab
   - Check "Allow WebRequest for listed URL"
   - Add: https://aegis-trading-coach.vercel.app
   - Click OK

5. Verify Connection
   - Check the "Experts" tab at the bottom of MT5
   - You should see:
     ✅ Initialization complete. EA is now active.
     📡 Polling pending orders from server...
     ✅ Server response received

TROUBLESHOOTING:
================

❌ "API_KEY is not set!"
   → Make sure you pasted the key correctly in EA settings

❌ "WebRequest is not allowed"
   → Add the URL to allowed list in Tools → Options → Expert Advisors

❌ "401 Unauthorized"
   → Your API key may be invalid. Regenerate from dashboard.

NEED HELP?
==========
Visit: https://aegis-trading-coach.vercel.app/dashboard/accounts
Contact support if issues persist.
`;

    const blob = new Blob([instructions], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AEGIS_Setup_Instructions_${accountLogin}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRegenerated ? '🔄 API Key Regenerated' : '🎉 Account Created Successfully!'}
          </DialogTitle>
          <DialogDescription>
            {isRegenerated
              ? 'Your old API key has been deactivated. Update your MT5 EA with this new key.'
              : 'Your MT5 API key has been generated. Follow the instructions below to connect your EA.'}
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                  Save This Key Now!
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                  This is the ONLY time you'll see your API key. We don't store it in plain text.
                  If you lose it, you'll need to regenerate a new one.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Broker:</span>
              <span className="font-medium">{broker}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Login:</span>
              <span className="font-medium">{accountLogin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Generated:</span>
              <span className="font-medium">{new Date().toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* API Key Display */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Your API Key</CardTitle>
            <CardDescription>Copy this and paste it into your MT5 EA settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all select-all">
                {apiKey}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Setup Steps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Setup (3 Steps)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">1</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">Download & Install EA</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Download AegisExecutionController.ex5 and copy to MT5/Experts folder
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">2</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">Paste API Key</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag EA onto chart → Inputs tab → Paste key in "API_KEY" field
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">3</Badge>
              <div className="flex-1">
                <p className="font-medium text-sm">Enable WebRequest</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tools → Options → Expert Advisors → Allow WebRequest for:{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    https://aegis-trading-coach.vercel.app
                  </code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleDownloadInstructions} className="gap-2">
            <Download className="h-4 w-4" />
            Download Instructions
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('/dashboard/accounts', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Accounts
            </Button>
            <Button onClick={onClose}>I've Saved My Key</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
