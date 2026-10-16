'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, type Profile } from '@/context/AuthContext';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { 
  Users, 
  Radio, 
  MessageSquare, 
  Flame, 
  Crown, 
  Menu, 
  X, 
  ChevronDown, 
  LayoutDashboard, 
  User, 
  LogOut, 
  ArrowRight,
  ShieldCheck,
  Tv,
  Trophy,
  Settings
} from 'lucide-react';

// ============================================================================
// RESILIENT NAVBAR AVATAR COMPONENT
// ============================================================================
function NavbarAvatar({
  profile,
  user,
  size = 32,
  className = '',
}: {
  profile: Profile | null;
  user: SupabaseUser | null;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  const userEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const isFounder = userEmail === 'tychiquebongo@gmail.com' || userEmail === 'tychiquebong@gmail.com' || profile?.role === 'admin';
  const fullName = profile?.full_name || (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || (isFounder ? 'Tychique Bongo' : (userEmail ? userEmail.split('@')[0] : 'User'));

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'EB');

  const candidateUrl = isFounder
    ? '/assets/images/tychique-bongo.jpg'
    : (profile?.avatar_url && !profile.avatar_url.includes('/assets/avatars/')
        ? profile.avatar_url
        : ((user?.user_metadata?.avatar_url as string) || (user?.user_metadata?.picture as string) || null));

  if (!candidateUrl || imgError) {
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = (hash << 5) - hash + fullName.charCodeAt(i);
    }
    const gradients = [
      'from-cyan-500 to-blue-700',
      'from-sky-400 to-indigo-600',
      'from-teal-400 to-cyan-700',
      'from-blue-500 to-cyan-600',
    ];
    const grad = gradients[Math.abs(hash) % gradients.length];

    return (
      <div
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        className={`rounded-full bg-gradient-to-tr ${grad} text-white font-black flex items-center justify-center shrink-0 select-none shadow-sm ${className}`}
        title={fullName}
      >
        <span style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }} className="tracking-wide">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={candidateUrl}
      alt={fullName}
      width={size}
      height={size}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      onError={() => setImgError(true)}
      className={`rounded-full object-cover shrink-0 select-none ${className}`}
    />
  );
}

