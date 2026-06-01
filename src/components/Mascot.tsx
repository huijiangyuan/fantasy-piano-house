import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export default function Mascot({ lastKeyPress }: { lastKeyPress: { key: string, time: number } | null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [side, setSide] = useState<'left' | 'right' | 'both'>('both');
  const [idleState, setIdleState] = useState(0);

  useEffect(() => {
    // Idle animation loop randomly changing every 2.5s
    const interval = setInterval(() => {
      setIdleState(Math.floor(Math.random() * 4));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastKeyPress) return;
    setIsPlaying(true);
    
    // Determine side based on typical keyboard layout
    const leftSide = ['q','w','e','r','t','a','s','d','f','g','z','x','c','v','b','1','2','3','4','5','`'];
    if (leftSide.includes(lastKeyPress.key.toLowerCase())) {
      setSide('left');
    } else {
      setSide('right');
    }

    const timer = setTimeout(() => {
      setIsPlaying(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [lastKeyPress]);

  return (
    <div className="relative flex flex-col items-center">
      {/* Cute Bunny */}
      <motion.div 
        animate={
          isPlaying 
            ? { y: [0, -15, 0], scale: [1, 1.05, 1], transition: { duration: 0.2 } } 
            : idleState === 1 ? { rotate: [0, -4, 4, 0], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }
            : idleState === 2 ? { y: [0, -8, 0], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }
            : idleState === 3 ? { scale: [1, 1.03, 1], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }
            : { y: 0, rotate: 0, scale: 1 }
        }
        className="w-48 h-48 relative flex flex-col items-center justify-end z-10"
      >
        {/* Glow effect behind the bunny */}
        <motion.div className="absolute inset-0 bg-pink-300 rounded-full blur-[40px] opacity-20 -z-10" 
          animate={isPlaying ? { opacity: 0.6, scale: 1.2 } : { opacity: 0.2, scale: 1 }}
        />

        {/* Ears */}
        <motion.div 
          className="absolute -top-10 left-6 w-10 h-24 bg-white border-4 border-pink-200 rounded-[50%_50%_10%_10%] origin-bottom shadow-inner flex justify-center pt-3"
          animate={isPlaying ? { rotate: -30, height: 90 } : idleState === 1 ? { rotate: [0, -15, 0] } : { rotate: -15, height: 96 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <div className="w-5 h-14 bg-pink-100 rounded-full opacity-80" />
        </motion.div>
        
        <motion.div 
          className="absolute -top-10 right-6 w-10 h-24 bg-white border-4 border-pink-200 rounded-[50%_50%_10%_10%] origin-bottom shadow-inner flex justify-center pt-3"
          animate={isPlaying ? { rotate: 30, height: 90 } : idleState === 1 ? { rotate: [0, 15, 0] } : { rotate: 15, height: 96 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <div className="w-5 h-14 bg-pink-100 rounded-full opacity-80" />
        </motion.div>

        {/* Head */}
        <div className="w-36 h-32 bg-white border-4 border-pink-200 rounded-[48%] flex flex-col items-center pt-10 relative shadow-[0_8px_15px_rgba(244,114,182,0.1)] z-10 transition-transform">
          {/* Eyes (Bigger, rounder, with catchlights) */}
          <div className="flex gap-7 z-20">
            <motion.div 
              className="w-5 h-[22px] bg-slate-800 rounded-full relative overflow-hidden"
              animate={
                isPlaying 
                  ? { scaleY: 1.2, scaleX: 1.1, translateY: -2 } 
                  : idleState === 2 ? { scaleY: 0.1 } // blinked state
                  : { scaleY: [1, 1, 0.1, 1, 1] }
              }
              transition={!isPlaying && idleState !== 2 ? { repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 0.98, 1] } : {}}
            >
              {/* Eye highlights */}
              <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute top-3 left-1 w-1 h-1 bg-white rounded-full opacity-80"></div>
            </motion.div>
            <motion.div 
              className="w-5 h-[22px] bg-slate-800 rounded-full relative overflow-hidden"
              animate={
                isPlaying 
                  ? { scaleY: 1.2, scaleX: 1.1, translateY: -2 } 
                  : idleState === 2 ? { scaleY: 0.1 }
                  : { scaleY: [1, 1, 0.1, 1, 1] }
              }
              transition={!isPlaying && idleState !== 2 ? { repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 0.98, 1] } : {}}
            >
              {/* Eye highlights */}
              <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute top-3 left-1 w-1 h-1 bg-white rounded-full opacity-80"></div>
            </motion.div>
          </div>
          
          {/* Nose & Mouth area */}
          <div className="relative mt-2 flex flex-col items-center">
            {/* Tiny cute nose */}
            <motion.div className="w-2 h-1.5 bg-pink-400 rounded-full mb-1" 
              animate={isPlaying ? { scale: 1.2, y: -1 } : { scale: 1, y: 0 }}
            />
            {/* Mouth */}
            <motion.div 
              className="w-5 h-4 border-b-4 border-slate-700 rounded-b-full"
              animate={isPlaying ? { scale: 1.5, y: 1, height: 8 } : { scale: 1, y: 0, height: 4 }}
            />
          </div>

          {/* Blush (Bigger and softer) */}
          <div className="flex gap-12 absolute top-[52px] w-full px-4 items-center justify-between pointer-events-none">
            <motion.div 
              className="w-7 h-4 bg-pink-400 rounded-full blur-[4px] opacity-50" 
              animate={isPlaying ? { opacity: 0.8, scale: 1.2 } : { opacity: 0.5, scale: 1 }}
            />
            <motion.div 
              className="w-7 h-4 bg-pink-400 rounded-full blur-[4px] opacity-50" 
              animate={isPlaying ? { opacity: 0.8, scale: 1.2 } : { opacity: 0.5, scale: 1 }}
            />
          </div>
        </div>

        {/* Body (Plumper, rounder) */}
        <div className="w-28 h-26 bg-white border-4 border-pink-200 rounded-[45%_45%_50%_50%] absolute -bottom-10 z-0 flex justify-center items-center overflow-hidden">
            <div className="w-16 h-12 bg-pink-50 rounded-[40%] opacity-90 mt-6" />
        </div>

        {/* Arms (Paws) */}
        <motion.div 
          className="absolute left-1 top-24 w-10 h-14 bg-white border-4 border-pink-200 rounded-[50%_50%_40%_40%] z-20 origin-top shadow-sm flex items-end justify-center pb-1"
          animate={isPlaying && (side === 'left' || side === 'both') ? { rotate: -80, translateY: -5 } : { rotate: 25, translateY: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {/* Paw pads */}
          <div className="w-4 h-3 bg-pink-100 rounded-full opacity-60"></div>
        </motion.div>
        
        <motion.div 
          className="absolute right-1 top-24 w-10 h-14 bg-white border-4 border-pink-200 rounded-[50%_50%_40%_40%] z-20 origin-top shadow-sm flex items-end justify-center pb-1"
          animate={isPlaying && (side === 'right' || side === 'both') ? { rotate: 80, translateY: -5 } : { rotate: -25, translateY: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {/* Paw pads */}
          <div className="w-4 h-3 bg-pink-100 rounded-full opacity-60"></div>
        </motion.div>

        {/* Feet */}
        <div className="absolute left-6 -bottom-12 w-12 h-10 bg-white border-4 border-pink-200 rounded-[50%_50%_40%_40%] z-0" />
        <div className="absolute right-6 -bottom-12 w-12 h-10 bg-white border-4 border-pink-200 rounded-[50%_50%_40%_40%] z-0" />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-16 bg-white/95 backdrop-blur-md px-6 py-2.5 rounded-full font-bold text-pink-500 shadow-[0_4px_12px_rgba(244,114,182,0.15)] transform rotate-2 z-20 whitespace-nowrap border-2 border-pink-100 text-lg flex items-center gap-2"
      >
        {isPlaying ? (
          <>
            <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>🎵</motion.span>
            棒极啦！
            <motion.span animate={{ rotate: [0, -15, 15, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>✨</motion.span>
          </>
        ) : (
          <>快来弹琴吧！</>
        )}
      </motion.div>
    </div>
  );
}
