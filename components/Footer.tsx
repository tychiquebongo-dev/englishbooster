'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Phone, MessageSquare, Heart, Shield, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function Footer() {
  const pathname = usePathname();
  const { lang, isFr } = useTranslation();

  // Hide footer on chat or call interfaces to maximize interactive screen space
  if (pathname.startsWith('/chat') || pathname.startsWith('/call')) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#04070e] relative overflow-hidden pt-16 pb-12 transition-colors duration-300">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 p-[1.5px] shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                <div className="w-full h-full bg-slate-900 dark:bg-[#060a14] rounded-[9px] flex items-center justify-center font-black text-lg text-emerald-400">
                  EB
                </div>
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-600 dark:from-white dark:via-slate-100 dark:to-emerald-400 bg-clip-text text-transparent">
                English Booster
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isFr
                ? "La plateforme SaaS internationale pour débloquer votre aisance orale en anglais grâce à la pratique conversationnelle en direct avec des interlocuteurs du monde entier."
                : "The global SaaS platform to unlock your spoken English fluency through live conversation practice with partners worldwide."}
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Connect. Speak. Improve.</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              {isFr ? "Plateforme" : "Platform"}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Accueil" : "Home"}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Tableau de bord" : "Dashboard"}
                </Link>
              </li>
              <li>
                <Link href="/partners" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Trouver un Partenaire" : "Find Partners"}
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Conversation Internationale" : "International Chat"}
                </Link>
              </li>
              <li>
                <Link href="/call" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Appels Vidéo & Audio Live" : "Live Video & Audio Calls"}
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Espace Statuts & Stories" : "Status & Stories Space"}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Offres & Tarifs SaaS" : "Pricing & SaaS Plans"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Community & Legal */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              {isFr ? "Communauté & Ressources" : "Community & Resources"}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/community" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Flux Social Global" : "Global Community Feed"}
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Podium des Champions" : "Champions Leaderboard"}
                </Link>
              </li>
              <li>
                <Link href="/watch" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "Shorts Vidéos Pédagogiques" : "Learning Video Shorts"}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {isFr ? "À Propos & FAQ" : "About & FAQ"}
                </Link>
              </li>
              <li className="flex items-center gap-1.5 text-slate-500 pt-2">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isFr ? "Sécurité Supabase RLS & SSL" : "Supabase RLS & SSL Security"}</span>
              </li>
            </ul>
          </div>

          {/* Founder Spotlight: Tychique Bongo */}
          <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3 shadow-sm">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between">
              <span>{isFr ? "Fondateur & Vision" : "Founder & Vision"}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                CEO
              </span>
            </h4>
            <div className="flex items-center gap-3">
              <img
                src="https://bolmrscavaeiqzytfzej.supabase.co/storage/v1/object/public/avatars/30c6222c-7d9e-4086-a289-19ca5b81262c/1791825017392.jpeg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/images/tychique-bongo.jpg'; }}
                alt="Tychique Bongo"
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/50 shadow-md"
              />
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">Tychique Bongo</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isFr ? "Fondateur & Directeur Général" : "Founder & Executive Director"}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <a 
                href="mailto:tychiquebongo@gmail.com" 
                className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>tychiquebongo@gmail.com</span>
              </a>
              <a 
                href="https://wa.me/242069053712" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp: +242 06 905 37 12</span>
              </a>
              <a 
                href="tel:+2250705884687" 
                className="flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isFr ? "Tél" : "Tel"}: +225 07 05 88 46 87</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} English Booster SaaS Inc. {isFr ? "Tous droits réservés." : "All rights reserved."}</p>
          <div className="flex items-center gap-2">
            <span>{isFr ? "Conçu avec" : "Designed with"}</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
            <span>{isFr ? "pour les apprenants d'anglais du monde entier." : "for English learners across the globe."}</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
