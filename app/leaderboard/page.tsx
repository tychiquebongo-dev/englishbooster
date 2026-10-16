'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getUserAvatar } from '@/lib/avatarHelper';
import { isRealPartnerProfile } from '@/lib/partnerHelper';
import { Trophy, Crown, Medal, Flame, Star, Globe, Sparkles } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  full_name: string;
  avatar_url: string;
  flag: string;
  country: string;
  current_level: string;
  streak: number;
  minutes_spoken?: number;
}

export default function LeaderboardPage() {
  const { user, profile, playSound } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [activeTab, setActiveTab] = useState<'global' | 'weekly'>('global');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, flag, country, current_level, streak, minutes_spoken, role, email')
        .order('streak', { ascending: false })
        .limit(15);

      if (data && data.length > 0) {
        const realUsers = data.filter(isRealPartnerProfile);
        const mapped = realUsers.map((u: any) => {
          const isFounder = u.email === 'tychiquebongo@gmail.com' || u.role === 'admin';
          return {
            ...u,
            country: isFounder ? "Côte d'Ivoire" : u.country,
            flag: isFounder ? '🇨🇮' : u.flag,
            current_level: isFounder ? 'C2' : u.current_level,
          };
        });
        setTopUsers(mapped as LeaderboardUser[]);
      }

      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const displayedUsers = React.useMemo(() => {
    if (activeTab === 'weekly') {
      return [...topUsers].sort((a, b) => {
        const scoreA = (a.streak * 60) + (a.minutes_spoken || 0);
        const scoreB = (b.streak * 60) + (b.minutes_spoken || 0);
        return scoreB - scoreA;
      });
    }
    return topUsers;
  }, [topUsers, activeTab]);

  const champion1 = displayedUsers[0];
  const champion2 = displayedUsers[1];
  const champion3 = displayedUsers[2];
  const restUsers = displayedUsers.slice(3);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5" />
          <span>{isFr ? "Classement des Champions Mondiaux" : "World Champions Leaderboard"}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {isFr ? "Podium de l'Aisance Orale" : "Fluency Hall of Fame"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          {isFr 
            ? "Pratiquez des appels vocaux en direct, maintenez votre série quotidienne et progressez avec des partenaires internationaux."
            : "Practice live voice calls, keep your daily streak alive, and build real-world speaking confidence with international partners."}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab('global');
              playSound('click');
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'global'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            🏆 {isFr ? "Tous les Temps" : "All Time"}
          </button>
          <button
            onClick={() => {
              setActiveTab('weekly');
              playSound('click');
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'weekly'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            🔥 {isFr ? "Cette Semaine" : "This Week"}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!loading && topUsers.length === 0 && (
        <div className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm text-center p-10 space-y-4 max-w-lg mx-auto">
          <Trophy className="w-12 h-12 text-amber-500 dark:text-amber-400 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isFr ? "Le classement est vide pour le moment" : "The leaderboard is currently empty"}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isFr 
              ? "Soyez le premier à maintenir votre série active en participant aux salons vocaux et défis quotidiens !"
              : "Be the first to build a streak by participating in live rooms and daily voice challenges!"}
          </p>
        </div>
      )}

      {/* ADAPTIVE PODIUM SECTION (Shows 1, 2, or 3+ real members) */}
      {topUsers.length > 0 && (
        <div className={`grid ${topUsers.length === 1 ? 'grid-cols-1 max-w-xs' : topUsers.length === 2 ? 'grid-cols-2 max-w-md' : 'grid-cols-3 max-w-2xl'} gap-3 sm:gap-6 items-end mx-auto pt-6`}>
          
          {/* 🥈 Second Place (if 2 or more users) */}
          {champion2 && (
            <div className="flex flex-col items-center order-1 sm:order-1">
              <div className="relative mb-3 group">
                <img
                  src={getUserAvatar(champion2.avatar_url, champion2.full_name)}
                  alt={champion2.full_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-slate-400 shadow-lg"
                />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                  2
                </span>
              </div>
              <p className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white text-center line-clamp-1">
                {champion2.full_name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{champion2.flag || '🌐'} • {champion2.streak || 0} {isFr ? 'j série' : 'd streak'}</p>
              <div className="w-full h-24 sm:h-32 mt-3 rounded-t-2xl bg-gradient-to-b from-slate-400/20 to-slate-400/5 border-t-2 border-slate-400/60 flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300">2nd</span>
              </div>
            </div>
          )}

          {/* 🥇 First Place (Gold) */}
          {champion1 && (
            <div className={`flex flex-col items-center ${topUsers.length === 3 ? 'order-2' : 'order-1'}`}>
              <Crown className="w-8 h-8 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400 animate-bounce mb-1" />
              <div className="relative mb-3 group">
                <img
                  src={getUserAvatar(champion1.avatar_url, champion1.full_name)}
                  alt={champion1.full_name}
                  className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-amber-500 dark:ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                />
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
                  1
                </span>
              </div>
              <p className="font-black text-sm sm:text-base text-slate-900 dark:text-white text-center line-clamp-1">
                {champion1.full_name}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">{champion1.flag || '🇨🇮'} • {champion1.streak || 0} {isFr ? 'jours de série' : 'days streak'}</p>
              <div className="w-full h-32 sm:h-44 mt-3 rounded-t-2xl bg-gradient-to-b from-amber-500/25 to-amber-500/5 border-t-2 border-amber-400 flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">1st 👑</span>
              </div>
            </div>
          )}

          {/* 🥉 Third Place (if 3 or more users) */}
          {champion3 && (
            <div className="flex flex-col items-center order-3">
              <div className="relative mb-3 group">
                <img
                  src={getUserAvatar(champion3.avatar_url, champion3.full_name)}
                  alt={champion3.full_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-amber-700 shadow-lg"
                />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs shadow-md">
                  3
                </span>
              </div>
              <p className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white text-center line-clamp-1">
                {champion3.full_name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{champion3.flag || '🌐'} • {champion3.streak || 0} {isFr ? 'j série' : 'd streak'}</p>
              <div className="w-full h-20 sm:h-24 mt-3 rounded-t-2xl bg-gradient-to-b from-amber-700/20 to-amber-700/5 border-t-2 border-amber-700/60 flex items-center justify-center">
                <span className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-600">3rd</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* REST OF LEADERBOARD LIST */}
      <div className="saas-card bg-white dark:bg-[#080d1a] border-slate-200 dark:border-white/10 shadow-sm p-4 sm:p-6 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 mb-2">
          {isFr ? "Classement Général des Membres" : "General Members Leaderboard"}
        </h3>

        {restUsers.map((u, index) => {
          const rank = index + 4;
          const isCurrentUser = user?.id === u.id;
          return (
            <div
              key={u.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                isCurrentUser
                  ? 'bg-emerald-500/15 border-emerald-500/40 shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-slate-200 dark:border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="w-6 text-center font-mono font-black text-sm text-slate-500 dark:text-slate-400">
                  #{rank}
                </span>

                <img
                  src={getUserAvatar(u.avatar_url, u.full_name)}
                  alt={u.full_name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/20"
                />

                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{u.full_name}</span>
                    <span>{u.flag}</span>
                    {isCurrentUser && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black">
                        {isFr ? 'Vous' : 'You'}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFr ? 'Niveau' : 'Level'} {u.current_level} • {u.country}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-black text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{u.streak || 0} {isFr ? 'jours' : 'days'}</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {u.minutes_spoken || 0} min {isFr ? 'de parole' : 'spoken'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
