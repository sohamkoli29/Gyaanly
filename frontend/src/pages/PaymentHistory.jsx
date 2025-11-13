import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    checkAuth();
    fetchPayments();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const fetchPayments = async () => {
    try {
      const data = await paymentAPI.getPaymentHistory();
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return {
          color: 'text-neon-green',
          bg: 'bg-neon-green/20',
          border: 'border-neon-green/40',
          icon: '✅',
          label: 'Verified'
        };
      case 'created':
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/20',
          border: 'border-yellow-400/40',
          icon: '⏳',
          label: 'Processing'
        };
      case 'failed':
        return {
          color: 'text-red-400',
          bg: 'bg-red-400/20',
          border: 'border-red-400/40',
          icon: '❌',
          label: 'Failed'
        };
      default:
        return {
          color: 'text-gray-400',
          bg: 'bg-gray-400/20',
          border: 'border-gray-400/40',
          icon: '❓',
          label: 'Unknown'
        };
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10">
          <div className="text-center">
            <h1 className="text-4xl font-bold gradient-text mb-6">Transaction History</h1>
            <p className="text-gray-400 text-lg mb-8">Authenticate to access your payment records</p>
            <Link to="/login" className="btn-cyber">
              Access Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10">
          <h1 className="text-4xl font-bold gradient-text mb-8">Transaction Ledger</h1>
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="glass-card p-6 animate-pulse">
                <div className="h-6 skeleton rounded mb-4 w-3/4"></div>
                <div className="h-4 skeleton rounded mb-6 w-1/2"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="h-12 skeleton rounded-xl"></div>
                  <div className="h-12 skeleton rounded-xl"></div>
                  <div className="h-12 skeleton rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 relative">
      {/* Animated Background */}
      <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
      
      {/* Floating Elements */}
      <div className="absolute top-40 left-[10%] w-20 h-20 border-2 border-cyan-400/20 rounded-lg rotate-45 float" />
      <div className="absolute bottom-40 right-[15%] w-16 h-16 border-2 border-purple-400/20 rounded-full float" style={{ animationDelay: '2s' }} />

      <div className="container-cyber relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-4">
            <span className="notification-dot" />
            <span className="text-sm font-medium text-cyan-400">
              💰 Transaction Ledger
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
            Payment History
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Your complete transaction records with blockchain verification
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {[
            { key: 'all', label: 'All Transactions', icon: '📊' },
            { key: 'completed', label: 'Completed', icon: '✅' },
            { key: 'created', label: 'Processing', icon: '⏳' },
            { key: 'failed', label: 'Failed', icon: '❌' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300
                ${filter === tab.key
                  ? 'bg-cyan-400/20 text-cyan-400 shadow-neon-sm'
                  : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10'
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {filteredPayments.length === 0 ? (
          <div className="glass-card text-center p-12 max-w-2xl mx-auto">
            <div className="text-6xl mb-6 float">💎</div>
            <h2 className="text-2xl font-bold gradient-text mb-4">
              No Transactions Found
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              {filter === 'all' 
                ? "Your transaction ledger is empty. Start your learning journey to see payment records here."
                : `No ${filter} transactions found in your records.`
              }
            </p>
            <Link to="/courses" className="btn-cyber group">
              <span>Explore Premium Courses</span>
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPayments.map((payment) => {
              const statusConfig = getStatusConfig(payment.status);
              
              return (
                <div 
                  key={payment.id} 
                  className="glass-card holographic card-hover border-2 border-cyan-400/20 relative overflow-hidden"
                >
                  {/* Scan Line */}
                  <div className="scan-line absolute inset-0 pointer-events-none" />
                  
                  {/* Header */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                        {payment.courses?.title || 'Course Purchase'}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="font-mono bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">
                          ID: {payment.razorpay_order_id}
                        </span>
                        <span>🔗 Blockchain Verified</span>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-medium
                      ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}
                    `}>
                      <span>{statusConfig.icon}</span>
                      <span className="text-sm">{statusConfig.label}</span>
                    </div>
                  </div>

                  {/* Payment Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold gradient-text mb-2">
                        ₹{payment.amount}
                      </div>
                      <div className="text-sm text-gray-400 uppercase tracking-wider">
                        Investment
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-semibold text-white mb-2">
                        {formatDate(payment.created_at)}
                      </div>
                      <div className="text-sm text-gray-400 uppercase tracking-wider">
                        Transaction Date
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-mono text-cyan-400 text-sm mb-2 truncate">
                        {payment.razorpay_payment_id || 'Pending...'}
                      </div>
                      <div className="text-sm text-gray-400 uppercase tracking-wider">
                        Payment ID
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-cyan-400/20">
                    {payment.courses && (
                      <Link 
                        to={`/courses/${payment.course_id}`}
                        className="btn-ghost group text-sm"
                      >
                        <span>Access Course</span>
                        <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">🎯</span>
                      </Link>
                    )}
                    
                    {payment.status === 'completed' && (
                      <div className="flex items-center gap-2 text-neon-green">
                        <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                        <span className="font-medium">✓ Transaction Secured</span>
                      </div>
                    )}
                  </div>

                  {/* Corner Accents */}
                  <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 border-cyan-400/50" />
                  <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 border-purple-400/50" />
                  <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 border-pink-400/50" />
                  <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 border-neon-green/50" />
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {payments.length > 0 && (
          <div className="mt-16 glass-card p-8">
            <h3 className="text-2xl font-bold gradient-text mb-6 text-center">Financial Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">{payments.length}</div>
                <div className="text-sm text-gray-400">Total Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-neon-green">
                  {payments.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-400">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {payments.filter(p => p.status === 'created').length}
                </div>
                <div className="text-sm text-gray-400">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">
                  ₹{payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)}
                </div>
                <div className="text-sm text-gray-400">Total Invested</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}