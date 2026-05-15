'use client';

import { useVerifyCertificate } from '@/hooks/use-certificate';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function VerifyCertificatePage({ params }: { params: { code: string } }) {
  const { code } = params;
  const { data, isLoading, isError } = useVerifyCertificate(code);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying certificate…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-5xl mb-4">❌</p>
          <h1 className="text-xl font-bold text-red-600 mb-2">Certificate Not Found</h1>
          <p className="text-gray-500 text-sm">
            The verification code <code className="bg-gray-100 px-1 rounded text-xs">{code}</code> does not match any certificate in our records.
          </p>
        </div>
      </div>
    );
  }

  const { valid, certificate: cert } = data;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${valid ? 'bg-gradient-to-br from-amber-50 to-yellow-50' : 'bg-red-50'}`}>
      <div className="w-full max-w-lg">

        {/* Validity banner */}
        <div className={`rounded-xl p-4 mb-5 flex items-center gap-3 ${valid ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
          <span className="text-2xl">{valid ? '✅' : '🚫'}</span>
          <div>
            <p className={`font-semibold ${valid ? 'text-green-800' : 'text-red-700'}`}>
              {valid ? 'Certificate is Valid' : 'Certificate has been Revoked'}
            </p>
            <p className="text-sm text-gray-600">
              {valid ? 'This certificate is authentic and was issued by LMS Platform.' : 'This certificate has been revoked and is no longer valid.'}
            </p>
          </div>
        </div>

        {/* Certificate display */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl overflow-hidden shadow-lg">
          {/* Decorative header */}
          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 text-white text-center">
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">LMS Platform</p>
            <p className="text-lg font-bold">Certificate of Achievement</p>
          </div>

          <div className="p-6 text-center">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-gray-500 text-sm mb-1">This is to certify that</p>
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-300 inline-block pb-1 mb-3">
              {cert.recipientName}
            </h2>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{cert.title}</h3>
            {cert.description && (
              <p className="text-gray-600 text-sm mb-4">
                has successfully completed <span className="font-medium">{cert.description}</span>
              </p>
            )}

            <div className="border-t pt-4 mt-2 grid grid-cols-2 gap-3 text-left text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Issued By</p>
                <p className="font-medium text-gray-800">{cert.issuerName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Issue Date</p>
                <p className="font-medium text-gray-800">{formatDate(cert.issuedAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Completed</p>
                <p className="font-medium text-gray-800">{formatDate(cert.completedAt)}</p>
              </div>
              {cert.expiresAt && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Valid Until</p>
                  <p className="font-medium text-gray-800">{formatDate(cert.expiresAt)}</p>
                </div>
              )}
            </div>

            {/* QR code if available */}
            {cert.qrCodeUrl && (
              <div className="mt-4 flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cert.qrCodeUrl}
                  alt="Verification QR Code"
                  className="w-24 h-24 border rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            <p className="mt-4 text-[10px] text-gray-400 break-all">
              Verification ID: {cert.verifyCode}
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <span className="font-medium">LMS Platform</span>
        </p>
      </div>
    </div>
  );
}
