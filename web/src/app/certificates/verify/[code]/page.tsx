'use client';

import { useVerifyCertificate } from '@/hooks/use-certificate';
import { formatDate } from '@/lib/format';

export default function VerifyCertificatePage({ params }: { params: { code: string } }) {
  const { code } = params;
  const { data, isLoading, isError } = useVerifyCertificate(code);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Гэрчилгээ шалгаж байна...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-5xl mb-4">❌</p>
          <h1 className="text-xl font-bold text-red-600 mb-2">Гэрчилгээ олдсонгүй</h1>
          <p className="text-gray-500 text-sm">
            <code className="bg-gray-100 px-1 rounded text-xs">{code}</code> баталгаажуулах код бүртгэлтэй гэрчилгээтэй тохирохгүй байна.
          </p>
        </div>
      </div>
    );
  }

  const { valid, pending, certificate: cert } = data;

  // PENDING: гаднаас шалгах боломжгүй
  if (pending) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-5xl mb-4">📋</p>
          <h1 className="text-xl font-bold text-yellow-700 mb-2">Гэрчилгээ баталгаажаагүй байна</h1>
          <p className="text-gray-500 text-sm">
            Энэ гэрчилгээ одоогоор сурагчийн баталгаажуулалтыг хүлээж байгаа тул хүчинтэй биш байна.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${valid ? 'bg-gradient-to-br from-amber-50 to-yellow-50' : 'bg-red-50'}`}>
      <div className="w-full max-w-lg">

        {/* Хүчинтэй эсэх banner */}
        <div className={`rounded-xl p-4 mb-5 flex items-center gap-3 ${valid ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
          <span className="text-2xl">{valid ? '✅' : '🚫'}</span>
          <div>
            <p className={`font-semibold ${valid ? 'text-green-800' : 'text-red-700'}`}>
              {valid ? 'Гэрчилгээ хүчинтэй' : 'Гэрчилгээ цуцлагдсан'}
            </p>
            <p className="text-sm text-gray-600">
              {valid
                ? 'Энэ гэрчилгээ жинхэнэ бөгөөд платформоос олгогдсон.'
                : 'Энэ гэрчилгээ цуцлагдсан тул хүчин төгөлдөр биш байна.'}
            </p>
          </div>
        </div>

        {/* Гэрчилгээний дэлгэрэнгүй */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 text-white text-center">
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Дүүргэсний гэрчилгээ</p>
            <p className="text-lg font-bold">{cert.title}</p>
          </div>

          <div className="p-6 text-center">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-gray-500 text-sm mb-1">Гэрчилгээ олгох нь:</p>
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-amber-300 inline-block pb-1 mb-3">
              {cert.recipientName}
            </h2>
            {cert.description && (
              <p className="text-gray-600 text-sm mb-4">
                <span className="font-medium">{cert.description}</span> сургалтыг амжилттай дүүргэсэн болохыг гэрчилнэ
              </p>
            )}

            <div className="border-t pt-4 mt-2 grid grid-cols-2 gap-3 text-left text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Олгосон</p>
                <p className="font-medium text-gray-800">{cert.issuerName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Олгосон огноо</p>
                <p className="font-medium text-gray-800">{formatDate(cert.issuedAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Дүүргэсэн огноо</p>
                <p className="font-medium text-gray-800">{formatDate(cert.completedAt)}</p>
              </div>
              {cert.expiresAt && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Хүртэл хүчинтэй</p>
                  <p className="font-medium text-gray-800">{formatDate(cert.expiresAt)}</p>
                </div>
              )}
            </div>

            {cert.qrCodeUrl && (
              <div className="mt-4 flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cert.qrCodeUrl}
                  alt="Баталгаажуулах QR код"
                  className="w-24 h-24 border rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            <p className="mt-4 text-[10px] text-gray-400 break-all">
              Баталгаажуулах код: {cert.verifyCode}
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Платформоос шалгасан
        </p>
      </div>
    </div>
  );
}
