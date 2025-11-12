import { useState, useEffect } from 'react';
import { certificateAPI } from '../services/api';

export default function Certificate({ certificateData, onClose }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Create a printable version of the certificate
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Course Certificate</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Certificate Design */}
          <div 
            id="certificate-print"
            className="border-4 border-gold-500 bg-white p-8 text-center certificate-design"
          >
            <div className="mb-2">
              <div className="text-4xl font-bold text-blue-800 mb-2">CERTIFICATE OF COMPLETION</div>
              <div className="text-xl text-gray-600 mb-6">This is to certify that</div>
            </div>

            <div className="my-8">
              <div className="text-3xl font-bold text-gray-900 mb-2 border-b-2 border-blue-300 pb-4 inline-block px-8">
                {certificateData.student_name}
              </div>
            </div>

            <div className="text-lg text-gray-700 mb-6">
              has successfully completed the course
            </div>

            <div className="text-2xl font-semibold text-blue-700 mb-8">
              "{certificateData.course_title}"
            </div>

            <div className="grid grid-cols-2 gap-8 mt-12">
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2">
                  <div className="font-semibold">{certificateData.instructor_name}</div>
                  <div className="text-sm text-gray-600">Instructor</div>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-2">
                  <div className="font-semibold">{formatDate(certificateData.issued_at)}</div>
                  <div className="text-sm text-gray-600">Date of Completion</div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-sm text-gray-500">
              Certificate ID: {certificateData.certificate_number}
            </div>
            {certificateData.verification_url && (
              <div className="text-xs text-gray-400 mt-2">
                Verify at: {certificateData.verification_url}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                'Download Certificate'
              )}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}