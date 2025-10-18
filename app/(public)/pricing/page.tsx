import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing - AEGIS Trading Coach',
  description: 'Choose the perfect plan for your trading journey. Simple, transparent pricing.',
}

const plans = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out AEGIS',
    features: [
      '1 Trading Account',
      '1 API Key',
      '7 Days Data Retention',
      'Basic Analytics',
      'Community Support',
    ],
    limitations: [
      'No Advanced Analytics',
      'No Priority Support',
      'Limited Data History',
    ],
    cta: 'Get Started',
    href: '/auth/signup',
    popular: false,
  },
  {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_PRICE_STARTER,
    description: 'For individual traders',
    features: [
      '1 Trading Account',
      '2 API Keys',
      '30 Days Data Retention',
      'Basic Analytics',
      'Email Support',
      'MT5/MT4 Integration',
    ],
    cta: 'Subscribe Now',
    href: '/auth/signup?plan=starter',
    popular: false,
  },
  {
    name: 'Pro',
    price: 99,
    priceId: process.env.STRIPE_PRICE_PRO,
    description: 'For serious traders',
    features: [
      '5 Trading Accounts',
      '5 API Keys',
      '90 Days Data Retention',
      'Advanced Analytics',
      'Performance Insights',
      'Priority Support',
      'Custom Alerts',
      'Export Reports',
    ],
    cta: 'Subscribe Now',
    href: '/auth/signup?plan=pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 299,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE,
    description: 'For trading teams & prop firms',
    features: [
      'Unlimited Trading Accounts',
      'Unlimited API Keys',
      '365 Days Data Retention',
      'Advanced Analytics',
      'Custom Branding',
      'Dedicated Support',
      'API Access',
      'Team Management',
      'Custom Integration',
      'SLA Guarantee',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            AEGIS
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </Link>
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          Choose the plan that fits your trading needs
        </p>
        <p className="text-sm text-muted-foreground">
          All plans include immediate access to all features
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${
                plan.popular
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation) => (
                    <li
                      key={limitation}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <span className="text-sm">× {limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Link href={plan.href} className="w-full">
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Can I change plans later?
              </h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                How does billing work?
              </h3>
              <p className="text-muted-foreground">
                You'll be charged immediately upon subscription. Your subscription renews monthly until you cancel. You can cancel anytime from your dashboard.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-muted-foreground">
                Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact support for a full refund.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Can I use AEGIS with multiple brokers?
              </h3>
              <p className="text-muted-foreground">
                Yes! AEGIS works with any MT4/MT5 broker. Simply connect multiple accounts within your plan limits.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Is my trading data secure?
              </h3>
              <p className="text-muted-foreground">
                Absolutely. We use bank-level encryption (AES-256) and never store your broker credentials. All data is encrypted at rest and in transit.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to elevate your trading?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of traders who trust AEGIS for their performance tracking.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="px-8">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/pricing" className="hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-primary">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Account</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/auth/signin" className="hover:text-primary">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signup" className="hover:text-primary">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 AEGIS Trading Coach. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
