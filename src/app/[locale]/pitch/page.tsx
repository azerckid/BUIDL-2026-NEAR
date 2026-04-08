'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ShieldCheck, DatabaseZap, Workflow,
  Activity, Cpu, Sparkles, TrendingUp, Layers, Milestone, Presentation,
} from 'lucide-react';

export default function PitchDeck() {
  const t = useTranslations('pitch');
  const [current, setCurrent] = useState(0);

  const slides = [
    {
      title: t('s1.title'),
      subtitle: t('s1.subtitle'),
      icon: <ShieldCheck className="w-16 h-16 text-emerald-400" />,
      content: (
        <div className="flex flex-col items-center justify-center space-y-4 text-center mt-12">
          <p className="text-xl text-slate-300">{t('s1.hackathon')}</p>
          <div className="flex space-x-4 mt-8">
            <span className="px-4 py-2 bg-slate-800 rounded-full text-sm text-slate-300 border border-slate-700">{t('s1.tag1')}</span>
            <span className="px-4 py-2 bg-slate-800 rounded-full text-sm text-slate-300 border border-slate-700">{t('s1.tag2')}</span>
            <span className="px-4 py-2 bg-slate-800 rounded-full text-sm text-slate-300 border border-slate-700">{t('s1.tag3')}</span>
          </div>
        </div>
      ),
    },
    {
      title: t('s2.title'),
      subtitle: t('s2.subtitle'),
      icon: <Activity className="w-12 h-12 text-rose-400" />,
      content: (
        <ul className="space-y-6 text-lg text-slate-300 mt-8">
          {(['p1', 'p2', 'p3'] as const).map((key, i) => (
            <li key={key} className="flex items-start">
              <span className="text-rose-400 font-bold mr-4">{i + 1}.</span>
              <div>
                <strong className="text-white block mb-1">{t(`s2.${key}Title`)}</strong>
                {t(`s2.${key}Desc`)}
              </div>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: t('s3.title'),
      subtitle: t('s3.subtitle'),
      icon: <DatabaseZap className="w-12 h-12 text-cyan-400" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {(['c1', 'c2', 'c3'] as const).map((key) => (
            <div key={key} className="p-6 bg-slate-800/50 border border-cyan-900/30 rounded-2xl">
              <div className="text-cyan-400 font-semibold mb-3 text-xl">{t(`s3.${key}Title`)}</div>
              <p className="text-slate-300">{t(`s3.${key}Desc`)}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t('s4.title'),
      subtitle: t('s4.subtitle'),
      icon: <Workflow className="w-12 h-12 text-fuchsia-400" />,
      content: (
        <div className="flex flex-col space-y-4 mt-8">
          {(['step1', 'step2', 'step3', 'step4', 'step5'] as const).map((key, i) => (
            <div key={key} className="flex items-center p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-fuchsia-900/50 text-fuchsia-300 font-bold mr-4 shrink-0">
                {i + 1}
              </div>
              <span className="text-slate-200 text-lg">{t(`s4.${key}`)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t('s5.title'),
      subtitle: t('s5.subtitle'),
      icon: <Cpu className="w-12 h-12 text-amber-400" />,
      content: (
        <div className="space-y-4 mt-8">
          {(['b1', 'b2', 'b3'] as const).map((key) => (
            <div key={key} className="p-5 border-l-4 border-amber-500 bg-slate-800/30">
              <h4 className="text-amber-400 font-bold mb-1">{t(`s5.${key}Title`)}</h4>
              <p className="text-slate-300">{t(`s5.${key}Desc`)}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t('s6.title'),
      subtitle: t('s6.subtitle'),
      icon: <Sparkles className="w-12 h-12 text-indigo-400" />,
      content: (
        <div className="mt-8">
          <p className="text-xl text-slate-200 leading-relaxed mb-6">{t('s6.p')}</p>
          <div className="p-6 bg-indigo-950/30 border border-indigo-900/50 rounded-xl">
            <h4 className="text-white font-bold opacity-80 mb-2">{t('s6.boxTitle')}</h4>
            <p className="text-slate-300">{t('s6.boxDesc')}</p>
          </div>
        </div>
      ),
    },
    {
      title: t('s7.title'),
      subtitle: t('s7.subtitle'),
      icon: <TrendingUp className="w-12 h-12 text-emerald-400" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="space-y-6">
            <div>
              <h4 className="text-emerald-400 font-bold text-xl mb-2">{t('s7.r1Title')}</h4>
              <p className="text-slate-300">{t('s7.r1Desc')}</p>
            </div>
            <div>
              <h4 className="text-emerald-400 font-bold text-xl mb-2">{t('s7.r2Title')}</h4>
              <p className="text-slate-300">{t('s7.r2Desc')}</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-emerald-900/30">
            <div className="mb-4">
              <span className="block text-sm text-slate-400 uppercase tracking-wider">{t('s7.tamLabel')}</span>
              <span className="text-3xl font-light text-white">{t('s7.tamValue')}</span>
              <p className="text-sm text-slate-400 mt-1">{t('s7.tamDesc')}</p>
            </div>
            <div>
              <span className="block text-sm text-slate-400 uppercase tracking-wider">{t('s7.somLabel')}</span>
              <span className="text-3xl font-light text-white">{t('s7.somValue')}</span>
              <p className="text-sm text-slate-400 mt-1">{t('s7.somDesc')}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t('s8.title'),
      subtitle: t('s8.subtitle'),
      icon: <Layers className="w-12 h-12 text-rose-400" />,
      content: (
        <div className="mt-8 space-y-6 text-lg text-slate-300">
          <blockquote className="border-l-4 border-slate-600 pl-4 py-2 italic text-slate-400 text-xl font-light">
            {t('s8.quote')}
          </blockquote>
          <p>
            <strong className="text-rose-400 block mb-1">{t('s8.r1Title')}</strong>
            {t('s8.r1Desc')}
          </p>
          <p>
            <strong className="text-rose-400 block mb-1">{t('s8.r2Title')}</strong>
            {t('s8.r2Desc')}
          </p>
        </div>
      ),
    },
    {
      title: t('s9.title'),
      subtitle: t('s9.subtitle'),
      icon: <Milestone className="w-12 h-12 text-cyan-400" />,
      content: (
        <div className="space-y-6 mt-8">
          {(
            [
              { key: 'f1', color: 'bg-cyan-400', titleClass: 'text-cyan-400' },
              { key: 'f2', color: 'bg-blue-400', titleClass: 'text-blue-400' },
              { key: 'f3', color: 'bg-indigo-400', titleClass: 'text-indigo-400' },
            ] as const
          ).map(({ key, color, titleClass }) => (
            <div key={key} className="flex bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
              <div>
                <h4 className={`${titleClass} font-bold mb-1 text-lg`}>{t(`s9.${key}Title`)}</h4>
                <p className="text-slate-300">{t(`s9.${key}Desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t('s10.title'),
      subtitle: t('s10.subtitle'),
      icon: <Presentation className="w-12 h-12 text-fuchsia-400" />,
      content: (
        <div className="mt-12 text-center max-w-2xl mx-auto space-y-8">
          <p className="text-xl text-slate-300 leading-relaxed">{t('s10.p1')}</p>
          <p className="text-lg text-slate-400">{t('s10.p2')}</p>
        </div>
      ),
    },
    {
      title: t('s11.title'),
      subtitle: t('s11.subtitle'),
      icon: <ShieldCheck className="w-12 h-12 text-white" />,
      content: (
        <div className="mt-8 flex flex-col items-center justify-center space-y-8 text-center px-4">
          <div className="pb-6 border-b border-slate-800 w-full">
            <h3 className="text-xl text-slate-300 font-medium">{t('s11.role')}</h3>
            <p className="text-slate-500 mt-2">{t('s11.roleDesc')}</p>
          </div>
          <blockquote className="text-2xl font-light text-white leading-relaxed max-w-3xl italic">
            {t('s11.quote')}
          </blockquote>
        </div>
      ),
    },
  ];

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev === slides.length - 1 ? prev : prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev === 0 ? 0 : prev - 1));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans overflow-hidden text-slate-50 relative selection:bg-cyan-900">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute w-full h-[500px] top-[-250px] left-0 bg-cyan-900/20 blur-[120px] rounded-[100%]" />
        <div className="absolute w-[500px] h-[500px] bottom-[-200px] right-[-100px] bg-fuchsia-900/10 blur-[100px] rounded-full" />
      </div>

      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <div className="text-sm font-bold tracking-widest text-slate-500 uppercase">{t('brand')}</div>
        <div className="text-sm font-mono text-slate-500">Slide {current + 1} / {slides.length}</div>
      </header>

      <main className="flex-grow flex items-center justify-center p-8 z-10 w-full max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="w-full flex flex-col pt-12"
          >
            <div className="flex items-center space-x-6 mb-6">
              {slides[current].icon}
              <div className="flex flex-col">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">{slides[current].title}</h2>
                <h3 className="text-xl md:text-2xl text-slate-400 font-light">{slides[current].subtitle}</h3>
              </div>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-slate-800 via-slate-700 to-transparent my-6" />
            <div className="w-full">{slides[current].content}</div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="absolute bottom-0 left-0 w-full p-8 flex justify-between items-center z-20">
        <div className="flex space-x-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-12 h-1.5 rounded-full transition-all duration-300 ${idx <= current ? 'bg-cyan-500' : 'bg-slate-800'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <div className="flex space-x-4">
          <button
            onClick={prevSlide}
            disabled={current === 0}
            className="p-3 rounded-full bg-slate-900 border border-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            disabled={current === slides.length - 1}
            className="p-3 rounded-full bg-slate-900 border border-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </footer>
    </div>
  );
}
