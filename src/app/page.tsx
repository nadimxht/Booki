"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  ShoppingCart,
  MessageSquare,
  Check,
  Plus,
  X,
  Menu,
  Sparkles,
  TrendingUp,
  Scissors,
  CheckCircle2,
  Monitor,
  Tablet,
  Smartphone,
  Ticket,
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
} from "lucide-react";

const PHOTOS = {
  salon:
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
  barber:
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1200",
  spa: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
  shampoo:
    "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80",
  serum:
    "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80",
};

type PreviewTab = "planning" | "pos" | "finance" | "whatsapp";

const DESKTOP_TAB_DATA: Record<
  PreviewTab,
  {
    title: string;
    subtitle: string;
    cta: string;
    kpis: { label: string; value: string; sub: string; tone: string }[];
    rows: { col1: string; col2: string; col3: string; col4: string; badge: string }[];
    highlightLabel: string;
    highlightValue: string;
    highlightSub: string;
    progress: number;
  }
> = {
  planning: {
    title: "Agenda & Réservations",
    subtitle: "Timeline multi-praticiens synchronisée • Tunis",
    cta: "Nouveau Walk-in",
    kpis: [
      { label: "Aujourd'hui", value: "22 RDV", sub: "Asma & Maha", tone: "text-blue-600 bg-blue-50" },
      { label: "Confirmés", value: "96% Remplis", sub: "Zéro oubli", tone: "text-emerald-600 bg-emerald-50" },
      { label: "CA Prévu", value: "820 TND", sub: "Prestations", tone: "text-amber-600 bg-amber-50" },
      { label: "Consommables", value: "Marge +78%", sub: "Coût déduit", tone: "text-indigo-600 bg-indigo-50" },
    ],
    rows: [
      { col1: "Azza Slimene", col2: "Brushing & Soin", col3: "Maha", col4: "60 TND", badge: "Terminé" },
      { col1: "Sami Trabelsi", col2: "Coupe & Coiffage", col3: "Asma", col4: "45 TND", badge: "Terminé" },
      { col1: "Mehdi Gharbi", col2: "Soin Kératine", col3: "Maha", col4: "120 TND", badge: "En cours" },
    ],
    highlightLabel: "Taux d'occupation",
    highlightValue: "88%",
    highlightSub: "Créneaux remplis automatiquement",
    progress: 88,
  },
  pos: {
    title: "Boutique Click & Collect & POS",
    subtitle: "Ventes comptoir & retraits en salon",
    cta: "Vente Comptoir",
    kpis: [
      { label: "Commandes Web", value: "14 Retraits", sub: "Codes BK-*", tone: "text-amber-600 bg-amber-50" },
      { label: "Encaissé", value: "940 TND", sub: "Espèces & Carte", tone: "text-emerald-600 bg-emerald-50" },
      { label: "Panier Moyen", value: "67 TND", sub: "+14% ce mois", tone: "text-blue-600 bg-blue-50" },
      { label: "Alertes Stock", value: "2 Produits", sub: "Seuil ≤ 3", tone: "text-rose-600 bg-rose-50" },
    ],
    rows: [
      { col1: "BK-8F2A9C", col2: "Premium Keratin Kit", col3: "Click & Collect", col4: "80 TND", badge: "Prêt" },
      { col1: "POS-41D9E2", col2: "Sérum Éclat + Cire", col3: "Client Comptoir", col4: "72 TND", badge: "Payé" },
      { col1: "BK-19C4B0", col2: "Huile Barbe Bio", col3: "Carte", col4: "45 TND", badge: "Payé" },
    ],
    highlightLabel: "Marge Boutique",
    highlightValue: "+46%",
    highlightSub: "Factures PDF & stock en direct",
    progress: 76,
  },
  finance: {
    title: "Dépenses & Rentabilité Nette",
    subtitle: "Point mort, charges fixes & salaires",
    cta: "Export CSV",
    kpis: [
      { label: "Recettes Mois", value: "2,759 TND", sub: "RDV + Store", tone: "text-emerald-600 bg-emerald-50" },
      { label: "Charges", value: "-1,500 TND", sub: "Salaires & Achats", tone: "text-rose-600 bg-rose-50" },
      { label: "Salaires", value: "Payés", sub: "Équipe réglée", tone: "text-indigo-600 bg-indigo-50" },
      { label: "Point Mort", value: "100%", sub: "Couvert", tone: "text-blue-600 bg-blue-50" },
    ],
    rows: [
      { col1: "Salaires & Prime", col2: "Paie mensuelle", col3: "01/11/2026", col4: "-1,500 TND", badge: "Payé" },
      { col1: "Achats Produits", col2: "Inventaire auto", col3: "12/11/2026", col4: "-730 TND", badge: "Stock" },
      { col1: "Recettes Salon", col2: "Prestations + Store", col3: "19/11/2026", col4: "+2,759 TND", badge: "Net" },
    ],
    highlightLabel: "Seuil de rentabilité",
    highlightValue: "100%",
    highlightSub: "Toutes vos charges sont couvertes",
    progress: 100,
  },
  whatsapp: {
    title: "Rappels WhatsApp & Codes Promo",
    subtitle: "Relances 1-clic & campagnes ciblées",
    cta: "Nouveau Code",
    kpis: [
      { label: "À relancer", value: "18 Clients", sub: "RDV de demain", tone: "text-emerald-600 bg-emerald-50" },
      { label: "No-Shows", value: "-85%", sub: "Absences évitées", tone: "text-blue-600 bg-blue-50" },
      { label: "Codes Actifs", value: "3 Promos", sub: "VIP20, WEEKEND", tone: "text-amber-600 bg-amber-50" },
      { label: "Relancés", value: "16 / 18", sub: "Via wa.me", tone: "text-indigo-600 bg-indigo-50" },
    ],
    rows: [
      { col1: "Nadia Gharbi", col2: "Brushing & Soin", col3: "Demain 10:00", col4: "+216 22...", badge: "Relancé" },
      { col1: "Yassine Mejri", col2: "Coupe Dégradé", col3: "Demain 11:30", col4: "+216 98...", badge: "Relancé" },
      { col1: "Meriem Khelil", col2: "Manucure Gel", col3: "Demain 14:00", col4: "+216 55...", badge: "À envoyer" },
    ],
    highlightLabel: "Taux de présence",
    highlightValue: "96%",
    highlightSub: "Rappels WhatsApp + E-mail 24h avant",
    progress: 96,
  },
};

