import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getInitialsAvatar } from '@/lib/avatarHelper';
import type { EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Forwarded host resolution for production / proxies / local dev
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const baseUrl = isLocalEnv || !forwardedHost ? origin : `https://${forwardedHost}`;

  // Handle explicit errors passed by Supabase (e.g. otp_expired, access_denied, provider_disabled)
  if (errorParam) {
    const errorMsg = errorDescription || errorParam;
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(errorMsg)}`);
  }

  const supabase = createClient();

  // Helper to ensure or sync profile for the user
  const ensureProfile = async (userId: string, email?: string, meta?: Record<string, unknown>) => {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, email')
        .eq('id', userId)
        .single();

      const fullName = (meta?.full_name as string) || (meta?.name as string) || (email ? email.split('@')[0] : 'English Learner');
      const avatarUrl = (meta?.avatar_url as string) || (meta?.picture as string) || getInitialsAvatar(fullName);
      const isFounder = email === 'tychiquebongo@gmail.com' || email === 'tychiquebong@gmail.com';

      if (!existing) {
        await supabase.from('profiles').insert({
          id: userId,
          email: email || null,
          full_name: isFounder ? 'Tychique Bongo' : fullName,
          country: isFounder ? "Côte d'Ivoire" : ((meta?.country as string) || 'France'),
          flag: isFounder ? '🇨🇮' : ((meta?.flag as string) || '🇫🇷'),
          current_level: isFounder ? 'C2' : ((meta?.current_level as string) || 'B1'),
          target_level: isFounder ? 'C2' : ((meta?.target_level as string) || 'C1'),
          avatar_url: isFounder ? '/assets/images/tychique-bongo.jpg' : avatarUrl,
          role: isFounder ? 'admin' : 'student',
          plan: isFounder ? 'admin' : 'free',
          plan_status: 'active',
          is_online: true,
          xp: 0,
          streak: 1,
          minutes_spoken: 0,
        });
      } else {
        // Synchronize email and avatar if missing or legacy
        const updates: Record<string, any> = {};
        if (email && (!existing.email || existing.email !== email)) {
          updates.email = email;
        }
        if (isFounder && existing.role !== 'admin') {
          updates.role = 'admin';
        }
        if ((!existing.avatar_url || existing.avatar_url.includes('alex.jpg')) && avatarUrl) {
          updates.avatar_url = avatarUrl;
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', userId);
        }
      }
    } catch (err) {
      console.error('Error ensuring profile in auth callback:', err);
    }
  };

  // 1. PKCE Code Exchange (Google OAuth, Gmail confirmation, etc.)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      await ensureProfile(data.user.id, data.user.email, data.user.user_metadata);
      const redirectUrl = new URL(next, baseUrl);
      redirectUrl.searchParams.set('confirmed', 'true');
      return NextResponse.redirect(redirectUrl.toString());
    } else if (error) {
      console.error('PKCE exchange error:', error.message);
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  // 2. Token Hash Verification (OTP / Magic Link / Email Confirmation)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data?.user) {
      await ensureProfile(data.user.id, data.user.email, data.user.user_metadata);
      const redirectUrl = new URL(next, baseUrl);
      redirectUrl.searchParams.set('confirmed', 'true');
      return NextResponse.redirect(redirectUrl.toString());
    } else if (error) {
      console.error('VerifyOtp error:', error.message);
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  // 3. Fallback for client-side hash fragments (#access_token=...)
  const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connexion English Booster...</title>
  <script>
    if (typeof window !== 'undefined' && window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token'))) {
      window.location.replace('${origin}${next}' + window.location.hash);
    } else {
      window.location.replace('${origin}/login?error=auth_callback_failed');
    }
  </script>
</head>
<body style="background:#080d1a;color:#94a3b8;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <div style="width:36px;height:36px;border:3px solid #10b981;border-top-color:transparent;border-radius:50%;margin:0 auto 16px;animation:spin 1s linear infinite;"></div>
    <p style="font-weight:600;font-size:14px;color:#f8fafc;">Connexion sécurisée en cours...</p>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  </div>
</body>
</html>`;

  return new NextResponse(fallbackHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
