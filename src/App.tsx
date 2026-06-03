import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Music, X } from 'lucide-react';
import { initAudio, playPianoNote, playExactFrequency, playDJNote, PIANO_NOTES, stopAudio } from './lib/audio';
import { SONGS } from './lib/songs';
import Mascot from './components/Mascot';

const EMOJIS = ['🐶', '🐱', '🦋', '🎈', '🌟', '✨', '🐣', '🌈', '🍭', '🍓', '🐝', '🦄', '🍎', '🌻', '🐠', '🐬', '💖'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
const FOOTER_KEYS = ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Z", "X", "C"];

type Particle = {
  id: string;
  char: string;
  x: number;
  y: number;
  emoji: string;
  color: string;
  rot: number;
};

export default function App() {
  const [gameState, setGameState] = useState<'start' | 'playing'>('start');
  const [playMode, setPlayMode] = useState<'free' | 'song' | 'dj'>('song');
  const [currentSong, setCurrentSong] = useState(0);
  const [noteProgress, setNoteProgress] = useState(0);
  const [combo, setCombo] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [lastKeyPress, setLastKeyPress] = useState<{key: string, time: number} | null>(null);
  
  const [targetGuideKeys, setTargetGuideKeys] = useState<string[]>(['a']);
  const [correctKeyAnims, setCorrectKeyAnims] = useState<{id: string, keyVal: string}[]>([]);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const lastNoteTimeRef = useRef<number>(0);

  // Refs for state that shouldn't trigger re-bind of keyboard event listener
  const playModeRef = useRef(playMode);
  const currentSongRef = useRef(currentSong);
  const noteProgressRef = useRef(noteProgress);
  const targetGuideKeysRef = useRef(targetGuideKeys);

  useEffect(() => {
    playModeRef.current = playMode;
    currentSongRef.current = currentSong;
    noteProgressRef.current = noteProgress;
    targetGuideKeysRef.current = targetGuideKeys;
  }, [playMode, currentSong, noteProgress, targetGuideKeys]);

  const handleSongChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentSong(Number(e.target.value));
    setNoteProgress(0);
  };

  const nextTarget = useCallback(() => {
    const count = Math.random() > 0.5 ? 2 : 1;
    const nextArr: string[] = [];
    while (nextArr.length < count) {
      const nextKey = FOOTER_KEYS[Math.floor(Math.random() * FOOTER_KEYS.length)].toLowerCase();
      if (!nextArr.includes(nextKey)) {
        nextArr.push(nextKey);
      }
    }
    setTargetGuideKeys(nextArr);
  }, []);

  const startGame = () => {
    initAudio();
    setGameState('playing');
    setNoteProgress(0);
    setCombo(0);
    nextTarget();
  };

  const exitGame = useCallback(() => {
    stopAudio();
    setGameState('start');
    setParticles([]);
  }, []);

  const getKeyboardPosition = (keyVal: string) => {
    const key = keyVal.toLowerCase();
    
    const row1 = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
    const row2 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'];
    const row3 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"];
    const row4 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'];

    let x = 50; 
    let y = 80;

    if (row1.includes(key)) {
      x = 5 + (row1.indexOf(key) / row1.length) * 90;
      y = 30;
    } else if (row2.includes(key)) {
      x = 8 + (row2.indexOf(key) / row2.length) * 84;
      y = 45;
    } else if (row3.includes(key)) {
      x = 10 + (row3.indexOf(key) / row3.length) * 80;
      y = 60;
    } else if (row4.includes(key)) {
      x = 15 + (row4.indexOf(key) / row4.length) * 70;
      y = 75;
    } else if (key === 'space') {
      x = 50;
      y = 90;
    } else {
      x = 10 + Math.random() * 80;
      y = 80 + Math.random() * 10;
    }

    return { x, y };
  };

  const addParticle = useCallback((keyVal: string) => {
    // Determine display character
    let displayChar = keyVal;
    if (keyVal === ' ') displayChar = '☁️';
    else if (keyVal.length > 1) {
      if (keyVal === 'Enter') displayChar = '↵';
      else if (keyVal === 'Backspace') displayChar = '⌫';
      else if (keyVal === 'Shift') displayChar = '⇧';
      else if (keyVal === 'Control') displayChar = '⌃';
      else if (keyVal === 'Alt') displayChar = '⌥';
      else if (keyVal === 'Meta') displayChar = '⌘';
      else if (keyVal === 'ArrowUp') displayChar = '↑';
      else if (keyVal === 'ArrowDown') displayChar = '↓';
      else if (keyVal === 'ArrowLeft') displayChar = '←';
      else if (keyVal === 'ArrowRight') displayChar = '→';
      else displayChar = '✨';
    } else {
      displayChar = keyVal.toUpperCase();
    }

    const pos = getKeyboardPosition(keyVal === ' ' ? 'space' : keyVal);

    const newParticle: Particle = {
      id: Date.now().toString() + Math.random().toString(),
      char: displayChar,
      x: pos.x,
      y: pos.y,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 60 - 30,
    };

    setParticles(prev => [...prev, newParticle]);

    // Clean up particle after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1500);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') {
      activeKeysRef.current.clear();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Exit condition (Escape key)
      if (e.key === 'Escape') {
        exitGame();
        return;
      }

      // Ignore modifier keys completely for generating notes
      if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'Tab', 'ContextMenu'].includes(e.key)) {
        return;
      }

      // Prevent default actions to block browser shortcuts that interrupt the game
      e.preventDefault();
      e.stopPropagation();

      if (e.repeat) return; // Prevent OS key repeat triggering

      // Skip generating notes if meta or alt are pressed (to avoid OS-level actions triggering piano notes)
      if (e.metaKey || e.altKey) {
        return;
      }

      // Allow more keys pressed simultaneously
      if (activeKeysRef.current.size >= 10 && !activeKeysRef.current.has(e.code)) {
        return;
      }
      activeKeysRef.current.add(e.code);

      const pressedLower = e.key.toLowerCase();
      const charCode = e.key.charCodeAt(0);
      
      setLastKeyPress({ key: e.key, time: Date.now() });

      // Check for guided key correctness
      if (targetGuideKeysRef.current.includes(pressedLower)) {
        const animId = Date.now().toString();
        setCorrectKeyAnims(prev => [...prev, { id: animId, keyVal: pressedLower }]);
        setTimeout(() => {
          setCorrectKeyAnims(prev => prev.filter(a => a.id !== animId));
        }, 800);
        
        // Increase combo or cheer if we wanted to
        setCombo(c => c + 1);

        const newTargets = targetGuideKeysRef.current.filter(k => k !== pressedLower);
        if (newTargets.length === 0) {
          nextTarget();
        } else {
          setTargetGuideKeys(newTargets);
        }
      } else {
        // Reset combo if they press wrong key but are in free play trying to hit targets
        setCombo(0);
      }
      
      if (playModeRef.current === 'song') {
        const now = Date.now();
        if (now - lastNoteTimeRef.current > 200) { // Limit playback speed (max 5 notes per sec)
          const notes = SONGS[currentSongRef.current].notes;
          const noteIndex = notes[noteProgressRef.current % notes.length];
          const freq = PIANO_NOTES[noteIndex];
          playExactFrequency(freq);
          setNoteProgress(prev => prev + 1);
          lastNoteTimeRef.current = now;
        }
      } else if (playModeRef.current === 'dj') {
        playDJNote(charCode);
      } else {
        playPianoNote(charCode);
      }
      
      addParticle(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeysRef.current.delete(e.code);
    };

    const handleBlur = () => {
      activeKeysRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState, exitGame, addParticle, nextTarget]);

  useEffect(() => {
    if (gameState === 'start') {
      const handleStartKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          startGame();
        }
      };
      window.addEventListener('keydown', handleStartKeyDown);
      return () => window.removeEventListener('keydown', handleStartKeyDown);
    }
  }, [gameState]);

  if (gameState === 'start') {
    return (
      <div className="h-screen w-full bg-sky-100 overflow-hidden relative flex flex-col font-sans select-none">
        {/* Decorative background elements */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-200/50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-pink-200/50 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="bg-white/60 backdrop-blur-md p-10 rounded-3xl shadow-xl border-4 border-yellow-300 max-w-lg w-full relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-300/30 rounded-full blur-2xl"></div>
            <div className="flex justify-center mb-6 text-blue-600 relative">
              <Sparkles size={80} className="animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-blue-600 mb-6 drop-shadow-sm relative">
               奇幻钢琴屋
            </h1>
            <p className="text-xl text-gray-700 mb-6 font-bold relative">
              把你的键盘变成充满神奇音效和可爱图案的乐器！<br/>小朋友可以随便乱按哦！
            </p>

            <div className="flex justify-center gap-4 mb-6 relative">
              <button 
                onClick={() => setPlayMode('free')} 
                className={`px-6 py-2 rounded-full font-bold transition ${playMode === 'free' ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                自由弹奏
              </button>
              <button 
                onClick={() => setPlayMode('song')} 
                className={`px-6 py-2 rounded-full font-bold transition flex items-center ${playMode === 'song' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                学习名曲
              </button>
              <button 
                onClick={() => setPlayMode('dj')} 
                className={`px-6 py-2 rounded-full font-bold transition flex items-center ${playMode === 'dj' ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                DJ 模式
              </button>
            </div>

            <AnimatePresence>
              {playMode === 'song' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-6 relative overflow-hidden"
                >
                  <div className="flex justify-center pt-2">
                    <select
                      value={currentSong}
                      onChange={handleSongChange}
                      className="bg-blue-50 text-blue-600 border-2 border-blue-200 rounded-xl px-4 py-2 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-100 shadow-sm cursor-pointer"
                    >
                      {SONGS.map((song, i) => (
                        <option key={i} value={i}>{song.name}</option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={startGame}
              className="group relative inline-flex items-center justify-center px-8 py-4 font-black text-white bg-pink-500 rounded-3xl text-2xl hover:bg-pink-600 transition-all shadow-xl border-b-4 border-pink-700 hover:scale-105 active:scale-95"
            >
              <Music className="mr-3 group-hover:rotate-12 transition-transform" />
              进入游戏
              <span className="ml-3 text-sm opacity-80 font-medium bg-pink-700/30 px-2 py-1 rounded">Enter ↵</span>
            </button>
            
            <div className="mt-8 relative text-sm font-bold text-gray-500 bg-white/60 px-4 py-2 rounded-lg italic inline-block">
              退出方式：按 <kbd className="bg-white px-2 py-1 rounded shadow-sm border border-gray-200 text-gray-800">ESC</kbd> 键 或 点击屏幕右上角退出
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-sky-100 overflow-hidden relative flex flex-col font-sans select-none">
      {/* Decorative background elements */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-pink-200/50 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navigation / Status Bar */}
      <header className="w-full p-6 flex justify-between items-start z-10 relative">
        <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-6 py-3 rounded-full border-4 border-yellow-300 shadow-lg">
          <span className="text-4xl">🎵</span>
          <span className="text-3xl font-black text-blue-600 hidden sm:inline">奇幻钢琴屋</span>
        </div>

        <div className="flex flex-col items-end gap-2">
          {playMode === 'song' && (
            <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl shadow-lg border-b-4 border-blue-700 flex flex-col items-center">
              <span className="text-xs font-bold block uppercase tracking-wider text-blue-200">当前曲目</span>
              <select
                value={currentSong}
                onChange={handleSongChange}
                className="bg-transparent text-lg font-black outline-none cursor-pointer text-center appearance-none hover:text-yellow-200 transition-colors"
                title="切换曲目"
              >
                {SONGS.map((song, i) => (
                  <option key={i} value={i} className="text-gray-800 font-bold bg-white text-base">
                    {song.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button 
            onClick={exitGame}
            className="text-xs font-bold text-gray-500 bg-white/60 hover:bg-white px-4 py-2 rounded-lg italic shadow-sm transition-colors border border-white/50 flex items-center cursor-pointer mt-2"
          >
            <X size={14} className="mr-1" />
            退出游戏 (ESC)
          </button>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="flex-1 relative">
        
        {playMode === 'song' && (
          <div className="absolute top-4 left-0 right-0 flex justify-center mt-2 pointer-events-none z-10 text-center">
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-[2rem] shadow-lg border-4 border-yellow-300 flex items-center justify-center gap-1 md:gap-3 overflow-hidden max-w-2xl mx-auto transition-all">
              {(() => {
                const lyrics = SONGS[currentSong].lyrics;
                if (!lyrics) return null;
                const currentIdx = noteProgress % lyrics.length;
                const displayChars = [];
                for (let i = -3; i <= 3; i++) {
                  const idx = currentIdx + i;
                  if (idx >= 0 && idx < lyrics.length) {
                    const isCurrent = i === 0;
                    displayChars.push(
                      <span key={idx} className={`font-black transition-all duration-200 text-center flex-1 whitespace-nowrap ${isCurrent ? 'text-pink-500 text-4xl md:text-5xl scale-110 drop-shadow-md' : 'text-gray-300 text-2xl md:text-3xl'}`}>
                        {lyrics[idx]}
                      </span>
                    );
                  } else if (idx < 0) {
                      displayChars.push(<span key={`pad-left-${i}`} className="w-8 md:w-16"></span>)
                  } else {
                      displayChars.push(<span key={`pad-right-${i}`} className="w-8 md:w-16"></span>)
                  }
                }
                return displayChars;
              })()}
            </div>
          </div>
        )}

        {/* Cute Character/Mascot */}
        <div className="absolute bottom-6 md:bottom-20 left-6 md:left-20 flex flex-col items-center">
          <Mascot lastKeyPress={lastKeyPress} />
        </div>

        {/* Particle Layer */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <AnimatePresence>
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ 
                  x: `${p.x}vw`, 
                  y: `${p.y}vh`, 
                  opacity: 1, 
                  scale: 0,
                  rotate: 0
                }}
                animate={{ 
                  y: `-20vh`, 
                  x: `${p.x + (Math.random() * 20 - 10)}vw`,
                  opacity: 0, 
                  scale: 1 + Math.random() * 0.5,
                  rotate: p.rot
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute font-black flex items-center justify-center drop-shadow-2xl shadow-black/20"
              >
                <div 
                  className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] flex items-center justify-center text-white text-4xl md:text-6xl font-black border-4 border-white shadow-2xl relative"
                  style={{ backgroundColor: p.color }}
                >
                  {p.char}
                  <div className="text-3xl md:text-4xl absolute -bottom-4 -right-4 bg-white/80 rounded-full p-1 shadow-lg leading-none">
                    {p.emoji}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </main>

      {/* Piano Keyboard Area */}
      <footer className="w-full bg-white/40 backdrop-blur-sm p-4 border-t-4 border-white/50 z-10 relative mt-auto">
        <div className="flex gap-2 h-24 md:h-48 max-w-6xl mx-auto">
          {FOOTER_KEYS.map((note, i) => {
            const isTarget = targetGuideKeys.includes(note.toLowerCase());
            const isCorrect = correctKeyAnims.some(a => a.keyVal === note.toLowerCase());
            
            let bgClass = "bg-white border-gray-200 shadow-lg text-gray-300";

            if (isCorrect) {
              bgClass = "bg-green-400 border-green-600 text-white shadow-[0_0_20px_rgba(74,222,128,0.8)] text-white/90";
            } else if (isTarget) {
              bgClass += " ring-4 ring-yellow-400 ring-offset-2 ring-offset-sky-100 text-blue-400";
            }
            
            return (
              <motion.div 
                key={i} 
                animate={isTarget && !isCorrect ? { y: [0, -15, 0] } : (isCorrect ? { scale: [1, 1.1, 1] } : { y: 0 })}
                transition={isTarget && !isCorrect ? { repeat: Infinity, duration: 0.8 } : { duration: 0.3 }}
                className={`flex-1 rounded-xl flex flex-col items-center justify-end pb-2 md:pb-4 font-black text-2xl md:text-5xl transition-all relative ${
                  isTarget ? `${bgClass} border-t-8 transform translate-y-2` : `${bgClass} border-b-8`
                }`}
              >
                <AnimatePresence>
                  {isCorrect && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1, y: 0 }}
                      animate={{ scale: 2, opacity: 0, y: -50 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none text-4xl"
                    >
                      🌟
                    </motion.div>
                  )}
                </AnimatePresence>
                {note}
              </motion.div>
            );
          })}
        </div>
      </footer>
    </div>
  );
}