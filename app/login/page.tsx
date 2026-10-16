'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { 
  Mail, 
  Lock, 
  LogIn, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  ExternalLink,
  Wand2,
  HelpCircle,
  Zap
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { playSound, refreshProfile, signInBypass } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  // Mode: 'password' | 'magiclink'
  const [loginMode, setLoginMode] = useState<'password' | 'magiclink'>('password');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);
  const [googleErrorDetail, setGoogleErrorDetail] = useState('');

  // Bypass / Demo Google Mode
  const [bypassLoading, setBypassLoading] = useState(false);
  const [bypassEmail, setBypassEmail] = useState('tychiquebongo@gmail.com');
  const [showCustomBypass, setShowCustomBypass] = useState(false);

  // Unconfirmed email state
  const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Magic Link OTP state
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  // Detect email confirmation from URL query params or hash fragments
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const confirmed = params.get('confirmed');
    const error = params.get('error');
    const emailParam = params.get('email');
    const forgotParam = params.get('forgot');

    if (emailParam) {
      setEmail(emailParam);
    }
    if (forgotParam === 'true') {
      setShowForgotPassword(true);
      if (emailParam) {
        setForgotEmail(emailParam);
      }
    }

    if (confirmed === 'true') {
      setSuccessMsg(isFr 
        ? "Votre adresse email a été confirmée avec succès ! Vous pouvez maintenant vous connecter." 
        : "Your email address has been confirmed successfully! You can now sign in.");
      playSound('chime');
    } else if (error) {
      const decoded = decodeURIComponent(error);
      if (decoded === 'auth_callback_failed') {
        setErrorMsg(isFr 
          ? "Le lien d'activation a expiré ou a déjà été utilisé. Vous pouvez vous reconnecter ci-dessous." 
          : "The activation link has expired or has already been used. You can sign in below.");
      } else if (decoded.toLowerCase().includes('provider') || decoded.toLowerCase().includes('not enabled')) {
        setShowGoogleGuide(true);
        setGoogleErrorDetail(decoded);
      } else {
        setErrorMsg(decoded);
      }
    }

    // Check if an active session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        playSound('success');
        refreshProfile().then(() => {
          router.replace('/dashboard');
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        playSound('success');
        await refreshProfile();
        router.replace('/dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isFr, playSound, refreshProfile, router, supabase]);

  // Bypass / Demo immediate Google login
  const handleBypassGoogleLogin = async (targetEmail?: string) => {
    setBypassLoading(true);
    setErrorMsg('');
    playSound('click');
    try {
      const emailToUse = targetEmail || bypassEmail || 'tychiquebongo@gmail.com';
      await signInBypass(emailToUse);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bypass login error';
      setErrorMsg(msg);
      setBypassLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    setShowGoogleGuide(false);
    playSound('click');

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('unsupported provider') || msg.includes('not enabled') || msg.includes('provider_disabled')) {
          setShowGoogleGuide(true);
          setGoogleErrorDetail(error.message);
        } else {
          setErrorMsg(error.message);
        }
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        // Pre-validate that Supabase Google provider is enabled before redirecting the browser
        try {
          const testRes = await fetch(data.url, { method: 'GET' });
          if (testRes.status === 400) {
            const body = await testRes.text();
            if (body.includes('not enabled') || body.includes('provider') || body.includes('validation_failed')) {
              setShowGoogleGuide(true);
              setGoogleErrorDetail(isFr ? "Le fournisseur Google n'est pas encore activé dans votre console Supabase." : "Google OAuth provider is not yet enabled in your Supabase project.");
              setGoogleLoading(false);
              return;
            }
          }
        } catch {
          // If CORS restricts direct preflight, proceed safely with navigation
        }

        // Redirect browser to Google authentication URL
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google OAuth error';
      setErrorMsg(message);
      setGoogleLoading(false);
    }
  };

  // Standard Email + Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg(isFr ? 'Veuillez renseigner votre email et mot de passe.' : 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setIsEmailUnconfirmed(false);
    setResendNotice(null);
    playSound('click');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const errorLower = error.message.toLowerCase();

        if (errorLower.includes('email not confirmed') || errorLower.includes('not confirmed')) {
          setIsEmailUnconfirmed(true);
          setUnconfirmedEmail(cleanEmail);
          setErrorMsg(isFr 
            ? "Votre adresse email n'a pas encore été confirmée. Veuillez cliquer sur le lien d'activation reçu dans votre boîte Gmail." 
            : "Your email address has not been confirmed yet. Please click the activation link in your Gmail inbox.");
        } else if (error.message === 'Invalid login credentials' || errorLower.includes('invalid login credentials')) {
          setUnconfirmedEmail(cleanEmail);
          setErrorMsg(isFr 
            ? "Email ou mot de passe incorrect. Vous pouvez réinitialiser votre mot de passe ou vous connecter via le Lien Magique Gmail sans mot de passe !" 
            : "Incorrect email or password. You can reset your password or sign in with the instant Gmail Magic Link!");
        } else {
          setErrorMsg(error.message);
        }

        setLoading(false);
        return;
      }

      if (data.session) {
        playSound('success');
        await refreshProfile();

        const userEmail = data.session.user.email?.toLowerCase();
        const { data: p } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        const isAdmin = p?.role === 'admin' || userEmail === 'tychiquebongo@gmail.com' || userEmail === 'tychiquebong@gmail.com';

        if (isAdmin) {
          setSuccessMsg(isFr ? 'Connexion réussie ! Redirection vers le Back Office Administrateur...' : 'Login successful! Redirecting to Admin Back Office...');
          setTimeout(() => {
            window.location.href = '/admin';
          }, 300);
        } else {
          setSuccessMsg(isFr ? 'Connexion réussie ! Redirection vers votre tableau de bord...' : 'Login successful! Redirecting to your dashboard...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 300);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isFr ? 'Une erreur inattendue est survenue.' : 'An unexpected error occurred.');
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // Magic Link OTP for instant Gmail login without password
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg(isFr ? 'Veuillez saisir votre adresse Gmail.' : 'Please enter your Gmail address.');
      return;
    }

    setMagicLinkLoading(true);
    setErrorMsg('');
    setMagicLinkSent(false);
    playSound('click');

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        playSound('chime');
        setMagicLinkSent(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isFr ? 'Impossible d\'envoyer le lien.' : 'Unable to send link.');
      setErrorMsg(message);
    } finally {
      setMagicLinkLoading(false);
    }
  };

  // Resend email confirmation
  const handleResendConfirmation = async (targetEmail: string) => {
    if (!targetEmail) return;
    setResendingEmail(true);
    setResendNotice(null);
    playSound('click');

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setResendNotice(`${isFr ? 'Erreur' : 'Error'} : ${error.message}`);
      } else {
        playSound('chime');
        setResendNotice(isFr 
          ? `Un nouvel email de confirmation a été envoyé à ${targetEmail}. Pensez à vérifier vos spams !` 
          : `A new confirmation email was sent to ${targetEmail}. Check your spam/junk folder as well!`);
      }
    } catch {
      setResendNotice(isFr ? "Impossible d'envoyer l'email pour le moment." : "Unable to send the email right now.");
    } finally {
      setResendingEmail(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanForgotEmail = forgotEmail.trim().toLowerCase();
    if (!cleanForgotEmail) {
      setForgotMsg(isFr ? 'Veuillez entrer votre adresse email.' : 'Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    setForgotMsg('');
    playSound('click');

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.resetPasswordForEmail(cleanForgotEmail, {
        redirectTo: `${origin}/auth/callback?next=/profile`,
      });

      if (error) {
        setForgotMsg(`${isFr ? 'Erreur' : 'Error'} : ${error.message}`);
      } else {
        playSound('chime');
        setForgotMsg(isFr 
          ? `Si un compte existe avec l'adresse ${cleanForgotEmail}, un email de réinitialisation a été envoyé sur votre messagerie Gmail. Vérifiez aussi vos spams.`
          : `If an account exists with ${cleanForgotEmail}, a password reset email was sent. Please also check your spam folder.`);
      }
    } catch {
      setForgotMsg(isFr ? "Impossible d'envoyer l'email pour le moment." : "Unable to send the email right now.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {isFr ? "Réinitialiser le mot de passe" : "Reset Password"}
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {isFr ? "Entrez votre email Gmail pour recevoir un lien de réinitialisation." : "Enter your Gmail address to receive a password reset link."}
            </p>
          </div>

          <div className="saas-card bg-[#080d1a] border-white/10 shadow-xl">
            {forgotMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{forgotMsg}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  {isFr ? "Adresse Email" : "Email Address"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder={isFr ? "votre.email@gmail.com" : "your.email@gmail.com"}
                    className="w-full pl-10 pr-4 py-3 bg-[#0a1124] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {forgotLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{isFr ? "Envoyer le lien de réinitialisation" : "Send Reset Link"}</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotMsg('');
                  playSound('click');
                }}
                className="text-xs text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>{isFr ? "Retour à la connexion" : "Back to sign in"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFr ? "Accès Espace Apprenant" : "Learner Portal Access"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isFr ? "Bon retour parmi nous" : "Welcome back"}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isFr 
              ? "Connectez-vous à votre compte pour reprendre vos conversations." 
              : "Sign in to your account to continue your English conversations."}
          </p>
        </div>

        {/* Card */}
        <div className="saas-card bg-[#080d1a] border border-white/10 shadow-xl">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setErrorMsg('');
                playSound('click');
              }}
              className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'password'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isFr ? "Mot de passe" : "Password"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('magiclink');
                setErrorMsg('');
                playSound('click');
              }}
              className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'magiclink'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isFr ? "Lien Magique Gmail" : "Gmail Magic Link"}</span>
            </button>
          </div>

          {/* Detailed Unconfirmed Email Banner */}
          {isEmailUnconfirmed && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isFr ? "Adresse email non confirmée" : "Unconfirmed email address"}</span>
              </div>
              <p className="leading-relaxed">
                {isFr 
                  ? "Un email d'activation a été envoyé. Veuillez cliquer sur le lien reçu dans votre messagerie (vérifiez aussi le dossier Spams / Courriers indésirables)."
                  : "An activation email was sent. Please click the link in your inbox (also check your Spam folder)."}
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleResendConfirmation(unconfirmedEmail)}
                  disabled={resendingEmail}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${resendingEmail ? 'animate-spin' : ''}`} />
                  <span>
                    {resendingEmail 
                      ? (isFr ? 'Envoi...' : 'Sending...') 
                      : (isFr ? "Renvoyer l'email d'activation" : "Resend activation email")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('magiclink');
                    setEmail(unconfirmedEmail);
                    setIsEmailUnconfirmed(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3 text-emerald-400" />
                  <span>{isFr ? "Connexion directe par Lien Magique" : "Direct sign-in via Magic Link"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard Error Notice */}
          {!isEmailUnconfirmed && errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-2.5 text-rose-300 text-xs leading-relaxed animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {loginMode === 'password' && email && (
                <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotPassword(true);
                      playSound('click');
                    }}
                    className="text-amber-300 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    {isFr ? "Mot de passe oublié ?" : "Forgot password?"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('magiclink');
                      setErrorMsg('');
                    }}
                    className="text-emerald-400 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>{isFr ? "Se connecter sans mot de passe" : "Sign in without password"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resend Notice Feedback */}
          {resendNotice && (
            <div className="mb-6 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{resendNotice}</span>
            </div>
          )}

          {/* Magic Link Sent Banner */}
          {magicLinkSent && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isFr ? "Lien magique envoyé avec succès !" : "Magic link sent successfully!"}</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                {isFr 
                  ? `Consultez votre boîte Gmail (${email}). Cliquez sur le lien pour vous connecter instantanément en 1 clic sans mot de passe.`
                  : `Check your Gmail inbox (${email}). Click the link to log in instantly without password.`}
              </p>
              <div className="pt-1 text-[11px] text-slate-400">
                {isFr ? "Pensez à vérifier vos dossiers 'Spams' ou 'Courriers indésirables' si l'email tarde à apparaître." : "Check your spam or junk folder if the email doesn't appear promptly."}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode 1: Password Form */}
          {loginMode === 'password' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
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
                    placeholder={isFr ? "votre.email@gmail.com" : "name@gmail.com"}
                    className="w-full pl-10 pr-4 py-3 bg-[#0a1124] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {isFr ? "Mot de passe" : "Password"}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotEmail(email);
                      playSound('click');
                    }}
                    className="text-xs text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isFr ? "Oublié ?" : "Forgot?"}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-[#0a1124] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isFr ? "Se connecter" : "Sign In"}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mode 2: Magic Link Form */}
          {loginMode === 'magiclink' && (
            <form onSubmit={handleMagicLink} className="space-y-5">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isFr 
                    ? "Saisissez votre adresse Gmail. Nous vous envoyons un lien sécurisé : cliquez dessus et vous êtes connecté directement, sans aucun mot de passe."
                    : "Enter your Gmail. We will send you a secure 1-click link to log in directly without typing any password."}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  {isFr ? "Adresse Gmail ou Email" : "Gmail or Email Address"}
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

              <button
                type="submit"
                disabled={magicLinkLoading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {magicLinkLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{isFr ? "M'envoyer le lien magique Gmail" : "Send me the Gmail Magic Link"}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Link to Register */}
          <div className="mt-6 text-center text-xs text-slate-400">
            {isFr ? "Vous n'avez pas encore de compte ?" : "Don't have an account yet?"}{' '}
            <Link href="/register" className="text-emerald-400 font-bold hover:underline">
              {isFr ? "Inscrivez-vous gratuitement" : "Sign up for free"}
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
