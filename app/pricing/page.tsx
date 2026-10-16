'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  HelpCircle,
  Flame,
  CheckCircle2,
  ChevronDown,
  X,
  CreditCard,
  Smartphone,
  Globe,
  Tag
} from 'lucide-react';

type Currency = 'USD' | 'EUR' | 'XOF';

const PRICING_DATA = {
  USD: {
    symbol: '$',
    suffix: '',
    free: { monthly: 0, annual: 0 },
    premium: { monthly: 4.99, annual: 3.99 },
    pro: { monthly: 9.99, annual: 7.99 }
  },
  EUR: {
    symbol: '€',
    suffix: '',
    free: { monthly: 0, annual: 0 },
    premium: { monthly: 4.50, annual: 3.60 },
    pro: { monthly: 8.90, annual: 7.10 }
  },
  XOF: {
    symbol: '',
    suffix: ' FCFA',
    free: { monthly: 0, annual: 0 },
    premium: { monthly: 3000, annual: 2400 },
    pro: { monthly: 6000, annual: 4800 }
  }
};

interface FaqItem {
  q: string;
  a: string;
  key: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { user, profile, playSound, refreshProfile } = useAuth();
  const { isFr } = useTranslation();
  const supabase = createClient();

  const [currency, setCurrency] = useState<Currency>('USD');
  const [annualBilling, setAnnualBilling] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Checkout modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<'free' | 'premium' | 'pro'>('premium');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'momo' | 'paypal'>('card');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscountRate, setPromoDiscountRate] = useState<number>(0);
  const [promoError, setPromoError] = useState('');

  // FAQ Accordion open states
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const curData = PRICING_DATA[currency];

  const formatPrice = (amount: number) => {
    if (amount === 0) return `${curData.symbol}0${curData.suffix}`;
    if (currency === 'XOF') {
      return `${Math.round(amount).toLocaleString('fr-FR')}${curData.suffix}`;
    }
    return `${curData.symbol}${amount.toFixed(2)}${curData.suffix}`;
  };

  const getBasePrice = (planKey: 'free' | 'premium' | 'pro') => {
    const plan = curData[planKey];
    return annualBilling ? plan.annual : plan.monthly;
  };

  const getFinalPrice = (planKey: 'free' | 'premium' | 'pro') => {
    const base = getBasePrice(planKey);
    if (promoDiscountRate > 0) {
      return base * (1 - promoDiscountRate);
    }
    return base;
  };

  const handleOpenCheckout = (planKey: 'free' | 'premium' | 'pro') => {
    playSound('click');
    if (!user) {
      router.push('/register');
      return;
    }
    if (planKey === 'free') {
      executeSubscribe('free', 0);
      return;
    }
    setSelectedPlanForModal(planKey);
    setCheckoutModalOpen(true);
    setPromoError('');
  };

  const handleApplyPromo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = promoCodeInput.trim().toUpperCase();
    if (!clean) return;

    if (clean === 'STUDENT50' || clean === 'BOOST50') {
      setAppliedPromo(clean);
      setPromoDiscountRate(0.5);
      setPromoError('');
      playSound('chime');
    } else if (clean === 'WELCOME20') {
      setAppliedPromo(clean);
      setPromoDiscountRate(0.2);
      setPromoError('');
      playSound('chime');
    } else {
      setPromoError(isFr ? "Code promo invalide ou expiré." : "Invalid or expired promo code.");
      playSound('click');
    }
  };

  const executeSubscribe = async (planKey: 'free' | 'premium' | 'pro', finalAmount: number) => {
    setUpgradingPlan(planKey);
    playSound('click');

    try {
      // 1. Create subscription record in Supabase
      await supabase.from('subscriptions').insert({
        user_id: user?.id || '',
        plan: planKey,
        status: 'active',
        billing_cycle: annualBilling ? 'yearly' : 'monthly',
        currency: currency,
        price_paid: finalAmount,
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      });

      // 2. Update user profile plan
      await supabase
        .from('profiles')
        .update({
          plan: planKey,
          plan_status: 'active',
        })
        .eq('id', user?.id || '');

      await refreshProfile();

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#4ade80', '#60a5fa', '#f59e0b'],
        });
      } catch {}

      playSound('success');
      setSuccessMsg(
        isFr 
          ? `Félicitations ! Vous bénéficiez désormais de l'abonnement ${planKey.toUpperCase()}.`
          : `Congratulations! You are now subscribed to ${planKey.toUpperCase()}.`
      );
      setCheckoutModalOpen(false);
    } catch (err) {
      console.error("Subscription update error:", err);
    } finally {
      setUpgradingPlan(null);
    }
  };

  const currentPlan = profile?.plan || 'free';

  const faqs: FaqItem[] = [
    {
      key: 'pricing_faq_q1',
      q: isFr ? "Puis-je annuler ou changer de formule à tout moment ?" : "Can I cancel or change my plan anytime?",
      a: isFr 
        ? "Absolument. Votre abonnement est 100% sans engagement. Vous pouvez résilier ou ajuster votre offre en un seul clic depuis votre profil."
        : "Yes, absolutely. All subscriptions are without contract. You can upgrade, downgrade, or cancel anytime with one click in your account."
    },
    {
      key: 'pricing_faq_q2',
      q: isFr ? "Comment fonctionnent les minutes de conversation en direct ?" : "How do live conversation minutes work?",
      a: isFr 
        ? "Les minutes sont décomptées uniquement lorsque vous êtes connecté avec un interlocuteur lors d'un appel audio/vidéo réel. Les temps d'attente ne sont pas décomptés."
        : "Minutes are only counted while actively connected in real audio/video speaking rooms with an international partner."
    },
    {
      key: 'pricing_faq_q3',
      q: isFr ? "Quels modes de paiement sont acceptés (Mobile Money, Carte, PayPal) ?" : "Which payment methods are accepted?",
      a: isFr 
        ? "Nous acceptons les cartes Visa/Mastercard internationales, ainsi que les paiements Mobile Money (Orange Money, Wave, MTN MoMo) pour toute l'Afrique francophone et anglophone."
        : "We accept Visa, Mastercard, PayPal, and Mobile Money (Orange, Wave, MTN) for direct African and international payments."
    },
    {
      key: 'pricing_faq_q4',
      q: isFr ? "Y a-t-il une garantie satisfait ou remboursé ?" : "Is there a money-back guarantee?",
      a: isFr 
        ? "Oui ! Nous offrons une garantie satisfait ou remboursé intégrale sous 14 jours, sans aucune condition compliquée."
        : "Yes! We provide an unconditional 14-day money-back guarantee if you are not fully satisfied."
    },
    {
      key: 'pricing_faq_q5',
      q: isFr ? "Comment fonctionne l'assistant grammatical IA ?" : "How does the AI grammar assistant work?",
      a: isFr 
        ? "Durant vos discussions, notre IA analyse vos formulations et vous propose des corrections pédagogiques immédiates en 1 clic."
        : "During conversations, our smart engine flags common mistakes and displays clear pedagogical explanations with 1-click fixes."
    },
    {
      key: 'pricing_faq_q6',
      q: isFr ? "Puis-je obtenir un certificat de niveau CEFR ?" : "Can I receive an accredited CEFR certificate?",
      a: isFr 
        ? "Oui, les abonnés Pro Mastery reçoivent une attestation officielle d'aisance orale (CEFR A1 à C2) après validation de leurs sessions vocales."
        : "Yes, Pro Mastery members can receive an official speaking certificate validating their CEFR proficiency from A1 to C2."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      
      {/* Title & Currency Switcher Header */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5" />
          <span>{isFr ? "Tarifs Clairs & Sans Engagement" : "Transparent & Flexible Pricing"}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {isFr ? "Investissez dans votre Aisance Orale" : "Invest in Your Speaking Fluency"}
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          {isFr 
            ? "Commencez gratuitement et passez à une offre supérieure quand vous souhaitez accélérer vos progrès."
            : "Start for free and upgrade whenever you are ready to accelerate your speaking progress."}
        </p>

        {/* Currency Switcher Buttons */}
        <div className="pt-2 flex items-center justify-center gap-2">
          {(['USD', 'EUR', 'XOF'] as Currency[]).map((cur) => (
            <button
              key={cur}
              data-currency={cur}
              onClick={() => {
                setCurrency(cur);
                playSound('click');
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currency === cur
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-extrabold'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
              }`}
            >
              {cur === 'USD' && '🇺🇸 USD ($)'}
              {cur === 'EUR' && '🇪🇺 EUR (€)'}
              {cur === 'XOF' && '🇨🇮 XOF / FCFA'}
            </button>
          ))}
        </div>

        {/* Monthly / Annual Switcher */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${!annualBilling ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            {isFr ? "Mensuel" : "Monthly"}
          </span>
          <button
            onClick={() => {
              setAnnualBilling(!annualBilling);
              playSound('click');
            }}
            className="w-14 h-7 rounded-full bg-slate-200 dark:bg-white/10 p-1 transition-colors relative shadow-inner"
          >
            <div
              className={`w-5 h-5 rounded-full bg-emerald-500 transition-transform ${
                annualBilling ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${annualBilling ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              {isFr ? "Annuel" : "Annual"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
              -20%
            </span>
          </div>
        </div>

      </div>

      {successMsg && (
        <div className="max-w-md mx-auto p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 text-sm text-center font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* THREE PRICING TIERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        
        {/* Tier 1: FREE */}
        <div className="saas-card flex flex-col justify-between border-slate-200 dark:border-white/10 bg-white dark:bg-transparent shadow-sm">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {isFr ? "Découverte" : "Discovery"}
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{isFr ? "Gratuit" : "Free"}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                {isFr 
                  ? "Idéal pour tester vos premières conversations internationales."
                  : "Ideal for testing your first international conversations."}
              </p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white">{formatPrice(0)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/ {isFr ? "mois à vie" : "month forever"}</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isFr ? "15 minutes d'appels live par mois" : "15 minutes of live calls per month"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isFr ? "1 défi vocal quotidien analysé" : "1 daily analyzed voice challenge"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isFr ? "Accès au fil d'actualité communautaire" : "Access to community feed"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isFr ? "Correction grammaticale basique" : "Basic grammar corrections"}</span>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={() => handleOpenCheckout('free')}
              disabled={currentPlan === 'free'}
              className="w-full py-3.5 rounded-xl font-bold text-xs border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all disabled:opacity-40 shadow-sm"
            >
              {currentPlan === 'free' 
                ? (isFr ? 'Plan Actuel' : 'Current Plan') 
                : (isFr ? 'Basculer en Gratuit' : 'Switch to Free')}
            </button>
          </div>
        </div>

        {/* Tier 2: PREMIUM */}
        <div className="saas-card relative flex flex-col justify-between border-emerald-500/40 bg-white dark:bg-gradient-to-b dark:from-[#0a1124] dark:to-[#0e1a38] shadow-lg dark:shadow-[0_0_35px_rgba(74,222,128,0.15)]">
          
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md">
            {isFr ? "Le Plus Populaire" : "Most Popular"}
          </div>

          <div className="space-y-6 pt-2">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                {isFr ? "Progression Rapide" : "Fast Progress"}
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">Premium</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                {isFr 
                  ? "Pour les apprenants engagés qui veulent parler chaque semaine."
                  : "For committed learners who want to speak every week."}
              </p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {formatPrice(getBasePrice('premium'))}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/ {isFr ? "mois" : "month"}</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong>120 minutes</strong> {isFr ? "d'appels live par mois" : "of live calls per month"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isFr ? "Tous les défis vocaux débloqués" : "All voice challenges unlocked"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isFr ? "Assistant grammatical IA illimité en direct" : "Unlimited live AI grammar assistant"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isFr ? "Rapports de progression CEFR hebdomadaires" : "Weekly CEFR progress reports"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isFr ? "Badge apprenant certifié sur le profil" : "Certified learner badge on profile"}</span>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={() => handleOpenCheckout('premium')}
              disabled={upgradingPlan === 'premium' || currentPlan === 'premium'}
              className="w-full py-3.5 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 transition-all shadow-[0_0_20px_rgba(74,222,128,0.3)] disabled:opacity-50"
            >
              {currentPlan === 'premium' 
                ? (isFr ? 'Plan Actuel ✓' : 'Current Plan ✓') 
                : (isFr ? 'Choisir Premium' : 'Get Premium')}
            </button>
          </div>
        </div>

        {/* Tier 3: PRO */}
        <div className="saas-card flex flex-col justify-between border-blue-400/30 bg-white dark:bg-transparent shadow-sm">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {isFr ? "Excellence & Carrière" : "Excellence & Career"}
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">Pro Mastery</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                {isFr 
                  ? "Idéal pour préparer des entretiens et réunions internationales."
                  : "Ideal for preparing interviews and international meetings."}
              </p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {formatPrice(getBasePrice('pro'))}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/ {isFr ? "mois" : "month"}</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span><strong>{isFr ? "Appels live ILLIMITÉS" : "UNLIMITED live calls"}</strong> 24h/24</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{isFr ? "Simulations d'entretiens et réunions d'affaires" : "Interview & business meeting simulations"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{isFr ? "Salons de conversation internationaux prioritaires" : "Priority international conversation rooms"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{isFr ? "Attestation de maîtrise et certificat CEFR" : "Speaking certificate & CEFR credential"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{isFr ? "Accès prioritaire aux locuteurs natifs C2" : "Priority access to C2 native speakers"}</span>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={() => handleOpenCheckout('pro')}
              disabled={upgradingPlan === 'pro' || currentPlan === 'pro'}
              className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white transition-all shadow-md disabled:opacity-50"
            >
              {currentPlan === 'pro' 
                ? (isFr ? 'Plan Actuel ✓' : 'Current Plan ✓') 
                : (isFr ? 'Passer à Pro Mastery' : 'Get Pro Mastery')}
            </button>
          </div>
        </div>

      </div>

      {/* COMPARISON FEATURE MATRIX TABLE */}
      <div className="saas-card p-6 sm:p-8 bg-white dark:bg-[#0a1124] border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white text-center">
          {isFr ? "Tableau Comparatif Détaillé des Offres" : "Detailed Feature Comparison"}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-bold">{isFr ? "Fonctionnalités" : "Features"}</th>
                <th className="py-3 px-4 font-bold text-center">Free</th>
                <th className="py-3 px-4 font-bold text-center text-emerald-400">Premium</th>
                <th className="py-3 px-4 font-bold text-center text-blue-400">Pro Mastery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              <tr data-i18n="pricing_row_calls">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Minutes d'appels live" : "Live calls duration"}</td>
                <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">15 min/mois</td>
                <td className="py-3 px-4 text-center font-bold text-emerald-400">120 min/mois</td>
                <td className="py-3 px-4 text-center font-bold text-blue-400">Illimité</td>
              </tr>
              <tr data-i18n="pricing_row_matching">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Matching partenaires internationaux" : "International partner matching"}</td>
                <td className="py-3 px-4 text-center text-emerald-500">✓</td>
                <td className="py-3 px-4 text-center text-emerald-500">✓ Prioritaire</td>
                <td className="py-3 px-4 text-center text-blue-400">✓ VIP 24/7</td>
              </tr>
              <tr data-i18n="pricing_row_messaging">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Messagerie & notes vocales" : "Chat & voice notes"}</td>
                <td className="py-3 px-4 text-center text-emerald-500">✓</td>
                <td className="py-3 px-4 text-center text-emerald-500">✓</td>
                <td className="py-3 px-4 text-center text-blue-400">✓</td>
              </tr>
              <tr data-i18n="pricing_row_ai_coach">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Assistant grammatical IA en direct" : "Live AI Grammar Assistant"}</td>
                <td className="py-3 px-4 text-center text-slate-400">Basique</td>
                <td className="py-3 px-4 text-center font-bold text-emerald-400">Illimité</td>
                <td className="py-3 px-4 text-center font-bold text-blue-400">Illimité Avancé</td>
              </tr>
              <tr data-i18n="pricing_row_interview">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Simulations d'entretiens d'embauche" : "Job interview simulations"}</td>
                <td className="py-3 px-4 text-center text-slate-500">—</td>
                <td className="py-3 px-4 text-center text-slate-500">—</td>
                <td className="py-3 px-4 text-center text-blue-400 font-bold">✓ Inclus</td>
              </tr>
              <tr data-i18n="pricing_row_business">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Anglais d'affaires & réunions" : "Business English & meetings"}</td>
                <td className="py-3 px-4 text-center text-slate-500">—</td>
                <td className="py-3 px-4 text-center text-emerald-400">✓</td>
                <td className="py-3 px-4 text-center text-blue-400 font-bold">✓ Exclusif</td>
              </tr>
              <tr data-i18n="pricing_row_exam">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Préparation TOEFL / IELTS / TOEIC" : "TOEFL / IELTS preparation"}</td>
                <td className="py-3 px-4 text-center text-slate-500">—</td>
                <td className="py-3 px-4 text-center text-slate-500">—</td>
                <td className="py-3 px-4 text-center text-blue-400 font-bold">✓</td>
              </tr>
              <tr data-i18n="pricing_row_cefr">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Attestation de niveau CEFR" : "CEFR certificate"}</td>
                <td className="py-3 px-4 text-center text-slate-500">—</td>
                <td className="py-3 px-4 text-center text-slate-500">—</td>
                <td className="py-3 px-4 text-center text-blue-400 font-bold">✓ Certifié</td>
              </tr>
              <tr data-i18n="pricing_row_challenges">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Défis vocaux quotidiens" : "Daily speaking challenges"}</td>
                <td className="py-3 px-4 text-center text-slate-400">1 par jour</td>
                <td className="py-3 px-4 text-center text-emerald-400">Illimité</td>
                <td className="py-3 px-4 text-center text-blue-400">Illimité</td>
              </tr>
              <tr data-i18n="pricing_row_videos">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Shorts vidéo d'immersion" : "Immersion video shorts"}</td>
                <td className="py-3 px-4 text-center text-emerald-500">✓</td>
                <td className="py-3 px-4 text-center text-emerald-500">✓</td>
                <td className="py-3 px-4 text-center text-blue-400">✓</td>
              </tr>
              <tr data-i18n="pricing_row_support">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Support client prioritaire" : "Priority customer support"}</td>
                <td className="py-3 px-4 text-center text-slate-400">Email</td>
                <td className="py-3 px-4 text-center text-emerald-400">WhatsApp direct</td>
                <td className="py-3 px-4 text-center text-blue-400 font-bold">Ligne directe CEO</td>
              </tr>
              <tr data-i18n="pricing_row_guarantee">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{isFr ? "Garantie remboursement" : "Money-back guarantee"}</td>
                <td className="py-3 px-4 text-center text-slate-500">—</td>
                <td className="py-3 px-4 text-center text-emerald-400">14 jours</td>
                <td className="py-3 px-4 text-center text-blue-400">14 jours</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TRUST & GUARANTEES STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div data-i18n="pricing_trust_guarantee_title" className="saas-card p-4 text-center space-y-1">
          <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{isFr ? "Garantie 14 Jours" : "14-Day Guarantee"}</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{isFr ? "Remboursement intégral sans poser de question." : "Full refund with zero questions asked."}</p>
        </div>
        <div data-i18n="pricing_trust_nocontract_title" className="saas-card p-4 text-center space-y-1">
          <Zap className="w-6 h-6 text-amber-500 mx-auto mb-1" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{isFr ? "Sans Engagement" : "No Contract"}</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{isFr ? "Résiliation libre en 1 clic à tout moment." : "Cancel anytime with just 1 click."}</p>
        </div>
        <div data-i18n="pricing_trust_secure_title" className="saas-card p-4 text-center space-y-1">
          <CreditCard className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{isFr ? "Paiement Sécurisé SSL" : "SSL Secure Payment"}</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{isFr ? "Cartes bancaires & Mobile Money cryptés." : "Encrypted credit card & mobile money."}</p>
        </div>
        <div data-i18n="pricing_trust_students_title" className="saas-card p-4 text-center space-y-1">
          <Sparkles className="w-6 h-6 text-rose-500 mx-auto mb-1" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{isFr ? "Tarif Étudiant (-50%)" : "Student Discount (-50%)"}</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{isFr ? "Utilisez le code STUDENT50 à la commande." : "Use code STUDENT50 at checkout."}</p>
        </div>
      </div>

      {/* FAQ ACCORDION */}
      <div className="max-w-3xl mx-auto space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center">
          {isFr ? "Questions Fréquentes sur les Abonnements" : "Frequently Asked Questions"}
        </h3>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={faq.key}
                data-i18n={faq.key}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] overflow-hidden transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => {
                    setExpandedFaq(isOpen ? null : idx);
                    playSound('click');
                  }}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 font-bold text-sm text-slate-900 dark:text-white hover:text-emerald-500 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {checkoutModalOpen && (
        <div id="checkout-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/15 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                {isFr ? "Finaliser votre abonnement" : "Complete your subscription"}
              </span>
              <h3 id="modal-plan-name" className="text-2xl font-black text-slate-900 dark:text-white capitalize mt-1">
                Plan {selectedPlanForModal.toUpperCase()}
              </h3>
            </div>

            {/* Price Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{isFr ? "Tarif de base" : "Base price"} ({annualBilling ? (isFr ? 'Annuel' : 'Annual') : (isFr ? 'Mensuel' : 'Monthly')})</span>
                <span>{formatPrice(getBasePrice(selectedPlanForModal))}</span>
              </div>
              {appliedPromo && (
                <div className="flex items-center justify-between text-xs text-emerald-500 font-bold">
                  <span>Code Promo ({appliedPromo}) -{promoDiscountRate * 100}%</span>
                  <span>-{formatPrice(getBasePrice(selectedPlanForModal) * promoDiscountRate)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between font-black text-base text-slate-900 dark:text-white">
                <span>{isFr ? "Montant total" : "Total price"}</span>
                <span id="modal-total-price" className="text-emerald-500 text-xl">
                  {formatPrice(getFinalPrice(selectedPlanForModal))}
                </span>
              </div>
            </div>

            {/* Promo Code Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isFr ? "Avez-vous un code promo ou étudiant ?" : "Have a promo or student code?"}</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="promo-input"
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="ex: STUDENT50"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  id="apply-promo-btn"
                  type="button"
                  onClick={() => handleApplyPromo()}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-bold text-slate-800 dark:text-white transition-all cursor-pointer"
                >
                  {isFr ? "Appliquer" : "Apply"}
                </button>
              </div>
              {promoError && <p className="text-xs text-rose-400 mt-1">{promoError}</p>}
              {appliedPromo && (
                <p className="text-xs text-emerald-400 font-bold mt-1">
                  ✓ {isFr ? "Code appliqué avec succès !" : "Promo code applied!"}
                </p>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isFr ? "Moyen de paiement sécurisé" : "Payment method"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  id="pricing_modal_method_card"
                  onClick={() => {
                    setSelectedPaymentMethod('card');
                    playSound('click');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedPaymentMethod === 'card'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-[11px] block">{isFr ? "Carte Bancaire" : "Credit Card"}</span>
                </button>

                <button
                  type="button"
                  id="pricing_modal_method_momo"
                  onClick={() => {
                    setSelectedPaymentMethod('momo');
                    playSound('click');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedPaymentMethod === 'momo'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-[11px] block">Mobile Money</span>
                </button>

                <button
                  type="button"
                  id="pricing_modal_method_paypal"
                  onClick={() => {
                    setSelectedPaymentMethod('paypal');
                    playSound('click');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedPaymentMethod === 'paypal'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Globe className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-[11px] block">PayPal</span>
                </button>
              </div>
            </div>

            {/* Confirm Subscribe Button */}
            <button
              id="confirm-subscribe-btn"
              type="button"
              onClick={() => executeSubscribe(selectedPlanForModal, getFinalPrice(selectedPlanForModal))}
              disabled={upgradingPlan !== null}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(74,222,128,0.4)] hover:opacity-95 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {upgradingPlan !== null
                ? (isFr ? 'Activation en cours...' : 'Activating...')
                : `${isFr ? 'Confirmer & Activer mon abonnement' : 'Confirm & Subscribe'} (${formatPrice(getFinalPrice(selectedPlanForModal))})`}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
