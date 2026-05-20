import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-indigo-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Хуудас олдсонгүй</h1>
        <p className="text-gray-500 mb-8">
          Таны хайсан хуудас байхгүй эсвэл зөөгдсөн байна.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Хяналтын самбар руу буцах
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Нүүр хуудас
          </Link>
        </div>
      </div>
    </div>
  );
}
