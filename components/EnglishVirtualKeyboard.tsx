'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Delete, 
  CornerDownLeft, 
  ArrowBigUp, 
  Sparkles, 
  Globe, 
  Keyboard as KeyboardIcon,
  ChevronDown,
  ChevronUp,
  X,
  Volume2
} from 'lucide-react';

interface EnglishVirtualKeyboardProps {
  onInsertText: (text: string) => void;
  onDeleteChar: () => void;
  onClear?: () => void;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

const CONTRACTIONS = [
  "I'm",
  "don't",
  "can't",
  "it's",
  "we'll",
  "you're",
  "they're",
  "didn't",
  "won't",
  "wouldn't",
  "could've",
  "let's",
  "I'd",
  "that's"
];

const DAILY_STARTERS = [
  "Today I learned...",
  "Quick English idiom:",
  "Pronunciation tip:",
  "In my opinion,",
  "Did you know that...",
  "My daily goal is:",
  "Fun fact:",
  "Practice with me:"
];

const POPULAR_IDIOMS = [
  "Break a leg!",
  "Piece of cake!",
  "Hit the books",
  "Bite the bullet",
  "Under the weather",
  "So far so good",
  "Step by step",
  "Keep it up!"
];

const QWERTY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

const NUMBER_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const SYMBOL_ROWS = [
  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
  ['-', '_', '=', '+', '[', ']', '{', '}', '\\', '|'],
  [';', ':', '"', '<', '>', '/', '`', '~']
];

export default function EnglishVirtualKeyboard({
  onInsertText,
  onDeleteChar,
  onClear,
  className = '',
  isOpen = true,
  onToggle
}: EnglishVirtualKeyboardProps) {
  const { playSound } = useAuth();
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [mode, setMode] = useState<'qwerty' | 'symbols'>('qwerty');
  const [activeTab, setActiveTab] = useState<'contractions' | 'starters' | 'idioms'>('contractions');

  if (!isOpen) {
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <KeyboardIcon className="w-4 h-4 text-emerald-400" />
          <span>🇬🇧 Ouvrir le Clavier Anglais QWERTY</span>
        </button>
      </div>
    );
  }

  const handleKeyClick = (char: string) => {
    playSound('click');
    const finalChar = isShiftActive ? char.toUpperCase() : char.toLowerCase();
    onInsertText(finalChar);
  };

  const handleInsertPhrase = (phrase: string) => {
    playSound('click');
    onInsertText(phrase.endsWith(' ') ? phrase : `${phrase} `);
  };

  const handleBackspace = () => {
    playSound('click');
    onDeleteChar();
  };

  const handleSpace = () => {
    playSound('click');
    onInsertText(' ');
  };

