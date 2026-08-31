'use client';

import { useEffect, useRef, useState } from 'react';

interface WhopCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  onSuccess: () => void;
  metadata?: Record<string, any>;
}

export default function WhopCheckoutModal({
  isOpen,
  onClose,
  productId,
  onSuccess,
  metadata = {},
}: WhopCheckoutModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const checkoutRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    setIsLoading(true);

    // 🔥 Load Whop checkout script (CDN method - most reliable)
    const loadCheckout = () => {
      // @ts-ignore - WhopCheckout is loaded from CDN
      if (window.WhopCheckout) {
        mountCheckout();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.whop.com/checkout.js';
      script.async = true;
      script.onload = () => {
        mountCheckout();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Whop checkout');
        setIsLoading(false);
      };
      document.body.appendChild(script);

      return () => {
        const el = document.querySelector('script[src="https://js.whop.com/checkout.js"]');
        if (el) el.remove();
      };
    };

    const mountCheckout = () => {
      try {
        // @ts-ignore - WhopCheckout is loaded from CDN
        const WhopCheckout = window.WhopCheckout;
        if (!WhopCheckout) {
          console.error('❌ WhopCheckout not available');
          setIsLoading(false);
          return;
        }

        const checkout = WhopCheckout.init({
          productId: productId,
          onSuccess: (data: any) => {
            console.log('✅ Payment successful!', data);
            onSuccess();
            onClose();
          },
          onCancel: () => {
            console.log('❌ Payment cancelled');
            onClose();
          },
          onError: (error: any) => {
            console.error('❌ Payment error:', error);
            onClose();
          },
          metadata: metadata,
        });

        checkout.mount(containerRef.current);
        checkoutRef.current = checkout;
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Failed to mount Whop checkout:', error);
        setIsLoading(false);
      }
    };

    loadCheckout();

    return () => {
      if (checkoutRef.current && typeof checkoutRef.current.destroy === 'function') {
        checkoutRef.current.destroy();
      }
    };
  }, [isOpen, productId, onSuccess, onClose, metadata]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">💳 Complete Payment</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Checkout Container */}
        <div ref={containerRef} className="p-4 min-h-[400px]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Loading secure checkout...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}