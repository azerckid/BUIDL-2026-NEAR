'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ShieldCheck, DatabaseZap, Workflow,
  Activity, Cpu, Sparkles, TrendingUp, Layers, Milestone, Presentation, Map, ArrowRight, ArrowDown
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
        <div className="mt-12 w-full relative">
          {/* Background Connecting Line */}
          <div className="hidden md:block absolute top-[45px] left-[10%] right-[10%] h-1.5 bg-slate-800 rounded-full z-0 overflow-hidden border-y border-slate-900">
            <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: "100%" }} 
               transition={{ duration: 2.5, ease: "easeInOut" }}
               className="h-full bg-gradient-to-r from-fuchsia-600 via-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(217,70,239,0.8)]"
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between relative z-10 gap-4 md:gap-2">
            {(['step1', 'step2', 'step3', 'step4', 'step5'] as const).map((key, i) => (
              <motion.div 
                key={key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.4 + 0.5 }}
                className="flex flex-row md:flex-col items-center md:flex-1 group"
              >
                {/* Node Circle */}
                <div className="relative flex items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-full bg-slate-900 border-[3px] border-slate-700 group-hover:border-fuchsia-400 transition-colors duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10 shrink-0 mr-4 md:mr-0 md:mb-6">
                  {/* Glowing inner ring */}
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-800/50">
                     <span className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-fuchsia-300 to-purple-500">
                       0{i + 1}
                     </span>
                  </div>
                  {/* Subtle outer glow on hover */}
                  <div className="absolute inset-[-15px] rounded-full bg-fuchsia-500/0 group-hover:bg-fuchsia-500/30 blur-xl transition-all duration-300" />
                </div>
                
                {/* Text Content */}
                <div className="flex flex-col md:justify-start md:items-center text-left md:text-center w-full">
                  <div className="bg-slate-800/80 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border border-slate-700/50 md:border-none w-full group-hover:bg-slate-800 md:group-hover:bg-transparent transition-colors shadow-inner md:shadow-none">
                    <span className="text-slate-200 text-sm md:text-base font-medium leading-relaxed block">
                      {t(`s4.${key}`)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: t('s5.title'),
      subtitle: t('s5.subtitle'),
      icon: <Cpu className="w-12 h-12 text-amber-400" />,
      content: (
        <div className="space-y-4 mt-8">
          {(['b1', 'b2', 'b3', 'b4'] as const).map((key) => (
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
        <div className="mt-4 flex flex-col space-y-6">
          <p className="text-lg text-slate-300">{t('s6.p')}</p>
          
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 p-6 bg-slate-900/60 rounded-2xl border border-indigo-900/40">
            {/* TEE Worker */}
            <motion.div 
               initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
               className="flex flex-col items-center p-4 bg-blue-950/40 border border-blue-500/40 rounded-xl w-full lg:w-48 shadow-[0_0_15px_rgba(59,130,246,0.15)] backdrop-blur-sm"
            >
              <div className="text-[10px] font-bold text-blue-400 mb-3 tracking-[0.2em] uppercase">TEE (IronClaw)</div>
              <div className="space-y-2 w-full">
                <div className="px-2 py-1.5 bg-red-900/30 border border-red-500/30 rounded text-center text-red-300 text-xs shadow-inner">🔑 Random PK</div>
                <div className="px-2 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded text-center text-purple-300 text-xs shadow-inner">🧠 LLM</div>
                <div className="px-2 py-1.5 bg-cyan-900/40 border border-cyan-400/50 rounded text-center text-cyan-200 text-sm font-bold shadow-[0_0_8px_rgba(34,211,238,0.2)]">⚙️ Agent</div>
              </div>
            </motion.div>

            <div className="flex flex-col items-center justify-center text-indigo-500/50 my-2 lg:my-0">
              <ArrowRight className="w-5 h-5 hidden lg:block" />
              <ArrowDown className="w-5 h-5 lg:hidden" />
            </div>

            {/* Agent Contract */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
               className="flex flex-col items-center p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl w-full lg:w-56 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-sm"
            >
              <div className="text-[10px] font-bold text-emerald-400 mb-3 tracking-[0.2em] uppercase">NEAR Contract</div>
              <div className="space-y-2 w-full">
                <div className="px-3 py-2 bg-slate-900/80 border border-emerald-800/60 rounded text-center text-emerald-300 text-[11px] truncate">
                  register_worker()
                </div>
                <div className="px-3 py-2 bg-emerald-900/40 border border-emerald-400/50 rounded text-center text-emerald-100 text-sm font-bold shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                  sign_tx(payload)
                </div>
              </div>
            </motion.div>

            <div className="flex flex-col items-center justify-center text-indigo-500/50 my-2 lg:my-0">
              <ArrowRight className="w-5 h-5 hidden lg:block" />
              <ArrowDown className="w-5 h-5 lg:hidden" />
            </div>

            {/* Target Chains */}
            <motion.div 
               initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
               className="flex flex-col items-center p-4 bg-fuchsia-950/40 border border-fuchsia-500/40 rounded-xl w-full lg:w-48 shadow-[0_0_15px_rgba(217,70,239,0.15)] backdrop-blur-sm"
            >
              <div className="text-[10px] font-bold text-fuchsia-400 mb-3 tracking-[0.2em] uppercase">Chain Signatures</div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="flex items-center justify-center py-2 bg-slate-900 rounded border border-slate-700 shadow-inner"><span className="text-white text-[10px] font-bold tracking-wider">NEAR</span></div>
                <div className="flex items-center justify-center py-2 bg-blue-900/50 rounded border border-blue-800/50 shadow-inner"><span className="text-blue-200 text-[10px] font-bold tracking-wider">ETH</span></div>
                <div className="flex items-center justify-center py-2 bg-orange-900/50 rounded border border-orange-800/50 shadow-inner"><span className="text-orange-200 text-[10px] font-bold tracking-wider">BTC</span></div>
                <div className="flex items-center justify-center py-2 bg-green-900/40 rounded border border-green-800/50 shadow-inner"><span className="text-green-300 text-[10px] font-bold tracking-wider">SOL</span></div>
              </div>
            </motion.div>
          </div>

          <div className="p-4 bg-indigo-950/30 border-l-4 border-indigo-500 rounded-r-xl">
            <h4 className="text-indigo-300 font-bold text-sm mb-1">{t('s6.boxTitle')}</h4>
            <p className="text-slate-400 text-sm leading-relaxed">{t('s6.boxDesc')}</p>
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
      icon: <Map className="w-12 h-12 text-teal-400" />,
      content: (
        <div className="mt-14 relative flex flex-col md:flex-row gap-6 w-full">
          {/* Connecting Line (Desktop Only) */}
          <div className="hidden md:block absolute top-[14px] left-[12%] right-[12%] h-1 bg-slate-800 z-0">
            <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: "40%" }}
               transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
               className="h-full bg-gradient-to-r from-teal-800 to-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
            />
          </div>

          {(['p1', 'p2', 'p3', 'p4'] as const).map((key, i) => {
            const isCurrent = i === 1; // Phase 1
            const isCompleted = i === 0; // Phase 0

            return (
              <motion.div 
                key={key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 + 0.4 }}
                className={`relative flex-1 p-5 pt-8 mt-4 rounded-2xl border backdrop-blur-md transition-all duration-500 z-10 ${
                  isCurrent 
                    ? 'bg-slate-800/80 border-teal-400/50 shadow-[0_0_30px_rgba(45,212,191,0.15)] md:-translate-y-2' 
                    : isCompleted
                      ? 'bg-slate-800/40 border-teal-900/50'
                      : 'bg-slate-900/60 border-slate-800/80 opacity-[0.55]'
                }`}
              >
                {/* Status Dot */}
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-4 border-slate-950 z-20 transition-all duration-500 ${
                  isCurrent ? 'bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.8)] scale-125' : isCompleted ? 'bg-teal-700' : 'bg-slate-700'
                }`} />

                <div className="text-center flex flex-col items-center h-full">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide mb-3 ${
                    isCurrent ? 'bg-teal-400/20 text-teal-300 border border-teal-400/30' : isCompleted ? 'bg-slate-800 text-teal-600' : 'bg-slate-800/50 text-slate-500'
                  }`}>
                    {t(`s8.${key}Phase`)}
                  </span>
                  <div className={`font-mono text-[11px] md:text-xs mb-4 ${isCurrent ? 'text-teal-200' : 'text-slate-500'}`}>
                    {t(`s8.${key}When`)}
                  </div>
                  <p className={`text-sm leading-relaxed ${isCurrent ? 'text-slate-200' : isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t(`s8.${key}Desc`)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ),
    },
    {
      title: t('s9.title'),
      subtitle: t('s9.subtitle'),
      icon: <Layers className="w-12 h-12 text-rose-400" />,
      content: (
        <div className="mt-8 space-y-5 text-lg text-slate-300">
          <blockquote className="border-l-4 border-slate-600 pl-4 py-2 italic text-slate-400 text-xl font-light">
            {t('s9.quote')}
          </blockquote>
          {(['r1', 'r2', 'r3'] as const).map((key) => (
            <p key={key}>
              <strong className="text-rose-400 block mb-1">{t(`s9.${key}Title`)}</strong>
              {t(`s9.${key}Desc`)}
            </p>
          ))}
        </div>
      ),
    },
    {
      title: t('s10.title'),
      subtitle: t('s10.subtitle'),
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
                <h4 className={`${titleClass} font-bold mb-1 text-lg`}>{t(`s10.${key}Title`)}</h4>
                <p className="text-slate-300">{t(`s10.${key}Desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t('s11.title'),
      subtitle: t('s11.subtitle'),
      icon: <Presentation className="w-12 h-12 text-fuchsia-400" />,
      content: (
        <div className="mt-12 text-center max-w-2xl mx-auto space-y-8">
          <p className="text-xl text-slate-300 leading-relaxed">{t('s11.p1')}</p>
          <p className="text-lg text-slate-400">{t('s11.p2')}</p>
        </div>
      ),
    },
    {
      title: t('s12.title'),
      subtitle: t('s12.subtitle'),
      icon: <ShieldCheck className="w-12 h-12 text-white" />,
      content: (
        <div className="mt-8 flex flex-col items-center justify-center space-y-8 text-center px-4">
          <div className="pb-6 border-b border-slate-800 w-full">
            <h3 className="text-xl text-slate-300 font-medium">{t('s12.role')}</h3>
            <p className="text-slate-500 mt-2">{t('s12.roleDesc')}</p>
            <p className="text-slate-600 text-sm mt-1 italic">{t('s12.hireNote')}</p>
          </div>
          <blockquote className="text-2xl font-light text-white leading-relaxed max-w-3xl italic">
            {t('s12.quote')}
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
            className="w-full flex flex-col pt-12 pb-28"
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
