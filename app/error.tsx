'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('English Booster client-side error caught:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl bg-[#111b21] border border-amber-500/30 p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400 shadow-lg">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Une erreur temporaire est survenue</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Une exception a été interceptée. Vous pouvez réinitialiser le composant ou recharger pour reprendre votre session.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-amber-300/80 bg-black/40 p-2.5 rounded-xl border border-white/5 break-words">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer / Try Again</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Recharger la page / Reload page</span>
          </button>

          <Link
            href="/"
            className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Retour à l&apos;accueil / Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
