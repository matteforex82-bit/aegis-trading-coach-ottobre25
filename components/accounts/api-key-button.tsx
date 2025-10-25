'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Key, RefreshCw } from 'lucide-react';
import { ApiKeyModal } from './api-key-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApiKeyButtonProps {
  accountId: string;
  accountLogin: string;
  broker: string;
}

export function ApiKeyButton({ accountId, accountLogin, broker }: ApiKeyButtonProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const handleRegenerateClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmRegenerate = async () => {
    setShowConfirmDialog(false);
    setIsRegenerating(true);

    try {
      const response = await fetch(`/api/accounts/${accountId}/api-key`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate API key');
      }

      // Show the new key in modal
      setGeneratedKey(data.apiKey.key);
      setShowApiKeyModal(true);
    } catch (error: any) {
      console.error('Failed to regenerate API key:', error);
      alert(error.message || 'Failed to regenerate API key');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRegenerateClick}
        disabled={isRegenerating}
        className="gap-2"
      >
        {isRegenerating ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Key className="h-4 w-4" />
        )}
        API Key
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate your current API key and generate a new one.
              Your MT5 Expert Advisor will stop working until you update it with the new key.
              <br />
              <br />
              <strong>Are you sure you want to continue?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegenerate}>
              Yes, Regenerate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API Key Modal */}
      {generatedKey && (
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => {
            setShowApiKeyModal(false);
            setGeneratedKey(null);
          }}
          apiKey={generatedKey}
          accountLogin={accountLogin}
          broker={broker}
          isRegenerated={true}
        />
      )}
    </>
  );
}
