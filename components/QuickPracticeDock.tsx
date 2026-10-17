'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Radio, 
  Users, 
  MessageSquare, 
  Sparkles, 
  PhoneCall, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Flame
} from 'lucide-react';

export default function QuickPracticeDock() {
  const pathname = usePathname();
  const { playSound, lang, user, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Hide dock on auth pages (login / welcome back, register), and during call / chat
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/call') ||
    pathname.startsWith('/chat')
  ) {
    return null;
  }

  // If user is not yet logged in, strictly only display the dock on the registered members page (/partners)
  if (!user && pathname !== '/partners') {
    return null;
  }

  const items = [
    {
      href: '/live',
      label: 'Live Rooms',
      icon: Radio,
      badge: 'LIVE',
      badgeClass: 'bg-rose-500 text-white animate-pulse',
      glow: 'hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]',
      color: 'text-rose-400 group-hover:text-rose-300',
    },
    {
      href: '/partners',
      label: 'Partners',
      icon: Users,
      badge: 'ONLINE',
      badgeClass: 'bg-emerald-500 text-slate-950 font-black',
      glow: 'hover:shadow-[0_0_20px_rgba(74,222,128,0.4)]',
      color: 'text-emerald-400 group-hover:text-emerald-300',
    },
    {
      href: '/status',
      label: 'Status',
      icon: Flame,
      badge: 'STATUS',
      badgeClass: 'bg-amber-500 text-slate-950 font-black',
      glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
      color: 'text-amber-400 group-hover:text-amber-300',
    },
    {
      href: '/chat',
      label: 'Chat',
      icon: MessageSquare,
      glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]',
      color: 'text-blue-400 group-hover:text-blue-300',
    },
  ];

  return (
    <aside 
      aria-label="Quick Action Dock"
      className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none px-2 sm:px-3 safe-pb"
    >
      <div className="pointer-events-auto transition-all duration-300 transform">
        {collapsed ? (
          /* Mini Trigger Pill */
          <button
            type="button"
            onClick={() => {
              playSound('click');
              setCollapsed(false);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#091124]/90 border border-emerald-500/40 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>⚡ Quick Actions</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        ) : (
          /* Full Interactive Glass Dock */
          <div className="relative flex items-center gap-0.5 sm:gap-2 p-1 sm:p-2 rounded-2xl sm:rounded-3xl bg-[#070d1d]/90 border border-white/15 backdrop-blur-2xl shadow-[0_15px_45px_rgba(0,0,0,0.85)] ring-1 ring-white/5 animate-menu-enter max-w-[calc(100vw-1.5rem)] overflow-x-auto">
            
            {/* Subtle Neon Line */}
            <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none" />

            {/* Quick Practice Links */}
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => playSound('click')}
                  className={`group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 sm:px-3.5 py-1 sm:py-2 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer ${item.glow} ${
                    isActive 
                      ? 'bg-emerald-500/20 border border-emerald-400/40 shadow-[0_0_15px_rgba(74,222,128,0.25)] text-white' 
                      : 'hover:bg-white/10 border border-transparent text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform group-hover:scale-115 ${item.color}`} />
                    {item.badge && (
                      <span className={`absolute -top-1.5 -right-2 text-[8px] px-1 py-0.2 rounded-full font-black leading-none ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap hidden xs:inline sm:inline">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Collapse button */}
            <div className="h-6 w-[1px] bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setCollapsed(true);
              }}
              className="p-1 sm:p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize dock"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

          </div>
        )}
      </div>
    </aside>
  );
}
