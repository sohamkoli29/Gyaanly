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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">My Certificates</h1>
          <p className="text-gray-600 mb-6">Please log in to view your certificates.</p>
          <Link to="/login" className="btn-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Certificates</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Certificates</h1>

      {selectedCertificate && (
        <Certificate
          certificateData={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

      {certificates.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-2xl font-bold text-gray-600 mb-4">No certificates yet</h2>
          <p className="text-gray-500 mb-6">Complete courses to earn certificates!</p>
          <Link to="/courses" className="btn-primary">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border-2 border-gold-200">
              <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-4 text-white">
                <h3 className="text-lg font-semibold truncate">{certificate.course_title}</h3>
                <p className="text-sm opacity-90">Certificate of Completion</p>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Issued to</p>
                  <p className="font-semibold text-gray-900">{certificate.student_name}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Certificate ID</p>
                  <p className="font-mono text-sm text-gray-700">{certificate.certificate_number}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Completed on</p>
                  <p className="text-gray-900">{formatDate(certificate.completed_at)}</p>
                </div>

                <button
                  onClick={() => setSelectedCertificate(certificate)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  View Certificate
                </button>
                
                {certificate.courses?.thumbnail_url && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link 
                      to={`/courses/${certificate.course_id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Course →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}