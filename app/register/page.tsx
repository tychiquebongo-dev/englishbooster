'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { getInitialsAvatar } from '@/lib/avatarHelper';
import { 
  User, 
  Mail, 
  Lock, 
  Globe, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Target,
  Send,
  RefreshCw,
  Inbox,
  AlertTriangle,
  ExternalLink,
  UserCheck,
  Zap
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { playSound, refreshProfile, signInBypass } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('France');
  const [currentLevel, setCurrentLevel] = useState('B1');
  const [targetLevel, setTargetLevel] = useState('C1');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Email confirmation state
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Already registered user state
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [alreadyRegisteredEmail, setAlreadyRegisteredEmail] = useState('');

  const triggerCelebrationConfetti = async () => {
    try {
      const confettiModule = await import('canvas-confetti');
      const confetti = confettiModule.default || confettiModule;
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4ade80', '#60a5fa', '#f59e0b', '#ffffff'],
        });
      }
    } catch {}
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName || !cleanEmail || !password) {
      setErrorMsg(isFr ? 'Veuillez remplir tous les champs obligatoires.' : 'Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg(isFr ? 'Le mot de passe doit comporter au moins 6 caractères.' : 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setAlreadyRegistered(false);
    playSound('click');

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
          data: {
            full_name: cleanName,
            country: country,
            flag: country === 'France' ? '🇫🇷' : country === "Côte d'Ivoire" ? '🇨🇮' : '🌐',
            current_level: currentLevel,
            target_level: targetLevel,
            avatar_url: getInitialsAvatar(cleanName),
          },
        },
      });

      // Detect if user is already registered (identities: [] in Supabase Auth, or duplicate error, or rate limited)
      const isDuplicateError = Boolean(
        error && (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already in use') ||
          error.message.toLowerCase().includes('already exists')
        )
      );

      const isRateLimited = Boolean(
        error && (
          error.message.toLowerCase().includes('over_email_send_rate_limit') ||
          (error as { status?: number }).status === 429
        )
      );

      // In Supabase Auth, if a user already exists and email confirmation is required,
      // signUp returns error: null, session: null, and data.user.identities: []
      const isDuplicateIdentities = Boolean(
        !error &&
        data?.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      );

      if (isDuplicateError || isDuplicateIdentities || isRateLimited) {
        // Attempt automatic sign-in with the credentials the user just typed!
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (signInData?.session) {
          triggerCelebrationConfetti();
          playSound('success');
          await refreshProfile();
          setSuccessMsg(
            isFr 
              ? 'Ce compte est déjà enregistré ! Mot de passe validé, connexion réussie...' 
              : 'Account already registered! Password verified, logging you in...'
          );
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
          return;
        }

        if (signInError?.message?.toLowerCase().includes('not confirmed')) {
          setRegisteredEmail(cleanEmail);
          setEmailSent(true);
          playSound('chime');
          setLoading(false);
          return;
        }

        // Account is already registered and password did not match
        setAlreadyRegistered(true);
        setAlreadyRegisteredEmail(cleanEmail);
        setLoading(false);
        return;
      }

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      // Check if email confirmation is required (session is null when email confirmation is active)
      if (!data.session) {
        setRegisteredEmail(cleanEmail);
        setEmailSent(true);
        playSound('chime');
        setLoading(false);
        return;
      }

      // If auto-confirmed or session is active:
      triggerCelebrationConfetti();

      playSound('success');
      await refreshProfile();
      setSuccessMsg(isFr ? 'Compte créé avec succès ! Redirection...' : 'Account created successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isFr ? 'Une erreur est survenue.' : 'An error occurred.');
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // Resend email handler
  const handleResendConfirmation = async () => {
    if (!registeredEmail) return;
    setResending(true);
    setResendStatus(null);
    playSound('click');

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setResendStatus(`${isFr ? 'Erreur' : 'Error'} : ${error.message}`);
      } else {
        playSound('chime');
        setResendStatus(isFr ? 'Email de confirmation renvoyé avec succès !' : 'Confirmation email resent successfully!');
      }
    } catch {
      setResendStatus(isFr ? "Impossible de renvoyer l'email pour le moment." : "Unable to resend email right now.");
    } finally {
      setResending(false);
    }
  };

  // If email confirmation is required, render dedicated verification view
  if (emailSent) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="saas-card text-center p-8 sm:p-10 space-y-6 bg-gradient-to-br from-[#0c1630] to-[#0a1124] border border-emerald-400/40 shadow-2xl">
            
            {/* Animated Mail Icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(74,222,128,0.25)] animate-pulse">
              <Inbox className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                {isFr ? "Compte créé avec succès" : "Account created successfully"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {isFr ? "Vérifiez votre boîte de réception Gmail" : "Check your Gmail inbox"}
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                {isFr ? "Un email d'activation vient d'être envoyé à l'adresse :" : "A confirmation email has been sent to:"}
              </p>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-emerald-300 text-sm font-bold inline-block px-5">
                {registeredEmail}
              </div>
            </div>

            {/* Instruction box */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-left space-y-2 text-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{isFr ? "Prochaines étapes :" : "Next steps:"}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                <li>{isFr ? "Ouvrez votre messagerie Gmail" : "Open your Gmail inbox"}</li>
                <li>{isFr ? "Cliquez sur le lien 'Confirmer mon inscription'" : "Click the 'Confirm my signup' link"}</li>
                <li>{isFr ? "Vérifiez vos spams / courriers indésirables si l'email tarde" : "Check your Spam or Junk folder if needed"}</li>
              </ol>
            </div>

            {resendStatus && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 ${
                resendStatus.includes('Erreur') || resendStatus.includes('Error')
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              }`}>
                {resendStatus.includes('Erreur') || resendStatus.includes('Error') ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                )}
                <span>{resendStatus}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? (isFr ? 'Envoi...' : 'Sending...') : (isFr ? "Renvoyer l'email" : "Resend email")}</span>
              </button>

              <Link
                href="/login"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.3)]"
              >
                <span>{isFr ? "Se connecter" : "Sign In"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFr ? "Rejoignez la Communauté" : "Join the Community"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isFr ? "Créez votre compte gratuit" : "Create your free account"}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isFr 
              ? "Pratiquez l'anglais avec des locuteurs réels du monde entier et débloquez votre fluidité."
              : "Practice spoken English with global peers and unlock your conversational potential."}
          </p>
        </div>

        {/* Card */}
        <div className="saas-card bg-[#080d1a] border border-white/10 shadow-xl">
          {alreadyRegistered && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 text-white space-y-3 animate-fadeIn shadow-[0_0_25px_rgba(6,182,212,0.15)]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-300">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-cyan-300">
                    {isFr ? "Compte déjà inscrit sur English Booster" : "Account Already Registered"}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isFr
                      ? `L'adresse email ${alreadyRegisteredEmail} possède déjà un compte. Vous pouvez vous connecter directement ou réinitialiser votre mot de passe.`
                      : `The email address ${alreadyRegisteredEmail} already has an account. You can sign in directly or reset your password.`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href={`/login?email=${encodeURIComponent(alreadyRegisteredEmail)}`}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <span>{isFr ? "Se connecter avec ce compte" : "Sign In with this account"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/login?email=${encodeURIComponent(alreadyRegisteredEmail)}&forgot=true`}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <span>{isFr ? "Mot de passe oublié ?" : "Forgot Password?"}</span>
                </Link>
              </div>
            </div>
          )}

          {!alreadyRegistered && errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                {isFr ? "Nom complet" : "Full Name"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isFr ? "Ex: Jean Dupont" : "e.g. Alex Johnson"}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a1124] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                {isFr ? "Adresse Email ou Gmail" : "Email or Gmail Address"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isFr ? "votre.email@gmail.com" : "your.email@gmail.com"}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a1124] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                {isFr ? "Mot de passe" : "Password"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isFr ? "Au moins 6 caractères" : "At least 6 characters"}
                  className="w-full pl-10 pr-4 py-3 bg-[#0a1124] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            {/* Level selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isFr ? "Niveau Actuel" : "Current Level"}</span>
                </label>
                <select
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a1124] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="A1">A1 - {isFr ? "Débutant" : "Beginner"}</option>
                  <option value="A2">A2 - {isFr ? "Élémentaire" : "Elementary"}</option>
                  <option value="B1">B1 - {isFr ? "Intermédiaire" : "Intermediate"}</option>
                  <option value="B2">B2 - {isFr ? "Intermédiaire Supérieur" : "Upper-Intermediate"}</option>
                  <option value="C1">C1 - {isFr ? "Avancé" : "Advanced"}</option>
                  <option value="C2">C2 - {isFr ? "Bilingue / Maîtrise" : "Fluent / Mastery"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isFr ? "Objectif CEFR" : "Target CEFR"}</span>
                </label>
                <select
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0a1124] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="B1">B1 - {isFr ? "Fluidité basique" : "Basic Fluency"}</option>
                  <option value="B2">B2 - {isFr ? "Conversation fluide" : "Conversational Fluency"}</option>
                  <option value="C1">C1 - {isFr ? "Professionnel & Débats" : "Professional & Debates"}</option>
                  <option value="C2">C2 - {isFr ? "Aisance parfaite" : "Native-like Mastery"}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(74,222,128,0.35)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isFr ? "Créer mon profil gratuitement" : "Create Free Profile"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-6 text-center text-xs text-slate-400">
            {isFr ? "Déjà inscrit ?" : "Already have an account?"}{' '}
            <Link href="/login" className="text-emerald-400 font-bold hover:underline">
              {isFr ? "Se connecter" : "Sign In"}
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