  return (
    <div className={`p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 dark:bg-[#070d1d]/95 border border-emerald-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-fade-in text-white select-none ${className}`}>
      
      {/* Top Header: Title, Shortcuts Tabs, & Close */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🇬🇧</span>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <span>Clavier Anglais</span>
            <span className="hidden xs:inline text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">QWERTY</span>
          </span>
        </div>

        {/* Categories Tab Selector */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('contractions')}
            className={`px-2 py-0.5 rounded-md transition-all ${
              activeTab === 'contractions'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Contractions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('starters')}
            className={`px-2 py-0.5 rounded-md transition-all ${
              activeTab === 'starters'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Starters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('idioms')}
            className={`px-2 py-0.5 rounded-md transition-all ${
              activeTab === 'idioms'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Idioms
          </button>
        </div>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Masquer le clavier"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Chips Horizontal Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
        {activeTab === 'contractions' && (
          CONTRACTIONS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertPhrase(chip)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              {chip}
            </button>
          ))
        )}

        {activeTab === 'starters' && (
          DAILY_STARTERS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertPhrase(chip)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              {chip}
            </button>
          ))
        )}

        {activeTab === 'idioms' && (
          POPULAR_IDIOMS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertPhrase(chip)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              {chip}
            </button>
          ))
        )}
      </div>

      {/* Virtual QWERTY Keypad */}
      <div className="space-y-1.5 max-w-lg mx-auto">
        
        {/* Number Row */}
        <div className="flex justify-center gap-1 sm:gap-1.5">
          {NUMBER_ROW.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyClick(num)}
              className="flex-1 max-w-[42px] h-8 sm:h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 font-mono text-xs sm:text-sm font-bold border border-white/5 transition-all shadow-sm flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}
        </div>

        {mode === 'qwerty' ? (
          <>
            {/* Row 1: Q W E R T Y U I O P */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {QWERTY_ROWS[0].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleKeyClick(letter)}
                  className="flex-1 max-w-[42px] h-9 sm:h-10 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-xs sm:text-sm font-black border border-white/10 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {isShiftActive ? letter.toUpperCase() : letter}
                </button>
              ))}
            </div>

            {/* Row 2: A S D F G H J K L */}
            <div className="flex justify-center gap-1 sm:gap-1.5 px-2">
              {QWERTY_ROWS[1].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleKeyClick(letter)}
                  className="flex-1 max-w-[42px] h-9 sm:h-10 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-xs sm:text-sm font-black border border-white/10 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {isShiftActive ? letter.toUpperCase() : letter}
                </button>
              ))}
            </div>

            {/* Row 3: Shift + Z X C V B N M + Backspace */}
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {/* Shift Key */}
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setIsShiftActive(!isShiftActive);
                }}
                className={`flex-[1.4] max-w-[54px] h-9 sm:h-10 rounded-lg text-xs font-bold border transition-all flex items-center justify-center cursor-pointer ${
                  isShiftActive 
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]' 
                    : 'bg-slate-700/80 hover:bg-slate-600 text-slate-300 border-white/10'
                }`}
                title="Shift (Majuscule)"
              >
                <ArrowBigUp className={`w-4 h-4 ${isShiftActive ? 'fill-slate-950 stroke-[2.5]' : ''}`} />
              </button>

              {QWERTY_ROWS[2].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleKeyClick(letter)}
                  className="flex-1 max-w-[42px] h-9 sm:h-10 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-xs sm:text-sm font-black border border-white/10 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {isShiftActive ? letter.toUpperCase() : letter}
                </button>
              ))}

              {/* Backspace Key */}
              <button
                type="button"
                onClick={handleBackspace}
                className="flex-[1.4] max-w-[54px] h-9 sm:h-10 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 active:scale-95 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                title="Supprimer (Backspace)"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          /* Symbols View */
          <>
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {SYMBOL_ROWS[0].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleKeyClick(sym)}
                  className="flex-1 max-w-[42px] h-9 sm:h-10 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-xs sm:text-sm font-mono font-bold border border-white/10 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {sym}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {SYMBOL_ROWS[1].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleKeyClick(sym)}
                  className="flex-1 max-w-[42px] h-9 sm:h-10 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-xs sm:text-sm font-mono font-bold border border-white/10 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {sym}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {SYMBOL_ROWS[2].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleKeyClick(sym)}
                  className="flex-1 max-w-[42px] h-9 sm:h-10 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 text-xs sm:text-sm font-mono font-bold border border-white/10 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {sym}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                className="flex-[1.4] max-w-[54px] h-9 sm:h-10 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Bottom Function Row: ?123 / ABC, Apostrophe ', Spacebar, Punctuation (. ? !), Clear */}
        <div className="flex justify-center items-center gap-1 sm:gap-1.5 pt-1">
          {/* Mode Switcher (?123 / ABC) */}
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setMode(mode === 'qwerty' ? 'symbols' : 'qwerty');
            }}
            className="flex-none px-2.5 h-9 sm:h-10 rounded-lg bg-slate-700/80 hover:bg-slate-600 border border-white/10 text-xs font-bold text-slate-200 transition-all cursor-pointer"
          >
            {mode === 'qwerty' ? '?123' : 'ABC'}
          </button>

          {/* Apostrophe key (crucial for English contractions like I'm, don't) */}
          <button
            type="button"
            onClick={() => handleKeyClick("'")}
            className="flex-none w-8 sm:w-10 h-9 sm:h-10 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 border border-white/10 text-sm font-black text-amber-300 transition-all flex items-center justify-center cursor-pointer"
            title="English Apostrophe (')"
          >
            '
          </button>

          {/* Comma key */}
          <button
            type="button"
            onClick={() => handleKeyClick(',')}
            className="flex-none w-8 sm:w-9 h-9 sm:h-10 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 border border-white/10 text-xs font-bold text-slate-300 transition-all flex items-center justify-center cursor-pointer"
          >
            ,
          </button>

          {/* Spacebar */}
          <button
            type="button"
            onClick={handleSpace}
            className="flex-1 h-9 sm:h-10 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 border border-white/15 text-xs font-bold text-slate-300 transition-all shadow-inner flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="text-[10px] sm:text-xs text-slate-400">English Space</span>
          </button>

          {/* Period key */}
          <button
            type="button"
            onClick={() => handleKeyClick('.')}
            className="flex-none w-8 sm:w-9 h-9 sm:h-10 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 active:text-slate-950 border border-white/10 text-xs font-bold text-slate-300 transition-all flex items-center justify-center cursor-pointer"
          >
            .
          </button>

          {/* Question mark key */}
          <button
            type="button"
            onClick={() => handleKeyClick('?')}
            className="flex-none w-8 sm:w-10 h-9 sm:h-10 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 active:scale-95 text-xs font-black transition-all flex items-center justify-center cursor-pointer"
            title="Question mark (?)"
          >
            ?
          </button>

          {/* Exclamation point key */}
          <button
            type="button"
            onClick={() => handleKeyClick('!')}
            className="flex-none w-8 sm:w-10 h-9 sm:h-10 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 active:scale-95 text-xs font-black transition-all flex items-center justify-center cursor-pointer"
            title="Exclamation (!)"
          >
            !
          </button>

        </div>

      </div>

    </div>
  );
}
