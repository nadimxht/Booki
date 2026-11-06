'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import image1 from './images/mobile.jpg';
import { 
  Calendar, 
  ShoppingCart, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  Check,
  Star,
  Quote,
  MapPin,
  ChevronDown,
  HelpCircle,
  Building2,
  TrendingUp,
  Zap,
  BarChart3,
  Clock,
  UserCheck,
  ShieldCheck,
  Smartphone,
  Scissors,
  Users,
  Store,
  Menu,
  X,
  CreditCard,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Image
} from 'lucide-react';

export default function BookiLandingPage() {
  const [activeDemoTab, setActiveDemoTab] = useState<'calendar' | 'dashboard' | 'pos' | 'whatsapp'>('calendar');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const testimonials = [
    {
      name: "Youssef Ben Amor",
      role: "Fondateur & Master Barber",
      salon: "The Art Barbershop",
      location: "La Marsa, Tunis",
      quote: "Depuis qu'on a installé Booki, nos rendez-vous manqués ont chuté de 85% grâce aux rappels WhatsApp. La gestion de ma caisse en TND et de mes 4 coiffeurs se fait en quelques clics.",
      metric: "-85% de no-shows",
      rating: 5
    },
    {
      name: "Sarra Khemir",
      role: "Gérante & Coloriste",
      salon: "Sarra K Beauty Lounge",
      location: "Sousse (El Kantaoui)",
      quote: "Le suivi automatique du stock de consommables est indispensable. Dès qu'une coloration est validée dans l'agenda, la quantité exacte de teinture est déduite de notre inventaire.",
      metric: "+30% de temps gagné",
      rating: 5
    },
    {
      name: "Mehdi Trabelsi",
      role: "Propriétaire",
      salon: "Urban Ink & Cut Studio",
      location: "Lac 2, Tunis",
      quote: "Nos clients adorent réserver directement en ligne à n'importe quelle heure sans devoir appeler. La fluidité du calendrier par membre d'équipe est remarquable.",
      metric: "+45 RDV / mois",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "Comment fonctionne l'essai gratuit de 14 jours ?",
      answer: "Vous bénéficiez d'un accès complet pendant 14 jours, sans carte bancaire ni engagement. Vous pouvez configurer vos services, ajouter vos collaborateurs et recevoir des réservations en ligne dès le premier jour."
    },
    {
      question: "Booki fonctionne-t-il sur smartphone, tablette et PC ?",
      answer: "Oui. Booki est une application web ultra-rapide (PWA). Elle s'adapte parfaitement aux téléphones (iOS & Android), tablettes et ordinateurs sans nécessiter d'installation lourde."
    },
    {
      question: "Comment fonctionnent les rappels WhatsApp automatiques ?",
      answer: "Lorsqu'un client réserve en ligne ou en salon, un message WhatsApp personnalisé lui est envoyé 24 heures avant son rendez-vous avec un bouton de confirmation en 1 clic. Vos clients n'ont pas besoin d'installer d'application."
    },
    {
      question: "Comment se déroule la gestion de caisse en Dinar Tunisien (TND) ?",
      answer: "Booki intègre un module POS complet adapté à la Tunisie. Vous enregistrez les encaissements en espèces (cash), par carte bancaire ou via paiements digitaux (Flouci, Konnect, e-Dinar) avec édition de tickets."
    },
    {
      question: "Puis-je lier ma page Instagram ou Facebook au système de réservation ?",
      answer: "Absolument. Vous disposez d'un lien unique (ex: booki.tn/votre-salon) à intégrer dans la bio de votre profil Instagram, votre page Facebook ou votre fiche Google Maps."
    },
    {
      question: "L'équipe Booki m'aide-t-elle pour la configuration initiale ?",
      answer: "Oui ! Notre équipe support basée en Tunisie vous aide gratuitement à importer vos clients, configurer vos tarifs, et former votre personnel via WhatsApp ou par téléphone."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased border-t-4 border-indigo-600">
      
      {/* Top Release Banner */}
      <div className="bg-slate-950 text-slate-300 text-xs font-medium py-2.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
              Booki TN v2.5
            </span>
            <span className="hidden sm:inline text-slate-300">
              Logiciel de gestion & réservation en ligne pour salons de coiffure, esthétique et spas en Tunisie.
            </span>
          </div>
          <Link href="#pricing" className="text-indigo-400 font-semibold hover:text-indigo-300 transition flex items-center gap-1 group">
            Essayer 14 jours gratuits <ArrowRight size={12} className="group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2 group">
              
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Booki<span className="text-indigo-600">.tn</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
              <a href="#features" className="hover:text-slate-900 transition">Fonctionnalités</a>
              <a href="#demo" className="hover:text-slate-900 transition">Logiciel en Action</a>
              <a href="#testimonials" className="hover:text-slate-900 transition">Salons Partenaires</a>
              <a href="#pricing" className="hover:text-slate-900 transition">Tarification</a>
              <a href="#faq" className="hover:text-slate-900 transition">FAQ</a>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs font-semibold">
            <Link 
              href="/login" 
              className="text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded transition"
            >
              Connexion
            </Link>
            <Link 
              href="/signup" 
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded transition font-medium shadow-xs"
            >
              Créer un compte salon
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-700 p-2 hover:bg-slate-100 rounded"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3 text-xs font-semibold">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-slate-700">Fonctionnalités</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-slate-700">Logiciel en Action</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-slate-700">Salons Partenaires</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-slate-700">Tarification</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-slate-700">FAQ</a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link href="/auth/login" className="w-full text-center py-2 text-slate-800 bg-slate-100 rounded">Connexion</Link>
              <Link href="/auth/register" className="w-full text-center py-2 text-white bg-slate-900 rounded font-medium">Créer un compte</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>La solution complète pour coiffure, beauté & esthétique</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            La gestion de votre salon, <br className="hidden sm:inline" />
            <span className="text-indigo-600">en toute simplicité.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Permettez à vos clients de réserver en ligne 24h/24, éliminez les RDV manqués avec WhatsApp et gardez le contrôle total sur votre caisse et vos stocks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-semibold pt-2">
            <Link 
              href="/auth/register" 
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-7 py-3.5 rounded transition text-sm font-medium flex items-center justify-center gap-2 shadow-xs"
            >
              Commencer l'essai gratuit (14 jours)
              <ArrowRight size={16} />
            </Link>
            <a 
              href="#demo" 
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-7 py-3.5 rounded transition text-sm font-medium flex items-center justify-center"
            >
              Découvrir la démo interactive
            </a>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-slate-500 border-t border-slate-100 max-w-xl mx-auto">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Sans carte bancaire</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Conçu pour le marché Tunisien</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Configuration en 5 min</span>
            </div>
          </div>

        </div>
      </section>

   {/* Interactive App Preview Section */}
<section id="demo" className="py-16 px-6 max-w-7xl mx-auto">
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-10 space-y-8">
    
    
  </div>
</section>
      {/* Feature Grid (Fresha Style) */}
      <section id="features" className="py-16 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Tout ce dont votre salon a besoin
          </h2>
          <p className="text-sm text-slate-600">
            Une suite complète d'outils pensés pour faire grandir votre activité au quotidien.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          
          <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-3 hover:border-slate-300 transition">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Réservation en Ligne 24/7</h3>
            <p className="text-slate-600 leading-relaxed">
              Vos clients réservent leurs soins directement depuis Instagram, Facebook ou Google sans vous déranger pendant vos prestations.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-3 hover:border-slate-300 transition">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center font-bold">
              <MessageSquare size={20} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Rappels WhatsApp Automatiques</h3>
            <p className="text-slate-600 leading-relaxed">
              Envoi automatique de SMS/WhatsApp de confirmation et de rappel 24h avant. Les no-shows sont réduits au minimum.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-3 hover:border-slate-300 transition">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded flex items-center justify-center font-bold">
              <ShoppingCart size={20} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Online store</h3>
            <p className="text-slate-600 leading-relaxed">
              Gestion et ventes des produits cosmethique avec édition de reçus.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-3 hover:border-slate-300 transition">
            <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Planning par Collaborateur</h3>
            <p className="text-slate-600 leading-relaxed">
              Attribuez des plannings distincts à chaque coiffeur ou esthéticienne avec gestion fine de leurs horaires et commissions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-3 hover:border-slate-300 transition">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center font-bold">
              <Store size={20} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Déduction Automatique des Stocks</h3>
            <p className="text-slate-600 leading-relaxed">
              Associez vos fournitures (teintures, shampooings, huiles) aux soins. Dès que la prestation est terminée, le stock se met à jour.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-3 hover:border-slate-300 transition">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center font-bold">
              <BarChart3 size={20} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Rapports & Statistiques</h3>
            <p className="text-slate-600 leading-relaxed">
              Visualisez le chiffre d'affaires quotidien, les prestations les plus rentables et le taux de fidélité de votre clientèle.
            </p>
          </div>

        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section id="testimonials" className="py-16 px-6 max-w-7xl mx-auto space-y-12 border-t border-slate-200">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Les salons tunisiens nous font confiance
          </h2>
          <p className="text-sm text-slate-600">
            Découvrez comment Booki simplifie la gestion quotidienne de leurs équipes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5 text-amber-500">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                    {t.metric}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  "{t.quote}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs">{t.name}</h4>
                <p className="text-[11px] text-slate-500">{t.role} — <span className="text-slate-800 font-semibold">{t.salon}</span></p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {t.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section with Interactive Billing Switcher */}
      <section id="pricing" className="py-16 px-6 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Des forfaits adaptés à chaque étape
            </h2>
            <p className="text-sm text-slate-600">
              Essai gratuit de 14 jours sans engament. Facturation transparente en Dinar Tunisien.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="pt-2 flex items-center justify-center gap-3 text-xs font-semibold">
              <span className={billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}>Paiement Mensuel</span>
              <button 
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="w-12 h-6 bg-slate-900 rounded-full p-1 transition relative flex items-center"
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <span className={billingCycle === 'annual' ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                Paiement Annuel <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold ml-1">-20% Reduc</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs max-w-5xl mx-auto">
            
            {/* Starter Plan */}
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="font-bold text-slate-900 text-sm">Indépendant / Solo</div>
                <p className="text-slate-500">Pour les coiffeurs ou esthéticiennes travaillant seuls.</p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-slate-900">
                    {billingCycle === 'annual' ? '39 TND' : '49 TND'}
                  </span>
                  <span className="text-slate-500 font-medium"> / mois</span>
                </div>
                <ul className="space-y-2 text-slate-700 pt-3 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>1 Collaborateur unique</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Page de réservation en ligne dédiée</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Rappels SMS/WhatsApp (50 / mois)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Agenda mobile & PC</span>
                  </li>
                </ul>
              </div>
              <Link 
                href="/auth/register" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded transition text-center"
              >
                Commencer l'essai
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white p-6 rounded-lg border-2 border-indigo-600 shadow-xs flex flex-col justify-between space-y-6 relative">
              <span className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">
                Le plus populaire
              </span>
              <div className="space-y-3">
                <div className="font-bold text-slate-900 text-sm">Salon Standard</div>
                <p className="text-slate-500">Pour les salons avec équipe et gestion de caisse complète.</p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-slate-900">
                    {billingCycle === 'annual' ? '79 TND' : '99 TND'}
                  </span>
                  <span className="text-slate-500 font-medium"> / mois</span>
                </div>
                <ul className="space-y-2 text-slate-700 pt-3 border-t border-slate-100">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check size={14} className="text-indigo-600" />
                    <span>Jusqu'à 5 Collaborateurs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Rappels WhatsApp illimités</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Module Caisse POS & Tickets TND</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Gestion des consommables & stocks</span>
                  </li>
                </ul>
              </div>
              <Link 
                href="/auth/register" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded transition text-center shadow-xs"
              >
                Activer la formule Pro
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="font-bold text-slate-900 text-sm">Réseaux & Franchises</div>
                <p className="text-slate-500">Pour les centres multi-enseignes et grandes équipes.</p>
                <div className="pt-2">
                  <span className="text-3xl font-black text-slate-900">
                    {billingCycle === 'annual' ? '149 TND' : '180 TND'}
                  </span>
                  <span className="text-slate-500 font-medium"> / mois</span>
                </div>
                <ul className="space-y-2 text-slate-700 pt-3 border-t border-slate-200">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Collaborateurs illimités</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Multi-salons / Multi-adresses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" />
                    <span>Support VIP WhatsApp 7j/7</span>
                  </li>
                </ul>
              </div>
              <Link 
                href="/auth/register" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded transition text-center"
              >
                Nous contacter
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Expandable FAQ Section */}
      <section id="faq" className="py-16 px-6 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Questions fréquentes
          </h2>
          <p className="text-sm text-slate-600">
            Avez-vous des questions sur Booki ? Voici nos réponses.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className="bg-white rounded border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full text-left p-4 flex items-center justify-between gap-4 font-semibold text-slate-900 text-xs hover:bg-slate-50 transition"
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    size={16} 
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-900' : ''}`} 
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 font-normal">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
           
            <span className="font-bold text-slate-200">
              Booki.tn
            </span>
            <span className="text-slate-500 ml-2">
              © 2026 Booki Tunisia. Tous droits réservés.
            </span>
          </div>

          <div className="flex flex-wrap gap-6 font-medium text-slate-400">
            <a href="#" className="hover:text-slate-200 transition">Conditions d'utilisation</a>
            <a href="#" className="hover:text-slate-200 transition">Confidentialité</a>
            <a href="#" className="hover:text-slate-200 transition">Support WhatsApp</a>
          </div>
        </div>
      </footer>

    </div>
  );
}