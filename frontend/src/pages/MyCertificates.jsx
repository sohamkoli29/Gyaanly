import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { certificateAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import Certificate from '../components/Certificate';

export default function MyCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
    fetchCertificates();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const fetchCertificates = async () => {
    try {
      const data = await certificateAPI.getMyCertificates();
      setCertificates(data.certificates || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10">
          <div className="text-center">
            <h1 className="text-4xl font-bold gradient-text mb-6">Digital Certificates</h1>
            <p className="text-gray-400 text-lg mb-8">Please authenticate to access your achievement portfolio</p>
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
          <h1 className="text-4xl font-bold gradient-text mb-8">Achievement Portfolio</h1>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass-card p-6 animate-pulse">
                <div className="h-48 skeleton rounded-xl mb-4" />
                <div className="h-4 skeleton rounded mb-3" />
                <div className="h-3 skeleton rounded mb-4 w-3/4" />
                <div className="h-10 skeleton rounded" />
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
              🏆 Achievement Portfolio
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
            Digital Certificates
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Your verified achievements and blockchain-certified credentials
          </p>
        </div>

        {selectedCertificate && (
          <Certificate
            certificateData={selectedCertificate}
            onClose={() => setSelectedCertificate(null)}
          />
        )}

        {certificates.length === 0 ? (
          <div className="glass-card text-center p-12 max-w-2xl mx-auto">
            <div className="text-6xl mb-6 float">🚀</div>
            <h2 className="text-2xl font-bold gradient-text mb-4">
              Begin Your Learning Journey
            </h2>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Complete advanced courses to unlock exclusive digital certificates and build your professional portfolio
            </p>
            <Link to="/courses" className="btn-cyber group">
              <span>Explore Courses</span>
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Link>
            
            {/* Achievement Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6 text-center">
              <div className="glass-card p-4">
                <div className="text-2xl font-bold text-cyan-400">0</div>
                <div className="text-sm text-gray-400">Certificates</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-2xl font-bold text-purple-400">∞</div>
                <div className="text-sm text-gray-400">Potential</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-2xl font-bold text-neon-green">100%</div>
                <div className="text-sm text-gray-400">Ready to Learn</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {certificates.map((certificate) => (
              <div 
                key={certificate.id} 
                className="glass-card holographic card-hover group cursor-pointer relative overflow-hidden"
              >
                {/* Certificate Header */}
                <div className="bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 p-4 border-b border-cyan-400/30 relative">
                  <div className="absolute top-2 right-2 w-3 h-3 bg-neon-green rounded-full animate-pulse" />
                  <h3 className="text-lg font-bold text-white truncate pr-6">{certificate.course_title}</h3>
                  <p className="text-sm text-cyan-400 font-medium">Verified Achievement</p>
                </div>
                
                <div className="p-6">
                  {/* Student Info */}
                  <div className="mb-6">
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Issued To</p>
                    <p className="font-semibold text-white text-lg">{certificate.student_name}</p>
                  </div>
                  
                  {/* Certificate ID */}
                  <div className="mb-6">
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Certificate ID</p>
                    <p className="font-mono text-sm text-cyan-400 bg-cyan-400/10 px-3 py-2 rounded-lg border border-cyan-400/20">
                      {certificate.certificate_number}
                    </p>
                  </div>
                  
                  {/* Completion Date */}
                  <div className="mb-6">
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Completed</p>
                    <p className="text-white font-medium">{formatDate(certificate.completed_at)}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedCertificate(certificate)}
                      className="w-full btn-cyber group relative overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center justify-center space-x-2">
                        <span>View Certificate</span>
                        <span className="text-lg transition-transform group-hover:scale-110">👁️</span>
                      </span>
                    </button>
                    
                    {certificate.courses?.thumbnail_url && (
                      <Link 
                        to={`/courses/${certificate.course_id}`}
                        className="w-full btn-ghost group text-center flex items-center justify-center"
                      >
                        <span>Course Details</span>
                        <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Holographic Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Corner Accents */}
                <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-cyan-400/50" />
                <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-purple-400/50" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-pink-400/50" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-neon-green/50" />
              </div>
            ))}
          </div>
        )}

        {/* Achievement Stats */}
        {certificates.length > 0 && (
          <div className="mt-16 glass-card p-8 text-center">
            <h3 className="text-2xl font-bold gradient-text mb-6">Learning Milestones</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card p-4">
                <div className="text-3xl font-bold text-cyan-400">{certificates.length}</div>
                <div className="text-sm text-gray-400">Certificates Earned</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-3xl font-bold text-purple-400">
                  {new Set(certificates.map(c => c.course_id)).size}
                </div>
                <div className="text-sm text-gray-400">Courses Completed</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-3xl font-bold text-neon-green">
                  {Math.max(...certificates.map(c => new Date(c.completed_at).getFullYear()))}
                </div>
                <div className="text-sm text-gray-400">Latest Achievement</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-3xl font-bold text-pink-400">100%</div>
                <div className="text-sm text-gray-400">Verification Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}