import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Visual indicator showing current Stripe mode (Test/Live)
 * Only shows in test mode to prevent confusion
 */
export default function StripeModeBadge() {
  const STRIPE_MODE = import.meta.env.VITE_STRIPE_MODE || 'test';
  
  // Only show badge in test mode
  if (STRIPE_MODE === 'live') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-pulse">
      <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <div>
          <div className="font-semibold text-sm">Test Mode</div>
          <div className="text-xs opacity-90">Using Stripe test keys</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline badge for checkout pages
 */
export function StripeModeBadgeInline() {
  const STRIPE_MODE = import.meta.env.VITE_STRIPE_MODE || 'test';
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
      STRIPE_MODE === 'live' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-yellow-100 text-yellow-800'
    }`}>
      {STRIPE_MODE === 'live' ? (
        <>
          <CheckCircle className="w-4 h-4" />
          <span>Live Payments</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4" />
          <span>Test Mode</span>
        </>
      )}
    </div>
  );
}