// ============================================================================
// SPACIOUS & UNCLUTTERED FLOATING SAAS NAVBAR
// ============================================================================
export default function Navbar() {
  const pathname = usePathname();
  const { user, profile, isAdmin, signOut, playSound } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isUserLoggedIn = mounted && Boolean(user);
  const isUserAdmin = mounted && Boolean(isAdmin);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navRef = useRef<HTMLElement>(null);

  // Scroll detection
  useEffect(() => {
    let ticking = false;
    let lastScrolled = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 20;
          if (scrolled !== lastScrolled) {
            lastScrolled = scrolled;
            setIsScrolled(scrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Click outside handling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Primary Curated Navigation Items (Clean & Uncluttered)
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/partners', label: 'Partners' },
    { href: '/live', label: 'Live Rooms' },
    { href: '/chat', label: 'Chat' },
    { href: '/status', label: 'Stories' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <header 
      ref={navRef}
      className="sticky top-2 sm:top-5 z-50 w-full px-2.5 sm:px-6 lg:px-12 pointer-events-none transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto pointer-events-auto">
        
        {/* ============================================================== */}
        {/* FLOATING GLASSMORPHIC CAPSULE — AIRY & SPACIOUS                */}
        {/* ============================================================== */}
        <div 
          className={`relative w-full rounded-full transition-all duration-300 px-3.5 sm:px-6 md:px-10 ${
            isScrolled
              ? 'bg-[#070d1b]/90 backdrop-blur-md border border-cyan-500/25 shadow-[0_12px_45px_-5px_rgba(0,0,0,0.7),0_0_30px_rgba(6,182,212,0.15)]'
              : 'bg-[#070d1b]/75 backdrop-blur-md border border-white/10 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Subtle specular glow line */}
          <div className="absolute -top-px inset-x-8 sm:inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

          {/* Inner flex bar with relaxed height and responsive spacing */}
          <div className="h-14 sm:h-[4.25rem] flex items-center justify-between gap-2 sm:gap-6 md:gap-8 lg:gap-12">
            
            {/* ========================================================== */}
            {/* BRAND LOGO: Clean, sleek, spacious                        */}
            {/* ========================================================== */}
            <Link 
              href="/" 
              onClick={() => playSound?.('click')}
              className="flex items-center gap-2 sm:gap-3.5 group shrink-0 min-w-0"
              title="English Booster Home"
            >
              {/* Electric Icon */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.35)] group-hover:scale-105 transition-transform shrink-0">
                <div className="w-full h-full bg-[#070d1b] rounded-[10px] flex items-center justify-center font-black text-xs sm:text-sm text-white">
                  EB
                </div>
              </div>

              {/* Title */}
              <span className="text-sm sm:text-lg font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors truncate max-w-[130px] xs:max-w-none">
                English Booster
              </span>
            </Link>

            {/* ========================================================== */}
            {/* DESKTOP NAV: Spaced out with generous gaps between links   */}
            {/* ========================================================== */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-7 xl:gap-9">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => playSound?.('click')}
                    className={`text-sm font-semibold transition-colors duration-150 px-2.5 py-1.5 rounded-lg relative ${
                      isActive 
                        ? 'text-cyan-300 font-bold' 
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-1 inset-x-2 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
                    )}
                  </Link>
                );
              })}

              {/* Admin Hub Link (if admin) */}
              {isUserAdmin && (
                <Link
                  href="/admin"
                  prefetch={true}
                  onClick={() => playSound?.('click')}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                    pathname === '/admin'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>

            {/* ========================================================== */}
            {/* RIGHT SECTION: Generous gap between actions                */}
            {/* ========================================================== */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 shrink-0">
              
              {isUserLoggedIn ? (
                /* Logged In View: Avatar with Dropdown */
                <div className="flex items-center gap-4 relative">
                  {/* User Avatar with Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(!userDropdownOpen);
                        playSound?.('click');
                      }}
                      className="flex items-center gap-2 p-1 rounded-full ring-2 ring-cyan-500/30 hover:ring-cyan-400 transition-all cursor-pointer"
                      aria-label="User Menu"
                    >
                      <NavbarAvatar
                        profile={profile}
                        user={user}
                        size={34}
                      />
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                    </button>

                    {/* Clean Dropdown Card */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 top-full mt-3 w-64 rounded-2xl bg-[#070d1b]/95 border border-cyan-500/20 shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-menu-enter">
                        
                        <div className="p-2 border-b border-white/10 mb-2">
                          <p className="text-sm font-bold text-white truncate">
                            {profile?.full_name || user?.email?.split('@')[0]}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                        </div>

                        <div className="flex flex-col gap-0.5 text-xs font-medium text-slate-300">
                          <Link
                            href="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                            <span>Dashboard</span>
                          </Link>

                          <Link
                            href="/profile"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <User className="w-4 h-4 text-sky-400" />
                            <span>Profile & Goals</span>
                          </Link>

                          <Link
                            href="/pricing"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-amber-300 hover:bg-white/5 transition-colors"
                          >
                            <Crown className="w-4 h-4 text-amber-400" />
                            <span>Upgrade to VIP</span>
                          </Link>

                          {isAdmin && (
                            <Link
                              href="/admin"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                            >
                              <ShieldCheck className="w-4 h-4 text-rose-400" />
                              <span>Admin Back Office</span>
                            </Link>
                          )}
                        </div>

                        <div className="border-t border-white/10 mt-2 pt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setUserDropdownOpen(false);
                              signOut();
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign out</span>
                          </button>
                        </div>

                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* Guest View: Clean Sign In link + 1 Vibrant CTA */
                <div className="flex items-center gap-6">
                  <Link
                    href="/login"
                    onClick={() => playSound?.('click')}
                    className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-2 py-1"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => playSound?.('chime')}
                    className="px-5 py-2.5 rounded-full text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <span>Start Free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

            </div>

            {/* ========================================================== */}
            {/* MOBILE MENU TRIGGER (< md)                                 */}
            {/* ========================================================== */}
            <div className="md:hidden flex items-center gap-2">
              {isUserLoggedIn && (
                <Link
                  href="/profile"
                  onClick={() => playSound?.('click')}
                  className="p-0.5 rounded-full ring-2 ring-cyan-500/30"
                >
                  <NavbarAvatar profile={profile} user={user} size={28} />
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  playSound?.('click');
                }}
                className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>

        </div>

        {/* ============================================================== */}
        {/* MOBILE DROPDOWN DRAWER                                         */}
        {/* ============================================================== */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 w-full rounded-3xl bg-[#070d1b]/98 border border-cyan-500/20 backdrop-blur-2xl shadow-2xl p-4 animate-menu-enter max-h-[calc(100dvh-5.5rem)] overflow-y-auto">
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-2xl text-xs font-bold text-center border transition-all ${
                    pathname === item.href
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Additional Secondary Links */}
            <div className="flex flex-col gap-1 border-t border-white/10 pt-2 mb-3">
              <Link
                href="/watch"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5"
              >
                <Tv className="w-4 h-4 text-cyan-400" />
                <span>Shorts & Videos</span>
              </Link>

              <Link
                href="/leaderboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5"
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>Leaderboard</span>
              </Link>

              {isUserLoggedIn && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5"
                >
                  <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                  <span>My Dashboard</span>
                </Link>
              )}

              {isUserAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
                >
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span>Admin Back Office</span>
                </Link>
              )}
            </div>

            {/* Mobile Footer CTA */}
            <div className="pt-2 border-t border-white/10">
              {isUserLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-bold text-center"
                >
                  Sign Out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 rounded-xl bg-white/5 text-center text-xs font-bold text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-center text-xs font-black text-slate-950"
                  >
                    Start Free
                  </Link>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </header>
  );
}
