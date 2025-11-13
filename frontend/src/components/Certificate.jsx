import { useState, useEffect } from 'react';
import { certificateAPI } from '../services/api';

export default function Certificate({ certificateData, onClose }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const certificateElement = document.getElementById('certificate-print');
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `Certificate-${certificateData.certificate_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download certificate. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-auto border-2 border-cyan-400/30 relative">
        {/* Animated Background Elements */}
        <div className="absolute top-4 left-4 w-20 h-20 border-2 border-cyan-400/20 rounded-lg rotate-45 animate-pulse" />
        <div className="absolute bottom-4 right-4 w-16 h-16 border-2 border-purple-400/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="p-6 relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold gradient-text">Digital Certificate</h2>
            <button
              onClick={onClose}
              className="text-cyan-400 hover:text-cyan-300 text-3xl transition-colors hover:scale-110"
            >
              ×
            </button>
          </div>

          {/* Futuristic Certificate Design */}
          <div 
            id="certificate-print"
            className="holographic border-2 border-cyan-400/40 bg-gradient-to-br from-deep-space/80 to-dark-void/90 p-8 text-center rounded-2xl relative overflow-hidden"
          >
            {/* Scan Line Effect */}
            <div className="scan-line absolute inset-0 pointer-events-none" />
            
            {/* Glowing Border */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-sm -z-10" />
            
            {/* Certificate Content */}
            <div className="relative z-10">
              <div className="mb-6">
                <div className="text-4xl font-bold neon-text mb-4">CERTIFICATE OF ACHIEVEMENT</div>
                <div className="text-xl text-gray-300 mb-6">This certifies the exceptional completion of</div>
              </div>

              <div className="my-8">
                <div className="text-3xl font-bold text-white mb-4 border-b-2 border-cyan-400/50 pb-4 inline-block px-8 relative">
                  {certificateData.student_name}
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 border-2 border-cyan-400 rotate-45 bg-dark-void" />
                </div>
              </div>

              <div className="text-lg text-gray-300 mb-6">
                has demonstrated mastery in the advanced course
              </div>

              <div className="text-2xl font-semibold gradient-text mb-8 py-2 px-4 inline-block rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                "{certificateData.course_title}"
              </div>

              {/* Signature Section */}
              <div className="grid grid-cols-2 gap-8 mt-12">
                <div className="text-center">
                  <div className="border-t-2 border-cyan-400/40 pt-4">
                    <div className="font-semibold text-cyan-400 text-lg">{certificateData.instructor_name}</div>
                    <div className="text-sm text-gray-400 mt-1">Master Instructor</div>
                    <div className="text-xs text-cyan-400/70 mt-2">Verified Signature</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-purple-400/40 pt-4">
                    <div className="font-semibold text-purple-400 text-lg">{formatDate(certificateData.issued_at)}</div>
                    <div className="text-sm text-gray-400 mt-1">Date of Completion</div>
                    <div className="text-xs text-purple-400/70 mt-2">Blockchain Timestamp</div>
                  </div>
                </div>
              </div>

              {/* Certificate ID */}
              <div className="mt-8 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-400/20">
                <div className="text-sm font-mono text-cyan-400">
                  Certificate ID: <span className="text-white">{certificateData.certificate_number}</span>
                </div>
                {certificateData.verification_url && (
                  <div className="text-xs text-gray-400 mt-2">
                    🔗 Verify authenticity: <span className="text-cyan-400 underline">{certificateData.verification_url}</span>
                  </div>
                )}
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-4 left-4 w-8 h-8 border-2 border-cyan-400/50 rounded rotate-45" />
              <div className="absolute top-4 right-4 w-8 h-8 border-2 border-purple-400/50 rounded rotate-45" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-2 border-pink-400/50 rounded rotate-45" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-2 border-neon-green/50 rounded rotate-45" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-cyber group relative overflow-hidden"
            >
              {downloading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Certificate...</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10 flex items-center space-x-2">
                    <span>Download Digital Certificate</span>
                    <span className="text-xl transition-transform group-hover:scale-110">📥</span>
                  </span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="btn-ghost group"
            >
              <span>Close Viewer</span>
              <span className="inline-block ml-2 transition-transform group-hover:rotate-90">✕</span>
            </button>
          </div>

          {/* Verification Badge */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center space-x-2 glass-card px-4 py-2">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-ping" />
              <span className="text-sm text-neon-green font-mono">✓ Blockchain Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}