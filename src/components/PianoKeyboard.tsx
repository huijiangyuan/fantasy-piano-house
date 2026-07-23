import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface BlackKeyDef {
  /** lower-case key char, e.g. "z" */
  key: string;
  /** index of the white key this black key sits *after* (0-based) */
  after: number;
}

interface PianoKeyboardProps {
  /** lower-case white key chars, left → right */
  whiteKeys: string[];
  /** raised black keys positioned over white-key gaps */
  blackKeys: BlackKeyDef[];
  /** keys currently held down (for press feedback) */
  pressed: Set<string>;
  /** guided-target keys to highlight */
  target: string[];
  /** keys that were just hit correctly (star burst) */
  correct: string[];
}

const WHITE_BASE =
  'relative flex-1 h-full rounded-b-2xl bg-gradient-to-b from-white via-white to-slate-100 ' +
  'border-2 border-slate-200 border-t-0 shadow-[0_8px_0_0_rgba(148,163,184,0.55)] ' +
  'flex items-end justify-center pb-3 md:pb-5 font-display text-2xl md:text-4xl text-slate-400 ' +
  'transition-all duration-75 select-none';

const WHITE_ACTIVE =
  'translate-y-2 shadow-[0_3px_0_0_rgba(148,163,184,0.55)] ' +
  'from-sky-200 via-sky-100 to-white text-sky-600';

const WHITE_TARGET = 'text-blue-500 ring-4 ring-yellow-300 ring-inset';

const WHITE_CORRECT =
  'from-green-300 via-green-200 to-white text-white shadow-[0_0_24px_rgba(74,222,128,0.85)]';

const BLACK_BASE =
  'absolute top-0 h-[62%] rounded-b-xl bg-gradient-to-b from-slate-700 via-slate-800 to-black ' +
  'border border-slate-900 shadow-[0_5px_0_0_rgba(0,0,0,0.6)] z-20 ' +
  'flex items-end justify-center pb-2 font-display text-base md:text-xl text-slate-300 ' +
  'transition-all duration-75 select-none';

const BLACK_ACTIVE =
  'translate-y-1 shadow-[0_2px_0_0_rgba(0,0,0,0.6)] from-sky-500 via-sky-600 to-sky-800 text-white';

const BLACK_TARGET = 'text-yellow-200 ring-2 ring-yellow-300';

const BLACK_CORRECT =
  'from-green-400 via-green-500 to-green-700 text-white shadow-[0_0_18px_rgba(74,222,128,0.9)]';

function WhiteKey({
  char,
  pressed,
  target,
  correct,
}: {
  key?: React.Key;
  char: string;
  pressed: boolean;
  target: boolean;
  correct: boolean;
}) {
  const cls =
    WHITE_BASE +
    (pressed ? ' ' + WHITE_ACTIVE : '') +
    (correct ? ' ' + WHITE_CORRECT : target && !correct ? ' ' + WHITE_TARGET : '');

  return (
    <div className={cls} aria-label={`琴键 ${char.toUpperCase()}`}>
      {char.toUpperCase()}
      <AnimatePresence>
        {correct && (
          <motion.div
            initial={{ scale: 0, opacity: 1, y: 0 }}
            animate={{ scale: 2.2, opacity: 0, y: -40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none text-3xl"
          >
            🌟
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BlackKey({
  def,
  whiteCount,
  pressed,
  target,
  correct,
}: {
  key?: React.Key;
  def: BlackKeyDef;
  whiteCount: number;
  pressed: boolean;
  target: boolean;
  correct: boolean;
}) {
  const whitePct = 100 / whiteCount;
  const blackW = whitePct * 0.62;
  const leftPct = (def.after + 1) * whitePct - blackW / 2;

  const cls =
    BLACK_BASE +
    (pressed ? ' ' + BLACK_ACTIVE : '') +
    (correct ? ' ' + BLACK_CORRECT : target && !correct ? ' ' + BLACK_TARGET : '');

  return (
    <div
      className={cls}
      style={{ left: `${leftPct}%`, width: `${blackW}%` }}
      aria-label={`黑键 ${def.key.toUpperCase()}`}
    >
      {def.key.toUpperCase()}
      <AnimatePresence>
        {correct && (
          <motion.div
            initial={{ scale: 0, opacity: 1, y: 0 }}
            animate={{ scale: 2.2, opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none text-xl"
          >
            🌟
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PianoKeyboard({
  whiteKeys,
  blackKeys,
  pressed,
  target,
  correct,
}: PianoKeyboardProps) {
  return (
    // Horizontal scroll on small screens keeps keys tappable instead of squished.
    <div className="w-full overflow-x-auto overflow-y-hidden" style={{ touchAction: 'pan-x' }}>
      <div className="relative mx-auto flex h-28 md:h-56 min-w-[640px] max-w-5xl px-1">
        {whiteKeys.map((k) => (
          <WhiteKey
            key={k}
            char={k}
            pressed={pressed.has(k)}
            target={target.includes(k)}
            correct={correct.includes(k)}
          />
        ))}
        {blackKeys.map((def) => (
          <BlackKey
            key={def.key}
            def={def}
            whiteCount={whiteKeys.length}
            pressed={pressed.has(def.key)}
            target={target.includes(def.key)}
            correct={correct.includes(def.key)}
          />
        ))}
      </div>
    </div>
  );
}
