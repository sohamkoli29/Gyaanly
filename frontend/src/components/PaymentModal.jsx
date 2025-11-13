import { useState, useEffect } from 'react';
import { paymentAPI } from '../services/api';

// Load Razorpay script
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export default function PaymentModal({ course, isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRazorpay();
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (!window.Razorpay) {
      setError('Payment gateway not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert price to paise (1 INR = 100 paise)
      const amount = Math.round(course.price * 100);
      console.log('Creating payment order for amount:', amount, 'paise');

      const orderData = await paymentAPI.createOrder(course.id, amount);

      // Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Gyaanly',
        description: `Payment for: ${course.title}`,
        image: '/logo.png',
        order_id: orderData.order_id,
        handler: async function (response) {
          setPaymentProcessing(true);
          
          try {
            // Verify payment
            const verificationData = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              payment_id: orderData.payment_id
            });

            if (verificationData.valid) {
              onSuccess(verificationData.enrollment);
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setError('Payment verification failed: ' + error.message);
          } finally {
            setPaymentProcessing(false);
          }
        },
        prefill: {
          name: course.profiles?.full_name || 'Student',
          email: '',
          contact: ''
        },
        notes: {
          course: course.title,
          course_id: course.id
        },
        theme: {
          color: '#00f0ff'
        },
        modal: {
          ondismiss: function() {
            if (!paymentProcessing) {
              onClose();
            }
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment initiation error:', error);
      setError('Failed to initiate payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-md w-full border-2 border-cyan-400/30 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-4 left-4 w-16 h-16 border-2 border-cyan-400/20 rounded-lg rotate-45 animate-pulse" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-2 border-purple-400/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Scan Line */}
        <div className="scan-line absolute inset-0 pointer-events-none" />

        <div className="p-6 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold gradient-text">Secure Payment Gateway</h3>
            <button
              onClick={onClose}
              disabled={paymentProcessing}
              className="text-cyan-400 hover:text-cyan-300 text-3xl transition-colors hover:scale-110 disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="glass-card bg-red-400/10 border-red-400/30 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Course Summary */}
          <div className="glass-card border-2 border-cyan-400/20 p-4 mb-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
            <h4 className="font-bold text-white text-lg mb-3 line-clamp-2">{course.title}</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Investment</span>
              <span className="text-3xl font-bold gradient-text">
                ₹{course.price}
              </span>
            </div>
          </div>

          {/* Payment Benefits */}
          <div className="space-y-4 mb-8">
            <h4 className="font-semibold text-cyan-400 text-lg flex items-center gap-2">
              <span>🎯</span>
              <span>What You'll Unlock:</span>
            </h4>
            <div className="grid gap-3 text-sm">
              {[
                { icon: '🔓', text: 'Full lifetime access with blockchain verification' },
                { icon: '🎬', text: 'All premium video lessons in 4K quality' },
                { icon: '💾', text: 'Downloadable resources & project files' },
                { icon: '🏆', text: 'Blockchain-verified certificate of completion' },
                { icon: '🤖', text: 'AI-powered Q&A support system' },
                { icon: '🔄', text: 'Future course updates included' }
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="text-cyan-400 group-hover:scale-110 transition-transform">
                    {benefit.icon}
                  </div>
                  <span className="text-gray-300 group-hover:text-cyan-400 transition-colors">
                    {benefit.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handlePayment}
              disabled={loading || paymentProcessing}
              className="w-full btn-cyber group relative overflow-hidden"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Initializing Secure Payment...</span>
                </div>
              ) : paymentProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Blockchain Transaction...</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    <span>Invest ₹{course.price}</span>
                    <span className="text-xl transition-transform group-hover:scale-110">⚡</span>
                  </span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={paymentProcessing}
              className="w-full btn-ghost group"
            >
              <span>Cancel Transaction</span>
              <span className="inline-block ml-2 transition-transform group-hover:rotate-90">✕</span>
            </button>
          </div>

          {/* Security & Trust Indicators */}
          <div className="mt-6 pt-6 border-t border-cyan-400/20">
            <div className="text-center space-y-3">
              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-sm text-cyan-400">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span>🔒 Military-Grade Encryption</span>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              </div>
              
              {/* Trust Partners */}
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <span>🛡️</span>
                  <span>Razorpay</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🔗</span>
                  <span>Blockchain</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🌐</span>
                  <span>PCI DSS</span>
                </div>
              </div>

              {/* Guarantee */}
              <div className="inline-flex items-center gap-2 glass-card px-3 py-1 mt-2">
                <span className="text-neon-green text-lg">✓</span>
                <span className="text-xs text-gray-300">30-Day Money Back Guarantee</span>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute -top-2 -right-2 w-4 h-4 border-2 border-cyan-400/30 rounded-full animate-ping" />
          <div className="absolute -bottom-2 -left-2 w-3 h-3 border-2 border-purple-400/30 rounded animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
      </div>
    </div>
  );
}