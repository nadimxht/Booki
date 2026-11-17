'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ShoppingCart,
  MessageSquare,
  Check,
  Plus,
  X,
  Menu,
  Users,
  Sparkles,
  TrendingUp,
  Bell,
  Package,
  Scissors,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Search,
  Filter
} from 'lucide-react';

export default function BookiLandingPage() {
  const [activeTab, setActiveTab] = useState<'planning' | 'pos' | 'inventory' | 'whatsapp'>('planning');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(2);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const faqs = [
    {
      question: "En combien de temps puis-je configurer mon salon sur Booki ?",
      answer: "Moins de 5 minutes. Créez votre compte, ajoutez vos prestations, vos collaborateurs et partagez immédiatement votre lien personnalisé (ex: votre-salon.booki.tn) sur Instagram et Google Maps."
    },
    {
      question: "Booki fonctionne-t-il sur smartphone, tablette et ordinateur ?",
      answer: "Oui. Booki est une Progressive Web App (PWA) ultra-rapide. Vous pouvez l'installer directement sur l'écran d'accueil de votre iPhone, Android, iPad ou PC sans passer par un store."
    },
    {
      question: "Comment fonctionnent les rappels WhatsApp et la déduction des stocks ?",
      answer: "Dès qu'un rendez-vous est pris, Booki programme un rappel WhatsApp automatique 24h avant pour éviter les absences. Côté stock, chaque prestation terminée déduit automatiquement les produits consommés et met à jour votre bénéfice net en TND."
    },
    {
      question: "L'application mobile et le portail client sont-ils inclus dans tous les forfaits ?",
      answer: "Absolument. Tous les plans incluent votre vitrine de réservation en ligne 24h/24, l'accès mobile illimité pour votre équipe et l'essai gratuit de 14 jours sans carte bancaire."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* =====================================================================
          1. HERO & FLOATING INTERACTIVE APP WINDOW (Sky Blue Gradient + Cloud Fade)
      ====================================================================== */}
      <div className="relative bg-gradient-to-b from-[#2563EB] via-[#538BF5] to-[#B7D2FF] pt-4 pb-12">
        
        {/* Top Floating Glass Navbar */}
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
            <a href="#approach" className="hover:text-white transition">Solution</a>
            <a href="#features" className="hover:text-white transition">Fonctionnalités</a>
            <a href="#testimonials" className="hover:text-white transition">Avis Salons</a>
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
              className="bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-xs"
            >
              Essai Gratuit
            </Link>
          </div>

          {/* Mobile Burger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/15 text-white"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mx-6 mt-2 bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-3 text-xs font-semibold text-slate-800 relative z-50">
            <a href="#approach" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">Solution</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">Fonctionnalités</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">Avis Salons</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">Tarifs</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1.5">FAQ</a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link href="/login" className="w-full py-2.5 text-center rounded-xl bg-slate-100 text-slate-800">Connexion</Link>
              <Link href="/signup" className="w-full py-2.5 text-center rounded-xl bg-[#2563EB] text-white">Créer un compte salon</Link>
            </div>
          </div>
        )}

        {/* Hero Center Copy */}
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-12 text-center text-white space-y-5 relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-[54px] font-bold tracking-tight leading-[1.12]">
            La Gestion Intelligente <br />
            de Votre Salon
          </h1>
          <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto font-normal leading-relaxed">
            Un tableau de bord puissant qui élimine les rendez-vous manqués, automatise vos rappels WhatsApp et pilote votre caisse en TND en temps réel.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold px-6 py-3.5 rounded-lg shadow-lg shadow-slate-950/20 transition cursor-pointer"
            >
              Démarrer gratuitement (14j)
            </Link>
            <a
              href="#features"
              className="bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-semibold px-6 py-3.5 rounded-lg transition"
            >
              Découvrir la plateforme
            </a>
          </div>
        </div>

        {/* Interactive Desktop App Mockup (Exact PolicyPilot Window Style) */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-20">
          <div className="bg-white rounded-2xl shadow-[0_25px_70px_-15px_rgba(15,23,42,0.22)] border border-white/80 overflow-hidden">
            
            {/* App Top Bar */}
            <div className="border-b border-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#2563EB] text-white flex items-center justify-center">
                  <Scissors size={12} />
                </div>
                <span className="font-bold text-xs text-slate-900">Booki Admin</span>
              </div>

              {/* Interactive Module Switcher Tabs */}
              <div className="flex items-center gap-1 sm:gap-2 text-[11px] font-semibold">
                {[
                  { id: 'planning', label: 'Planning' },
                  { id: 'pos', label: 'Caisse & Store' },
                  { id: 'inventory', label: 'Stocks & COGS' },
                  { id: 'whatsapp', label: 'WhatsApp Auto' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-[#2563EB] font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400">The Art Barbershop</span>
                <div className="w-7 h-7 rounded-full bg-blue-100 text-[#2563EB] font-bold text-[10px] flex items-center justify-center">
                  YB
                </div>
              </div>
            </div>

            {/* App Body Content */}
            <div className="p-5 sm:p-7 bg-[#F8FAFC] space-y-5">
              
              {/* Top Row Header inside App */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {activeTab === 'planning' && 'Agenda & Réservations'}
                    {activeTab === 'pos' && 'Caisse POS & Boutique'}
                    {activeTab === 'inventory' && 'Inventaire & Consommables'}
                    {activeTab === 'whatsapp' && 'Campagnes & Rappels WhatsApp'}
                  </h2>
                  <p className="text-[11px] text-slate-500">Vue multi-collaborateurs synchronisée en direct • Tunis</p>
                </div>
                <button className="bg-[#2563EB] text-white text-[11px] font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs">
                  <Plus size={13} /> Nouveau RDV
                </button>
              </div>

              {/* 4 Mini Summary Cards + 1 Chart Card (Matching the 5-card grid in the video) */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">24 RDV</div>
                    <div className="text-[10px] text-slate-400">Aujourd'hui</div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">96% Confirmés</div>
                    <div className="text-[10px] text-slate-400">Via WhatsApp</div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ShoppingCart size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">1,280 TND</div>
                    <div className="text-[10px] text-slate-400">Recette du jour</div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Package size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Stock Optimal</div>
                    <div className="text-[10px] text-slate-400">Déduction auto</div>
                  </div>
                </div>

                {/* Right-hand Compliance / Performance Bar Card */}
                <div className="col-span-2 lg:col-span-1 bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700">Taux Occupation</span>
                    <span className="text-[10px] font-bold text-emerald-600">+18%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex my-1.5">
                    <div className="bg-emerald-500 w-[64%]" />
                    <div className="bg-amber-400 w-[22%]" />
                    <div className="bg-rose-400 w-[14%]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                    <span>Confirmé</span>
                    <span>En attente</span>
                  </div>
                </div>
              </div>

              {/* Bottom Table + Right Blue Storage/Credits Card (Exact layout from frame 00:01) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Dernières Réservations & Encaissements</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Search size={12} /> <span>Filtrer</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50 text-[11px]">
                    {[
                      { client: "Karim Mansouri", service: "Coupe + Barbe VIP", staff: "Youssef", price: "45 TND", status: "Confirmé" },
                      { client: "Amira Trabelsi", service: "Balayage & Soin Kératine", staff: "Sarra", price: "180 TND", status: "En cours" },
                      { client: "Sami Ben Ali", service: "Soin Visage & Coiffage", staff: "Mehdi", price: "65 TND", status: "Confirmé" },
                    ].map((row, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-800">{row.client}</div>
                        <div className="text-slate-500 hidden sm:block">{row.service}</div>
                        <div className="text-slate-400">{row.staff}</div>
                        <div className="font-bold text-slate-900">{row.price}</div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700">
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blue Highlight Card inside App */}
                <div className="bg-gradient-to-br from-[#2563EB] to-[#4F86F7] rounded-xl p-4 text-white flex flex-col justify-between shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-100">Crédits WhatsApp</span>
                    <Sparkles size={14} className="text-blue-200" />
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-black">84%</div>
                    <div className="text-[10px] text-blue-100">42 / 50 rappels gratuits disponibles</div>
                  </div>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-white h-full w-[84%]" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Atmospheric White Cloud Mist Fade Overlay at Bottom of Hero Window */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-32 bg-gradient-to-t from-white via-white/95 to-transparent z-30" />
        </div>
      </div>

      {/* =====================================================================
          2. TRUSTED BY SALONS (Monochrome Partner Logos Strip)
      ====================================================================== */}
      <section className="py-12 px-6 bg-white relative z-30">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Adopté par les meilleurs salons en Tunisie
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-50 grayscale">
            <span className="font-black text-base tracking-wider text-slate-800">THE ART BARBER</span>
            <span className="font-serif italic font-bold text-lg text-slate-800">Sarra K. Lounge</span>
            <span className="font-extrabold text-sm tracking-widest text-slate-800 border border-slate-400 px-2.5 py-1">URBAN CUT</span>
            <span className="font-bold text-base tracking-tight text-slate-800">MAISON ÉLITE</span>
            <span className="font-black text-sm tracking-widest text-slate-800">CARTHAGE SPA</span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. EFFORTLESS SALON OPERATIONS (3-Column Minimalist Icon Row)
      ====================================================================== */}
      <section id="approach" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center space-y-14">
          <div className="space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              Notre Approche
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Une gestion de salon <br /> sans effort
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Item 1 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-blue-200 animate-[spin_20s_linear_infinite]" />
                <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-600/25">
                  <Calendar size={18} />
                </div>
              </div>
              <h3 className="font-bold text-sm text-slate-900">Réservation en Ligne 24h/24</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Vos clients réservent depuis votre lien personnalisé sur Instagram ou Google sans interrompre vos prestations.
              </p>
            </div>

            {/* Item 2 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-blue-200" />
                <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-600/25">
                  <Package size={18} />
                </div>
              </div>
              <h3 className="font-bold text-sm text-slate-900">Suivi Automatique des Stocks</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Chaque soin validé déduit automatiquement vos consommables et calcule votre marge nette en Dinar Tunisien.
              </p>
            </div>

            {/* Item 3 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-blue-200" />
                <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-600/25">
                  <Bell size={18} />
                </div>
              </div>
              <h3 className="font-bold text-sm text-slate-900">Rappels WhatsApp & Promo</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Réduisez les absences de 85% grâce aux notifications WhatsApp automatiques et fidélisez avec des codes promo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. KEY FEATURES (2x2 Pastel Bento Grid with Floating UI Widgets)
      ====================================================================== */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              Fonctionnalités Clés
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Tout ce dont vous avez besoin <br /> pour piloter votre activité
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bento Card 01 */}
            <div className="rounded-3xl bg-gradient-to-b from-[#F4F7FF] to-[#EBF1FF] p-7 border border-blue-100/70 flex flex-col justify-between space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800">Rentabilité Mensuelle (TND)</span>
                  <span className="text-emerald-600 font-bold">+24%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 w-[68%]" />
                  <div className="bg-amber-400 w-[20%]" />
                  <div className="bg-rose-400 w-[12%]" />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xl font-black text-slate-900">4,350 TND</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">Bénéfice Net</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">Salaires & COGS déduits</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-[#2563EB]">01</span>
                <h3 className="text-base font-bold text-slate-900">Bilan Financier Automatisé</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Suivez en temps réel vos recettes prestations, ventes boutique, salaires d'équipe et coûts de réapprovisionnement sans tableur Excel.
                </p>
              </div>
            </div>

            {/* Bento Card 02 */}
            <div className="rounded-3xl bg-gradient-to-b from-[#EEF4FF] to-[#DCE8FF] p-7 border border-blue-100/70 flex flex-col justify-between space-y-6">
              <div className="bg-gradient-to-br from-[#2563EB] to-[#568DF8] rounded-2xl p-5 text-white shadow-md flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-blue-100 font-bold">Crédits WhatsApp</span>
                  <div className="text-3xl font-black">50 Offerts</div>
                  <p className="text-[10px] text-blue-100">Rappels 24h avant & codes promo</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
                  <MessageSquare size={24} />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-[#2563EB]">02</span>
                <h3 className="text-base font-bold text-slate-900">Marketing & Rappels WhatsApp</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Connectez votre compte WhatsApp Business, personnalisez vos modèles de relance et diffusez vos offres spéciales en un clic.
                </p>
              </div>
            </div>

            {/* Bento Card 03 */}
            <div className="rounded-3xl bg-gradient-to-b from-[#FFF9F2] to-[#FFF2E2] p-7 border border-amber-100/70 flex flex-col justify-between space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100/80 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Réservations du Mois</span>
                  <div className="text-2xl font-black text-slate-900">420</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">+12% vs mois dernier</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-amber-600">03</span>
                <h3 className="text-base font-bold text-slate-900">Boutique en Ligne & Caisse POS</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vendez vos shampoings, huiles et soins en salon ou en Click & Collect avec génération automatique de reçus clients.
                </p>
              </div>
            </div>

            {/* Bento Card 04 */}
            <div className="rounded-3xl bg-gradient-to-b from-[#F2FBF9] to-[#E3F6F1] p-7 border border-emerald-100/70 flex flex-col justify-between space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100/80 space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Performance Équipe</div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-[#2563EB] font-bold text-[10px] flex items-center justify-center">YB</div>
                    <span className="font-bold text-slate-800">Youssef B.</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">98 RDV • 2,450 TND</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">SK</div>
                    <span className="font-bold text-slate-800">Sarra K.</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">84 RDV • 3,120 TND</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-emerald-600">04</span>
                <h3 className="text-base font-bold text-slate-900">Planning & Commissions Équipe</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gérez les horaires de chaque coiffeur ou esthéticienne, suivez leurs prestations réalisées et simplifiez le calcul des salaires.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================================
          5. TESTIMONIALS (Minimalist 3-Column Quote Cards)
      ====================================================================== */}
      <section id="testimonials" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              Témoignages
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Ce que disent nos salons partenaires
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "Avant Booki, on notait tout sur un cahier et on perdait 3 à 4 créneaux par jour à cause des oublis. Avec les rappels WhatsApp, nos no-shows ont chuté de 85%.",
                author: "Youssef Ben Amor",
                role: "The Art Barbershop, La Marsa"
              },
              {
                quote: "Le calcul automatique de la rentabilité et la déduction du stock de colorations à chaque rendez-vous me font gagner des heures chaque semaine.",
                author: "Sarra Khemir",
                role: "Sarra K Beauty Lounge, Sousse"
              },
              {
                quote: "Nos clients réservent directement depuis notre bio Instagram à minuit. L'interface est ultra-rapide sur téléphone comme sur tablette à l'accueil.",
                author: "Mehdi Trabelsi",
                role: "Urban Cut Studio, Lac 2 Tunis"
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-[#F8FAFC] rounded-2xl p-6 border border-slate-100 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <span className="text-3xl font-serif text-blue-200 leading-none block">“</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.quote}
                  </p>
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{item.author}</div>
                  <div className="text-[11px] text-slate-400">{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. PRICING (3 Cards with Elevated Royal-Blue Center Pro Card)
      ====================================================================== */}
      <section id="pricing" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              Tarification Transparente
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Choisissez le plan adapté <br /> à votre salon
            </h2>

            {/* Billing Switch */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                  billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                  billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Annuel (-20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Left Card: Solo */}
            <div className="bg-[#F8FAFC] rounded-3xl p-7 border border-slate-200/80 space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-900">Plan Solo</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    {billingCycle === 'annual' ? '39' : '49'} TND
                  </span>
                  <span className="text-xs text-slate-400">/ mois</span>
                </div>
                <p className="text-[11px] text-slate-500">Idéal pour les indépendants et barbiers solo.</p>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-200/70 pt-5">
                <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> 1 Collaborateur</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Lien de réservation personnalisé</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> 50 rappels WhatsApp / mois</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Agenda mobile PWA</li>
              </ul>

              <Link
                href="/signup"
                className="block w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-semibold transition"
              >
                Commencer l'essai
              </Link>
            </div>

            {/* Center Elevated Card: Salon Standard (Exact PolicyPilot Business Plan look) */}
            <div className="bg-gradient-to-b from-[#2563EB] to-[#4E85F6] rounded-3xl p-8 text-white shadow-2xl shadow-blue-600/25 space-y-6 md:-my-4 relative">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">Salon Standard</h3>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Populaire
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    {billingCycle === 'annual' ? '79' : '99'} TND
                  </span>
                  <span className="text-xs text-blue-100">/ mois</span>
                </div>
                <p className="text-[11px] text-blue-100">Pour les salons en croissance avec équipe et boutique.</p>
              </div>

              <ul className="space-y-3 text-xs text-white/95 border-t border-white/15 pt-5">
                <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Jusqu'à 5 collaborateurs</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Caisse POS & Boutique en ligne</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Déduction automatique des stocks</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Bilan financier & rentabilité nette</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-white" /> Support prioritaire WhatsApp</li>
              </ul>

              <Link
                href="/signup"
                className="block w-full py-3.5 rounded-xl bg-white hover:bg-blue-50 text-[#2563EB] text-center text-xs font-bold shadow-md transition"
              >
                Activer Salon Standard
              </Link>
            </div>

            {/* Right Card: Franchise */}
            <div className="bg-[#F8FAFC] rounded-3xl p-7 border border-slate-200/80 space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-900">Multi-Salons</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    {billingCycle === 'annual' ? '149' : '180'} TND
                  </span>
                  <span className="text-xs text-slate-400">/ mois</span>
                </div>
                <p className="text-[11px] text-slate-500">Pour les grands centres esthétiques et réseaux.</p>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-200/70 pt-5">
                <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Collaborateurs illimités</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Gestion multi-adresses</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Campagnes WhatsApp avancées</li>
                <li className="flex items-center gap-2.5"><Check size={14} className="text-[#2563EB]" /> Configuration sur place (Tunis)</li>
              </ul>

              <Link
                href="/signup"
                className="block w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-semibold transition"
              >
                Nous contacter
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================================
          7. FAQ ACCORDION (Minimalist + / x Style from frame 00:10)
      ====================================================================== */}
      <section id="faq" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Questions Fréquentes
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`transition rounded-2xl ${isOpen ? 'bg-[#F8FAFC] px-5 py-4 my-2' : 'py-4 px-2'}`}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left text-xs sm:text-sm font-bold text-slate-900 cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <span className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      {isOpen ? <X size={12} /> : <Plus size={12} />}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed pr-8">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. ORBITAL SKY CTA BANNER (Exact Layout from frames 00:11 - 00:14)
      ====================================================================== */}
      <section className="relative bg-gradient-to-b from-[#6FA3FF] via-[#3A75F0] to-[#1D54D8] py-28 px-6 text-white overflow-hidden">
        
        {/* Concentric Dashed Orbital Circles */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[340px] h-[340px] sm:w-[540px] sm:h-[540px] rounded-full border border-dashed border-white/25" />
          <div className="absolute w-[520px] h-[520px] sm:w-[820px] sm:h-[820px] rounded-full border border-dashed border-white/15" />
        </div>

        {/* Floating Live UI Cards on Orbit */}
        <div className="max-w-5xl mx-auto relative z-10">
          
          {/* Top Right Floating Card */}
          <div className="hidden md:flex items-center gap-3 bg-white text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl w-fit ml-auto mr-16 mb-6">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Bell size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold">Rappel WhatsApp Envoyé</div>
              <div className="text-[10px] text-slate-400">Karim M. • Demain à 10:00</div>
            </div>
          </div>

          {/* Center CTA Block */}
          <div className="max-w-xl mx-auto text-center space-y-5 py-6">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.15]">
              Prenez le contrôle de <br /> votre salon dès aujourd'hui
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 max-w-md mx-auto leading-relaxed">
              Automatisez vos réservations, éliminez les absences et suivez votre rentabilité en TND depuis un seul tableau de bord.
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-block bg-slate-950 hover:bg-slate-900 text-white text-xs font-semibold px-7 py-3.5 rounded-xl shadow-xl transition"
              >
                Démarrer gratuitement
              </Link>
            </div>
          </div>

          {/* Bottom Floating Cards Row */}
          <div className="hidden md:flex items-center justify-between mt-6 px-4">
            <div className="bg-white text-slate-900 p-4 rounded-2xl shadow-xl w-56 space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span>Bénéfice Net</span>
                <span className="text-emerald-600">+18%</span>
              </div>
              <div className="text-lg font-black">4,350 TND</div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[75%]" />
              </div>
            </div>

            <div className="bg-white text-slate-900 p-4 rounded-2xl shadow-xl w-60 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Équipe Active</div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">Youssef B.</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">En service</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">Sarra K.</span>
                <span className="text-[10px] bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded-full font-bold">En prestation</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =====================================================================
          9. CLEAN MINIMAL FOOTER
      ====================================================================== */}
      <footer className="bg-slate-950 text-slate-400 py-10 px-6 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <span>Booki<span className="text-blue-500">.tn</span></span>
            <span className="text-slate-500 font-normal ml-2">© 2026 Booki Tunisia.</span>
          </div>
          <div className="flex items-center gap-6">
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