function CroppedPhone({
  src,
  posX,
  alt,
  scale = 1.04,
  className = "",
}: {
  src: string;
  posX: string;
  alt: string;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[9/18.2] rounded-[34px] overflow-hidden bg-white shadow-[0_25px_55px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/10 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        style={{
          objectPosition: `${posX} 50%`,
          transform: `scale(${scale})`,
        }}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function BookiLandingPage() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("planning");
  const [mobileDevice, setMobileDevice] = useState<"desktop" | "tablet" | "phone">("desktop");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentPreview = DESKTOP_TAB_DATA[activeTab];

  const faqs = [
    {
      question: "Combien de temps faut-il pour lancer mon salon sur Booki ?",
      answer:
        "Moins de 5 minutes. Créez votre compte, ajoutez vos prestations, votre équipe et publiez immédiatement votre lien personnalisé sur Instagram, Facebook et Google Maps.",
    },
    {
      question: "Prenez-vous une commission sur les réservations de mes clients ?",
      answer:
        "Jamais. 0% de commission. Vous gardez 100% du montant de vos prestations et de vos ventes boutique — vous ne payez qu'un abonnement mensuel ou annuel fixe en TND.",
    },
    {
      question: "Et si la connexion Wi-Fi du salon coupe pendant que je travaille ?",
      answer:
        "Booki intègre un mode résilient hors ligne : vos formulaires ouverts ne se réinitialisent pas et une alerte discrète vous prévient dès que le réseau revient, sans perdre vos saisies.",
    },
    {
      question: "Mes clients doivent-ils télécharger une application pour réserver ?",
      answer:
        "Non ! Votre portail de réservation et votre boutique s'ouvrent instantanément dans le navigateur de n'importe quel smartphone, avec ajout du rendez-vous dans leur agenda en 1 clic.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white overflow-x-hidden">
      <style>{`
        @keyframes landingFloatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-9px); }
        }
        @keyframes landingFloatAlt {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
        }
        @keyframes landingHeroIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float-slow {
          animation: landingFloatSlow 5.5s ease-in-out infinite;
        }
        .animate-float-alt {
          animation: landingFloatAlt 6.2s ease-in-out infinite;
        }
        .animate-hero-in {
          animation: landingHeroIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* =====================================================================
          1. HERO + DESKTOP / TABLET / REAL PHONE APP SHOWCASE
      ====================================================================== */}
      <div className="relative bg-gradient-to-b from-[#1E40AF] via-[#2563EB] to-[#DBEAFE] pt-4 pb-16 overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute top-32 -right-24 w-96 h-96 rounded-full bg-sky-300/20 blur-3xl animate-pulse" />

        {/* Top Navbar */}
        <header className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between text-white relative z-50">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-white text-[#2563EB] flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition">
              <Scissors size={17} />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              Booki<span className="text-blue-200">.tn</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-white/90">
            <a href="#ecrans" className="hover:text-white transition">Aperçu App</a>
            <a href="#univers" className="hover:text-white transition">Métiers</a>
            <a href="#features" className="hover:text-white transition">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-white transition">Tarifs</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-white/90 hover:text-white px-3 py-2 transition"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="bg-white text-[#2563EB] hover:bg-blue-50 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              Essai 14j Gratuit
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/15 text-white cursor-pointer"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mx-6 mt-2 bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-3 text-xs font-semibold text-slate-800 relative z-50 animate-in fade-in zoom-in-95">
            <a href="#ecrans" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">Aperçu App</a>
            <a href="#univers" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">Métiers</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">Fonctionnalités</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">Tarifs</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">FAQ</a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link href="/login" className="w-full py-2.5 text-center rounded-xl bg-slate-100 text-slate-800">
                Connexion
              </Link>
              <Link href="/signup" className="w-full py-2.5 text-center rounded-xl bg-[#2563EB] text-white">
                Créer mon salon gratuitement
              </Link>
            </div>
          </div>
        )}

        {/* Hero Copy */}
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-10 text-center text-white space-y-5 relative z-10 animate-hero-in">
          <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 backdrop-blur-md text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full">
            <Sparkles size={13} /> Conçu pour les Salons, Barbershops &amp; Spas en Tunisie
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-[54px] font-black tracking-tight leading-[1.08]">
            Remplissez votre agenda. <br className="hidden sm:inline" />
            Libérez vos mains.
          </h1>
          <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto leading-relaxed">
            Fini les messages Instagram manqués pendant que vous coiffez et les chaises vides de dernière minute. Booki automatise vos réservations 24h/24, votre boutique et votre rentabilité en TND.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="group bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold px-7 py-4 rounded-xl shadow-xl shadow-slate-950/25 transition inline-flex items-center gap-2"
            >
              Lancer mon salon gratuitement
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-bold px-6 py-4 rounded-xl transition"
            >
              Explorer les fonctionnalités
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-blue-100 font-semibold pt-1">
            <span className="flex items-center gap-1"><Check size={13} /> 14 jours gratuits</span>
            <span className="flex items-center gap-1"><Check size={13} /> Sans carte bancaire</span>
            <span className="flex items-center gap-1"><Check size={13} /> 0% commission par RDV</span>
          </div>
        </div>

        {/* Mobile Device Selector (< lg) */}
        <div className="lg:hidden flex justify-center px-4 mb-5 relative z-30">
          <div className="inline-flex bg-slate-950/25 backdrop-blur-md p-1 rounded-2xl border border-white/20 text-white text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setMobileDevice("desktop")}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mobileDevice === "desktop" ? "bg-white text-blue-700 shadow-sm" : "text-white/90"
              }`}
            >
              <Monitor size={14} /> Ordinateur
            </button>
            <button
              type="button"
              onClick={() => setMobileDevice("tablet")}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mobileDevice === "tablet" ? "bg-white text-blue-700 shadow-sm" : "text-white/90"
              }`}
            >
              <Tablet size={14} /> Tablette
            </button>
            <button
              type="button"
              onClick={() => setMobileDevice("phone")}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                mobileDevice === "phone" ? "bg-white text-blue-700 shadow-sm" : "text-white/90"
              }`}
            >
              <Smartphone size={14} /> Téléphone
            </button>
          </div>
        </div>

        {/* MULTI-DEVICE SHOWCASE */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-20 lg:pb-12 animate-hero-in">
          <div className="relative flex flex-col lg:block items-center">
            {/* 1. DESKTOP WINDOW */}
            <div
              className={`w-full max-w-4xl mx-auto bg-slate-900 rounded-2xl p-2 sm:p-2.5 shadow-[0_30px_80px_-15px_rgba(15,23,42,0.45)] border border-slate-700/80 ${
                mobileDevice === "desktop" ? "block" : "hidden lg:block"
              }`}
            >
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-3 py-0.5 rounded-full">
                  app.booki.tn/admin
                </span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En direct
                </span>
              </div>

              <div className="bg-white rounded-xl overflow-hidden">
                <div className="border-b border-slate-100 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#2563EB] text-white flex items-center justify-center">
                      <Scissors size={12} />
                    </div>
                    <span className="font-bold text-xs text-slate-900">Booki Admin</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold flex-wrap">
                    {[
                      { id: "planning", label: "Planning" },
                      { id: "pos", label: "Boutique POS" },
                      { id: "finance", label: "Rentabilité" },
                      { id: "whatsapp", label: "WhatsApp" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as PreviewTab)}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          activeTab === tab.id
                            ? "bg-blue-50 text-[#2563EB] font-bold"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400">Divine Curls</span>
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-[#2563EB] font-bold text-[10px] flex items-center justify-center">
                      DC
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-[#F8FAFC] space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        {currentPreview.title}
                      </h2>
                      <p className="text-[11px] text-slate-500">{currentPreview.subtitle}</p>
                    </div>
                    <span className="bg-[#2563EB] text-white text-[10px] sm:text-[11px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1 shadow-xs shrink-0">
                      <Plus size={12} /> {currentPreview.cta}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {currentPreview.kpis.map((kpi, i) => (
                      <div
                        key={i}
                        className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs space-y-1 transition hover:-translate-y-0.5"
                      >
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-block ${kpi.tone}`}>
                          {kpi.label}
                        </span>
                        <div className="text-xs sm:text-sm font-black text-slate-900">{kpi.value}</div>
                        <div className="text-[10px] text-slate-400">{kpi.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:pb-4">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-4 shadow-2xs">
                      <div className="divide-y divide-slate-50 text-[11px]">
                        {currentPreview.rows.map((row, idx) => (
                          <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-800 truncate">{row.col1}</div>
                            <div className="text-slate-500 hidden sm:block truncate">{row.col2}</div>
                            <div className="text-slate-400 truncate">{row.col3}</div>
                            <div className="font-bold text-slate-900 shrink-0">{row.col4}</div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 shrink-0">
                              {row.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#2563EB] to-[#4F86F7] rounded-xl p-4 text-white flex flex-col justify-between shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-blue-100">
                          {currentPreview.highlightLabel}
                        </span>
                        <Sparkles size={14} className="text-blue-200" />
                      </div>
                      <div className="my-2">
                        <div className="text-2xl font-black">{currentPreview.highlightValue}</div>
                        <div className="text-[10px] text-blue-100">{currentPreview.highlightSub}</div>
                      </div>
                      <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-white h-full transition-all duration-500"
                          style={{ width: `${currentPreview.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TABLET MOCKUP (Floating Left) */}
            <div
              className={`w-full max-w-[320px] lg:w-[270px] lg:absolute lg:left-0 lg:-bottom-6 z-30 bg-slate-900 rounded-[26px] p-2.5 shadow-2xl border-2 border-slate-700/80 lg:animate-float-slow ${
                mobileDevice === "tablet" ? "block mx-auto" : "hidden lg:block"
              }`}
            >
              <div className="flex items-center justify-center pb-1.5">
                <span className="w-8 h-1 rounded-full bg-slate-700" />
              </div>
              <div className="bg-white rounded-[18px] overflow-hidden text-left">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-100 block">
                      Tablette • Boutique
                    </span>
                    <strong className="text-xs font-black">Vente Produits</strong>
                  </div>
                  <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Click &amp; Collect
                  </span>
                </div>

                <div className="p-3 bg-slate-50 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-xl p-2 border border-slate-100 space-y-1.5">
                      <img
                        src={PHOTOS.shampoo}
                        alt="Shampoing Pro"
                        className="w-full h-16 object-cover rounded-lg"
                      />
                      <p className="text-[10px] font-bold text-slate-900 truncate">Shampoing Pro</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-600">35 TND</span>
                        <span className="w-4 h-4 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center">
                          +
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-2 border border-slate-100 space-y-1.5">
                      <img
                        src={PHOTOS.serum}
                        alt="Sérum Éclat"
                        className="w-full h-16 object-cover rounded-lg"
                      />
                      <p className="text-[10px] font-bold text-slate-900 truncate">Sérum Éclat</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-600">45 TND</span>
                        <span className="w-4 h-4 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center">
                          +
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between text-[10px]">
                    <span className="font-mono font-black text-indigo-600 flex items-center gap-1">
                      <Ticket size={12} /> BK-8F2A9C
                    </span>
                    <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      Prêt
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. REAL PHONE SCREENSHOT (Planning & Réservations - Floating Right) */}
            <div
              className={`lg:absolute lg:right-0 lg:-bottom-10 z-30 lg:animate-float-alt ${
                mobileDevice === "phone" ? "block mx-auto" : "hidden lg:block"
              }`}
            >
              <CroppedPhone
                src="/images/phone-calendar.png"
                posX="47.5%"
                scale={1.05}
                alt="Planning & Réservations sur mobile Booki"
                className="w-[240px] lg:w-[225px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. SWIPEABLE 6-PHONE REAL APP PANORAMA STRIP
      ====================================================================== */}
      <section id="ecrans" className="py-16 px-4 sm:px-6 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto space-y-6">
          <Reveal className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              Aperçu Réel de l&apos;Application
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Toute votre gestion et votre vitrine client dans votre poche
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Tableau de bord, campagnes WhatsApp, rentabilité, prise de RDV en ligne et boutique Click &amp; Collect.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="overflow-x-auto pb-2 -mx-2 px-2">
              <div className="min-w-[860px] md:min-w-0 md:w-full rounded-3xl bg-white p-2">
                <img
                  src="/images/phones-strip.png"
                  alt="Les 6 écrans clés de Booki sur iPhone"
                  className="w-full h-auto object-contain mx-auto"
                />
              </div>
            </div>
            <p className="md:hidden text-center text-[11px] font-bold text-slate-400 mt-1">
              ← Glissez horizontalement pour voir les 6 écrans →
            </p>
          </Reveal>
        </div>
      </section>

      {/* =====================================================================
          3. SALON UNIVERSES (Photography Cards)
      ====================================================================== */}
      <section id="univers" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto space-y-10">
          <Reveal className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              À Votre Image
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Une expérience client digne des plus grands salons
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Coiffeurs, barbershops ou instituts de beauté : Booki s&apos;adapte à votre identité, vos couleurs et votre rythme.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Salons de Coiffure",
                desc: "Colorations, kératine, brushing : maîtrisez la durée de chaque soin et déduisez vos consommables automatiquement.",
                img: PHOTOS.salon,
                tag: "Coiffure & Visagisme",
              },
              {
                title: "Barbershops & Studios",
                desc: "Encaissez vos clients de passage en 2 clics et boostez vos ventes d'huiles, cires et coffrets barber.",
                img: PHOTOS.barber,
                tag: "Barbershop",
              },
              {
                title: "Spas & Instituts Beauté",
                desc: "Offrez à vos clientes une réservation élégante à votre image, avec codes promo VIP et fiches de fidélité.",
                img: PHOTOS.spa,
                tag: "Spa & Esthétique",
              },
            ].map((card, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="group relative h-72 rounded-3xl overflow-hidden shadow-md hover:shadow-xl border border-slate-100 transition-all duration-300 hover:-translate-y-1.5">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2">
                    <span className="inline-block bg-white/20 backdrop-blur-md text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {card.tag}
                    </span>
                    <h3 className="text-lg font-black">{card.title}</h3>
                    <p className="text-xs text-slate-200 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. FULL-WIDTH HORIZONTAL COLORED FEATURES WITH REAL CROPPED SCREENS
      ====================================================================== */}
      <section id="features" className="pt-16 bg-slate-50/60">
        <Reveal className="max-w-3xl mx-auto px-6 pb-12 text-center space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
            Fonctionnalités Clés
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tout ce qu&apos;il faut pour gagner plus, en travaillant plus sereinement
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Quatre outils puissants réunis dans une seule interface ultra-simple.
          </p>
        </Reveal>

        <div className="w-full">
          {/* BAND 1: WHATSAPP & PROMO CODES (EMERALD FULL WIDTH + CROPPED PHONE 2) */}
          <div className="w-full bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white py-14 sm:py-16 px-6">
            <Reveal className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                  <MessageSquare size={12} /> 01 • WhatsApp &amp; Codes Promo
                </div>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                  Zéro chaise vide : vos clients n&apos;oublient plus jamais leur rendez-vous.
                </h3>
                <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed max-w-2xl">
                  Un client qui oublie, c&apos;est du chiffre d&apos;affaires perdu. Avec Booki, relancez toute votre liste de demain sur WhatsApp en un clic, lancez des codes promo ciblés et publiez vos offres sur vos statuts en 10 secondes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold pt-2">
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-200 shrink-0" /> Messages WhatsApp pré-remplis en 1 clic</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-200 shrink-0" /> Codes promo (% ou TND) avec expiration</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-200 shrink-0" /> Modèles personnalisables avec variables</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-200 shrink-0" /> Générateur d&apos;annonces pour statuts &amp; groupes</span>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                <CroppedPhone
                  src="/images/phones-strip.png"
                  posX="20.5%"
                  alt="Publicité & WhatsApp sur Booki"
                  className="w-[215px] sm:w-[235px] rotate-2 hover:rotate-0 transition-transform duration-500"
                />
              </div>
            </Reveal>
          </div>

          {/* BAND 2: BOOKING 24/7 (ROYAL BLUE FULL WIDTH + CROPPED PHONES 4 & 5) */}
          <div className="w-full bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-indigo-700 text-white py-14 sm:py-16 px-6">
            <Reveal className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center items-center">
                <div className="flex items-center justify-center -space-x-10 sm:-space-x-12">
                  <CroppedPhone
                    src="/images/phones-strip.png"
                    posX="59.8%"
                    alt="Portail de réservation client - Prestations"
                    className="w-[175px] sm:w-[205px] -rotate-6 hover:rotate-0 hover:z-20 transition-all duration-500"
                  />
                  <CroppedPhone
                    src="/images/phones-strip.png"
                    posX="79.5%"
                    alt="Portail de réservation client - Calendrier et Créneaux"
                    className="w-[175px] sm:w-[205px] rotate-6 translate-y-4 hover:rotate-0 hover:z-20 transition-all duration-500 z-10"
                  />
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                  <Calendar size={12} /> 02 • Réservation en Ligne 24/7
                </div>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                  Votre réceptionniste digitale travaille même à 2h du matin.
                </h3>
                <p className="text-xs sm:text-sm text-blue-50 leading-relaxed max-w-2xl">
                  Mettez votre lien Booki dans votre bio Instagram et sur Google Maps. Vos clients choisissent leur soin, leur praticien et leur heure en 30 secondes — sans jamais interrompre votre travail ni créer de double réservation.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold pt-2">
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-200 shrink-0" /> Créneaux temps réel sans chevauchement</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-200 shrink-0" /> Confirmation e-mail &amp; rappel J-1 auto</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-200 shrink-0" /> Ajout direct Apple &amp; Google Agenda</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-200 shrink-0" /> Portail aux couleurs &amp; logo du salon</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* BAND 3: STORE & POS (AMBER / ORANGE FULL WIDTH + CROPPED PHONE 6) */}
          <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white py-14 sm:py-16 px-6">
            <Reveal className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                  <ShoppingCart size={12} /> 03 • Boutique Click &amp; Collect &amp; Caisse POS
                </div>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                  Transformez vos shampoings et soins en source de revenus automatique.
                </h3>
                <p className="text-xs sm:text-sm text-amber-50 leading-relaxed max-w-2xl">
                  Vos clients commandent leurs produits préférés en ligne et viennent payer &amp; retirer au salon avec leur code unique. Au comptoir, encaissez vos ventes directes en espèces ou carte et imprimez la facture en un clic.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold pt-2">
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-100 shrink-0" /> Vitrine Click &amp; Collect avec code retrait</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-100 shrink-0" /> Vente directe au comptoir (POS)</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-100 shrink-0" /> Factures PDF prêtes à imprimer</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-amber-100 shrink-0" /> Calcul de marge &amp; alerte stock faible</span>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center">
                <CroppedPhone
                  src="/images/phones-strip.png"
                  posX="99%"
                  alt="Boutique Click & Collect Booki"
                  className="w-[215px] sm:w-[235px] -rotate-2 hover:rotate-0 transition-transform duration-500"
                />
              </div>
            </Reveal>
          </div>

          {/* BAND 4: MANAGE SALON & PROFITABILITY (INDIGO / VIOLET FULL WIDTH + CROPPED PHONES 1 & 3) */}
          <div className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 text-white py-14 sm:py-16 px-6">
            <Reveal className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center items-center">
                <div className="flex items-center justify-center -space-x-10 sm:-space-x-12">
                  <CroppedPhone
                    src="/images/phones-strip.png"
                    posX="1%"
                    alt="Tableau de bord Booki"
                    className="w-[175px] sm:w-[205px] -rotate-6 hover:rotate-0 hover:z-20 transition-all duration-500"
                  />
                  <CroppedPhone
                    src="/images/phones-strip.png"
                    posX="40.2%"
                    alt="Dépenses & Rentabilité Booki"
                    className="w-[175px] sm:w-[205px] rotate-6 translate-y-4 hover:rotate-0 hover:z-20 transition-all duration-500 z-10"
                  />
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                  <TrendingUp size={12} /> 04 • Gestion Complète &amp; Rentabilité
                </div>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                  Fini les mauvaises surprises : pilotez votre vrai bénéfice net.
                </h3>
                <p className="text-xs sm:text-sm text-indigo-50 leading-relaxed max-w-2xl">
                  Encaisser beaucoup ne veut pas toujours dire gagner beaucoup. Booki suit le coût de vos produits consommés, vos factures, votre loyer et les salaires de votre équipe pour vous montrer votre rentabilité réelle chaque jour.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold pt-2">
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-200 shrink-0" /> Planning timeline &amp; Walk-ins rapides</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-200 shrink-0" /> Marge nette calculée par prestation</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-200 shrink-0" /> Suivi des salaires, point mort &amp; export CSV</span>
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-200 shrink-0" /> Notifications en direct &amp; protection hors ligne</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. TESTIMONIALS
      ====================================================================== */}
      <section id="testimonials" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-12">
          <Reveal className="text-center space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              Ils Utilisent Booki au Quotidien
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Des résultats concrets dès la première semaine
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "Avant, je passais ma soirée à répondre aux DM Instagram. Aujourd'hui mes clients réservent seuls à 23h et mon agenda du lendemain est plein au réveil.",
                author: "Youssef Ben Amor",
                role: "The Art Barbershop • La Marsa",
              },
              {
                quote:
                  "Voir exactement ce que me coûtent les produits par prestation et suivre le paiement de mon équipe dans la même app m'a fait gagner des heures chaque semaine.",
                author: "Sarra Khemir",
                role: "Sarra K Beauty Lounge • Sousse",
              },
              {
                quote:
                  "Nos ventes de shampoings et soins ont augmenté grâce au Click & Collect. Les clientes commandent en ligne et récupèrent au comptoir avec leur code.",
                author: "Mehdi Trabelsi",
                role: "Urban Cut Studio • Lac 2 Tunis",
              },
            ].map((item, idx) => (
              <Reveal key={idx} delay={idx * 100}>
                <div className="h-full bg-[#F8FAFC] rounded-3xl p-6 border border-slate-100 flex flex-col justify-between space-y-6 hover:shadow-md hover:-translate-y-1 transition duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={13} fill="currentColor" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{item.author}</div>
                    <div className="text-[11px] text-slate-400">{item.role}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. PRICING
      ====================================================================== */}
      <section id="pricing" className="py-20 px-6 bg-slate-50/70">
        <div className="max-w-5xl mx-auto space-y-12">
          <Reveal className="text-center space-y-4 max-w-xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              Tarification Simple &amp; Transparente
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              0% de commission. Un prix fixe en TND.
            </h2>
            <p className="text-xs text-slate-500">
              Commencez avec 14 jours d&apos;essai complet sans engagement ni carte bancaire.
            </p>

            <div className="inline-flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                  billingCycle === "monthly" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                  billingCycle === "annual" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                Annuel (-20%)
              </button>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <Reveal delay={0}>
              <div className="bg-white rounded-3xl p-7 border border-slate-200/80 space-y-6 hover:shadow-lg transition">
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">Plan Solo</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {billingCycle === "annual" ? "39" : "49"} TND
                    </span>
                    <span className="text-xs text-slate-400">/ mois</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Pour les indépendants et barbiers solo.</p>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-5">
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> 1 Collaborateur</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Lien de réservation 24h/24</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Rappels WhatsApp &amp; E-mail</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Agenda PWA mobile</li>
                </ul>

                <Link
                  href="/signup"
                  className="block w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-semibold transition"
                >
                  Essayer gratuitement
                </Link>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="bg-gradient-to-b from-[#2563EB] to-[#4E85F6] rounded-3xl p-8 text-white shadow-2xl shadow-blue-600/25 space-y-6 md:-my-4 relative hover:-translate-y-1 transition duration-300">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">Salon Standard</h3>
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Le plus choisi
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">
                      {billingCycle === "annual" ? "79" : "99"} TND
                    </span>
                    <span className="text-xs text-blue-100">/ mois</span>
                  </div>
                  <p className="text-[11px] text-blue-100">Tout pour piloter équipe, boutique et rentabilité.</p>
                </div>

                <ul className="space-y-3 text-xs text-white/95 border-t border-white/15 pt-5">
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Jusqu&apos;à 5 collaborateurs</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Boutique Click &amp; Collect + POS</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Marges &amp; stock consommables</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Bilan financier, salaires &amp; CSV</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Support prioritaire WhatsApp</li>
                </ul>

                <Link
                  href="/signup"
                  className="block w-full py-3.5 rounded-xl bg-white hover:bg-blue-50 text-[#2563EB] text-center text-xs font-bold shadow-md transition"
                >
                  Démarrer 14 jours gratuits
                </Link>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="bg-white rounded-3xl p-7 border border-slate-200/80 space-y-6 hover:shadow-lg transition">
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">Multi-Salons</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {billingCycle === "annual" ? "149" : "180"} TND
                    </span>
                    <span className="text-xs text-slate-400">/ mois</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Pour les grands centres esthétiques et réseaux.</p>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-5">
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Collaborateurs illimités</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Gestion multi-adresses</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Codes promo &amp; campagnes avancées</li>
                  <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Accompagnement sur place (Tunis)</li>
                </ul>

                <Link
                  href="/signup"
                  className="block w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-semibold transition"
                >
                  Créer mon compte
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. FAQ ACCORDION
      ====================================================================== */}
      <section id="faq" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-10">
          <Reveal className="text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Vos questions, nos réponses
            </h2>
          </Reveal>

          <div className="divide-y divide-slate-100">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`transition rounded-2xl ${isOpen ? "bg-[#F8FAFC] px-5 py-4 my-2" : "py-4 px-2"}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left text-xs sm:text-sm font-bold text-slate-900 cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <span className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      {isOpen ? <X size={12} /> : <Plus size={12} />}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed pr-8">{faq.answer}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. FINAL ORBITAL CTA BANNER
      ====================================================================== */}
      <section className="relative bg-gradient-to-b from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] py-24 px-6 text-white overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[340px] h-[340px] sm:w-[540px] sm:h-[540px] rounded-full border border-dashed border-white/25 animate-[spin_50s_linear_infinite]" />
          <div className="absolute w-[520px] h-[520px] sm:w-[820px] sm:h-[820px] rounded-full border border-dashed border-white/15 animate-[spin_80s_linear_infinite_reverse]" />
        </div>

        <Reveal className="max-w-xl mx-auto text-center space-y-5 relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-[11px] font-bold">
            <Zap size={12} /> Prêt en 5 minutes
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.12]">
            Offrez à votre salon l&apos;image qu&apos;il mérite
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-md mx-auto leading-relaxed">
            Rejoignez les gérants qui ont remplacé le cahier papier par un système clair, rapide et rentable.
          </p>
          <div className="pt-2 flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold px-7 py-4 rounded-xl shadow-xl transition"
            >
              Démarrer gratuitement (14 jours)
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <span className="text-[11px] text-blue-100 flex items-center gap-1.5">
              <ShieldCheck size={13} /> Aucune carte bancaire requise
            </span>
          </div>
        </Reveal>
      </section>

      {/* =====================================================================
          9. FOOTER
      ====================================================================== */}
      <footer className="bg-slate-950 text-slate-400 py-10 px-6 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <span>
              Booki<span className="text-blue-500">.tn</span>
            </span>
            <span className="text-slate-500 font-normal ml-2">© 2026 Booki Tunisia.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#ecrans" className="hover:text-white transition">Aperçu App</a>
            <a href="#features" className="hover:text-white transition">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-white transition">Tarifs</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <Link href="/login" className="hover:text-white transition">Connexion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}