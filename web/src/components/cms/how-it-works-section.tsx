const STEPS = [
  {
    icon: '📚',
    title: 'Бүртгүүлэх',
    desc: 'Сонирхсон сургалтаа сонгоод суралцаж эхлэх',
  },
  {
    icon: '🎓',
    title: 'Суралцах',
    desc: 'Видео, текст, тест хичээлүүдийг дуусгах',
  },
  {
    icon: '✅',
    title: 'Үнэлгээ',
    desc: 'Quiz, даалгаврыг гүйцэтгэж оноо авах',
  },
  {
    icon: '🏆',
    title: 'Гэрчилгээ',
    desc: 'Баталгаажсан сертификат авах',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Яаж суралцах вэ?</h2>
          <p className="text-gray-500 mt-2 text-base">Дөрвөн алхамаар мэдлэгээ дээшлүүлж гэрчилгээ ав</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, idx) => (
            <div key={step.title} className="relative flex flex-col items-center text-center">
              {idx < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-indigo-100" />
              )}
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mb-4 relative z-10">
                {step.icon}
              </div>
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-3">
                {idx + 1}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
