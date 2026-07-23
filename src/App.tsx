import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Music, X, Keyboard, BookOpen, Disc3 } from 'lucide-react';
import { initAudio, playPianoNote, playExactFrequency, playDJNote, PIANO_NOTES, stopAudio, resumeAudio } from './lib/audio';
import { SONGS } from './lib/songs';
import Mascot from './components/Mascot';
import PianoKeyboard, { BlackKeyDef } from './components/PianoKeyboard';
import { useRobustShell } from './hooks/useRobustShell';

const EMOJIS = ['🐶', '🐱', '🦋', '🎈', '🌟', '✨', '🐣', '🌈', '🍭', '🍓', '🐝', '🦄', '🍎', '🌻', '🐠', '🐬', '💖'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];

// The 12 playable keys (kept exactly as before so muscle memory is preserved).
const FOOTER_KEYS = ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Z", "X", "C"];
// Real-piano layout: 9 white keys + 3 raised black keys near the left.
const WHITE_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const BLACK_KEYS: BlackKeyDef[] = [
  { key: "z", after: 0 },
  { key: "x", after: 1 },
  { key: "c", after: 2 },
];

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
  // Visual "held" state for every key — drives instant press feedback everywhere.
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const activeKeysRef = useRef<Set<string>>(new Set());
  const lastNoteTimeRef = useRef<number>(0);

  // Refs for state that shouldn't trigger re-bind of keyboard event listener
  const playModeRef = useRef(playMode);
  const currentSongRef = useRef(currentSong);
  const noteProgressRef = useRef(noteProgress);
  const targetGuideKeysRef = useRef(targetGuideKeys);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    playModeRef.current = playMode;
    currentSongRef.current = currentSong;
    noteProgressRef.current = noteProgress;
    targetGuideKeysRef.current = targetGuideKeys;
  }, [playMode, currentSong, noteProgress, targetGuideKeys]);

  // Clear every "held" / stuck key when focus is lost.
  const clearAllKeys = useCallback(() => {
    activeKeysRef.current.clear();
    setPressedKeys(new Set());
  }, []);

  // Cross-cutting robustness: audio resume, blur cleanup, focus trap, gesture guards.
  useRobustShell({
    playing: gameState === 'playing',
    audioResume: resumeAudio,
    onBlurClear: clearAllKeys,
    rootRef,
  });

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
    clearAllKeys();
    nextTarget();
  };

  const exitGame = useCallback(() => {
    stopAudio();
    setGameState('start');
    setParticles([]);
    clearAllKeys();
  }, [clearAllKeys]);

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
    if (keyVal === ' ') displayChar = '☁';
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
      setPressedKeys(new Set());
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser/system actions for ALL keys during play.
      // This reliably blocks in-page shortcuts (Tab focus, Space/Arrow scroll,
      // F-key defaults, etc.). Browser-chrome shortcuts (Ctrl+W, F5, …) are
      // intentionally unblockable by web JS — see useRobustShell beforeunload.
      e.preventDefault();
      e.stopPropagation();

      // Resume audio on a trusted user gesture (covers focus return too).
      resumeAudio();

      // Exit condition (Escape key)
      if (e.key === 'Escape') {
        exitGame();
        return;
      }

      // Ignore modifier and system keys for generating notes
      const ignoredKeys = [
        'Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'Tab', 'ContextMenu',
        'PrintScreen', 'ScrollLock', 'Pause', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'OS', 'Clear', 'Dead', 'NumLock'
      ];
      if (ignoredKeys.includes(e.key)) {
        return;
      }

      if (e.repeat) return; // Prevent OS key repeat triggering

      // Allow unlimited keys in DJ mode, limit to 10 otherwise
      if (playModeRef.current !== 'dj' && activeKeysRef.current.size >= 10 && !activeKeysRef.current.has(e.code)) {
        return;
      }
      activeKeysRef.current.add(e.code);

      // Light up the key immediately for instant feedback.
      const pressedLower = e.key.toLowerCase();
      setPressedKeys(prev => {
        if (prev.has(pressedLower)) return prev;
        const next = new Set(prev);
        next.add(pressedLower);
        return next;
      });

      const charCode = e.key.charCodeAt(0);

      setLastKeyPress({ key: e.key, time: Date.now() });

      // Check for guided key correctness
      if (targetGuideKeysRef.current.includes(pressedLower)) {
        const animId = Date.now().toString();
        setCorrectKeyAnims(prev => [...prev, { id: animId, keyVal: pressedLower }]);
        setTimeout(() => {
          setCorrectKeyAnims(prev => prev.filter(a => a.id !== animId));
        }, 800);

        setCombo(c => c + 1);

        const newTargets = targetGuideKeysRef.current.filter(k => k !== pressedLower);
        if (newTargets.length === 0) {
          nextTarget();
        } else {
          setTargetGuideKeys(newTargets);
        }
      } else {
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
      const k = e.key.toLowerCase();
      setPressedKeys(prev => {
        if (!prev.has(k)) return prev;
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [gameState, exitGame, addParticle, nextTarget]);

  useEffect(() => {
    if (gameState === 'start') {
      const handleStartKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          startGame();
        }
      };
      window.addEventListener('keydown', handleStartKeyDown);
      return () => window.removeEventListener('keydown', handleStartKeyDown);
    }
  }, [gameState]);

  const correctKeys = correctKeyAnims.map(a => a.keyVal);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="h-screen w-full overflow-hidden relative flex flex-col font-body outline-none select-none animate-magical-bg"
    >
      {/* Decorative background glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-yellow-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-300/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-sky-300/30 rounded-full blur-3xl pointer-events-none"></div>

      {gameState === 'start' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="bg-white/55 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-4 border-yellow-200 max-w-xl w-full relative overflow-hidden"
          >
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-300/30 rounded-full blur-2xl"></div>
            <div className="flex justify-center mb-5 text-blue-600 relative">
              <Sparkles size={72} className="animate-pulse" />
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-blue-600 mb-4 drop-shadow-sm relative">
              奇幻钢琴屋
            </h1>
            <p className="text-lg md:text-xl text-slate-700 mb-7 font-semibold relative leading-relaxed">
              把键盘变成会唱歌的魔法钢琴！<br />随便乱按，每个键都会发出可爱的声音～
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 mb-7 relative">
              <ModeCard
                active={playMode === 'free'}
                onClick={() => setPlayMode('free')}
                icon={<Keyboard size={22} />}
                label="自由弹奏"
                color="bg-pink-500"
              />
              <ModeCard
                active={playMode === 'song'}
                onClick={() => setPlayMode('song')}
                icon={<BookOpen size={22} />}
                label="学习名曲"
                color="bg-blue-500"
              />
              <ModeCard
                active={playMode === 'dj'}
                onClick={() => setPlayMode('dj')}
                icon={<Disc3 size={22} />}
                label="DJ 模式"
                color="bg-purple-500"
              />
            </div>

            <AnimatePresence>
              {playMode === 'song' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-7 relative overflow-hidden"
                >
                  <div className="flex justify-center pt-1">
                    <select
                      value={currentSong}
                      onChange={handleSongChange}
                      className="bg-blue-50 text-blue-600 border-2 border-blue-200 rounded-2xl px-5 py-2.5 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-100 shadow-sm cursor-pointer"
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
              className="group relative inline-flex items-center justify-center px-9 py-4 font-bold text-white bg-pink-500 rounded-3xl text-2xl hover:bg-pink-600 transition-all shadow-xl border-b-4 border-pink-700 hover:scale-105 active:scale-95"
            >
              <Music className="mr-3 group-hover:rotate-12 transition-transform" />
              进入游戏
              <span className="ml-3 text-sm opacity-80 font-semibold bg-pink-700/30 px-2 py-1 rounded">Enter ↵</span>
            </button>

            <div className="mt-7 relative text-sm font-semibold text-slate-500 bg-white/60 px-4 py-2 rounded-xl inline-block">
              退出方式：按 <kbd className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200 text-slate-700">ESC</kbd> 键 或 点右上角退出
            </div>
          </motion.div>
          <div className="absolute bottom-4 text-xs font-semibold text-white/70 drop-shadow">
            v1.1.0
          </div>
        </div>
      ) : (
        <>
          {/* Top Navigation / Status Bar */}
          <header className="w-full p-4 md:p-6 flex justify-between items-start z-10 relative gap-3">
            <div className="flex items-center gap-3 bg-white/55 backdrop-blur-md px-5 py-2.5 rounded-full border-4 border-yellow-200 shadow-lg">
              <span className="text-3xl md:text-4xl">🎵</span>
              <span className="font-display text-2xl md:text-3xl font-bold text-blue-600 hidden sm:inline">奇幻钢琴屋</span>
            </div>

            <div className="flex flex-col items-end gap-2">
              {playMode === 'song' && (
                <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl shadow-lg border-b-4 border-blue-700 flex flex-col items-center">
                  <span className="text-[10px] font-bold block uppercase tracking-wider text-blue-200">当前曲目</span>
                  <select
                    value={currentSong}
                    onChange={(e) => { handleSongChange(e); (e.target as HTMLSelectElement).blur(); }}
                    className="bg-transparent text-base md:text-lg font-bold outline-none cursor-pointer text-center appearance-none hover:text-yellow-200 transition-colors"
                    title="切换曲目"
                  >
                    {SONGS.map((song, i) => (
                      <option key={i} value={i} className="text-slate-800 font-bold bg-white text-base">
                        {song.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={exitGame}
                className="text-xs font-bold text-slate-500 bg-white/60 hover:bg-white px-4 py-2 rounded-xl italic shadow-sm transition-colors border border-white/50 flex items-center cursor-pointer"
              >
                <X size={14} className="mr-1" />
                退出游戏 (ESC)
              </button>
            </div>
          </header>

          {/* Main Game Stage */}
          <main className="flex-1 relative">

            {playMode === 'song' && (
              <div className="absolute top-2 left-0 right-0 flex justify-center mt-2 pointer-events-none z-10 text-center px-3">
                <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-[2rem] shadow-lg border-4 border-yellow-200 flex items-center justify-center gap-1 md:gap-3 overflow-hidden max-w-2xl mx-auto">
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
                          <span key={idx} className={`font-display transition-all duration-200 text-center flex-1 whitespace-nowrap ${isCurrent ? 'text-pink-500 text-3xl md:text-5xl scale-110 drop-shadow-md' : 'text-slate-300 text-xl md:text-3xl'}`}>
                            {lyrics[idx]}
                          </span>
                        );
                      } else if (idx < 0) {
                        displayChars.push(<span key={`pad-left-${i}`} className="w-6 md:w-14"></span>)
                      } else {
                        displayChars.push(<span key={`pad-right-${i}`} className="w-6 md:w-14"></span>)
                      }
                    }
                    return displayChars;
                  })()}
                </div>
              </div>
            )}

            {/* Cute Character/Mascot */}
            <div className="absolute bottom-4 md:bottom-16 left-4 md:left-16 flex flex-col items-center z-0">
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
                    className="absolute font-display flex items-center justify-center drop-shadow-2xl shadow-black/20"
                  >
                    <div
                      className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] flex items-center justify-center text-white text-4xl md:text-6xl font-bold border-4 border-white shadow-2xl relative"
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
          <footer className="w-full bg-white/40 backdrop-blur-md p-3 md:p-5 border-t-4 border-white/50 z-10 relative mt-auto">
            <PianoKeyboard
              whiteKeys={WHITE_KEYS}
              blackKeys={BLACK_KEYS}
              pressed={pressedKeys}
              target={targetGuideKeys}
              correct={correctKeys}
            />
            <p className="text-center text-xs md:text-sm font-semibold text-slate-500 mt-3">
              对着琴键乱按吧！黄色光圈是要找的键，按对会亮起来 ✨
            </p>
          </footer>
        </>
      )}
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold transition-all ${
        active ? `${color} text-white shadow-md scale-105` : 'bg-white/70 text-slate-600 hover:bg-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
