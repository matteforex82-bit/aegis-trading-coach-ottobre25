"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function TestCheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<any>(null)

  const testCheckout = async (plan: string) => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      console.log('[Test] Calling /api/checkout with plan:', plan)

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      })

      const data = await res.json()

      console.log('[Test] Response status:', res.status)
      console.log('[Test] Response data:', data)

      setResponse({ status: res.status, data })

      if (res.ok && data.url) {
        console.log('[Test] Redirecting to:', data.url)
        window.location.href = data.url
      } else {
        setError(data.message || data.error || 'Unknown error')
      }
    } catch (err: any) {
      console.error('[Test] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Test Stripe Checkout</CardTitle>
          <p className="text-sm text-muted-foreground">
            Questa è una pagina di test per verificare l'integrazione Stripe
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Test Checkout Session Creation:</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => testCheckout('starter')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Test Starter Plan
              </Button>
              <Button
                onClick={() => testCheckout('pro')}
                disabled={loading}
                variant="default"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Test Pro Plan
              </Button>
              <Button
                onClick={() => testCheckout('enterprise')}
                disabled={loading}
                variant="secondary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Test Enterprise Plan
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Error:</h4>
              <pre className="text-sm text-red-800 whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {response && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Response:</h4>
              <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Note:</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>✓ Devi essere loggato per testare</li>
              <li>✓ Apri la console del browser (F12) per vedere i log dettagliati</li>
              <li>✓ Se funziona, verrai reindirizzato a Stripe Checkout</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Environment Info:</h4>
            <p className="text-sm text-muted-foreground">
              Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
