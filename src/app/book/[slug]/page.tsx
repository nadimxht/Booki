'use client';

import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Clock, Calendar as CalendarIcon, CheckCircle2, MessageSquare, MapPin, Phone, ChevronRight, Sparkles, Scissors, Tag, X } from 'lucide-react';

interface BusinessSettings {
  business_id: string;
  name: string;
  slug: string;
  booking_title?: string;
  booking_subtitle?: string;
  description?: string;
  location?: string;
  maps_url?: string;
  whatsapp_number?: string;
  hero_image_url?: string;
  store_image?: string;
  primary_color?: string;
  working_hours?: {
    start?: string;
    end?: string;
    days?: number[];
  };
}

interface Service {
  id: string;
  business_id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
}

interface Staff {
  id: string;
  business_id: string;
  name: string;
  color_code: string;
}

interface BookingInterval {
  start_time: string;
  end_time: string;
}

interface PromoCode {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
}

function BookingPortalContent() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();
  const handleApplyPromo = async () => {
    setPromoError('');
    const codeClean = promoInput.trim().toUpperCase();
    if (!codeClean || !settings || !selectedService) return;

    const { data: promoData, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('business_id', settings.business_id)
      .eq('code', codeClean)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !promoData) {
      setPromoError('Code promo invalide ou introuvable.');
      setAppliedPromo(null);
      return;
    }

    // 1. Vérification de la date d'expiration
    if (promoData.expires_at && new Date(promoData.expires_at) < new Date()) {
      setPromoError('Ce code promo a expiré.');
      setAppliedPromo(null);
      return;
    }

    // 2. Vérification du montant minimum d'achat
    const servicePrice = selectedService.price;
    if (promoData.min_purchase && servicePrice < Number(promoData.min_purchase)) {
      setPromoError(`Montant minimum requis pour ce code : ${promoData.min_purchase} TND.`);
      setAppliedPromo(null);
      return;
    }

    setAppliedPromo({
      code: promoData.code,
      discount_type: promoData.discount_type,
      discount_value: Number(promoData.discount_value),
    });
    setPromoInput('');
  };

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Étapes du parcours de réservation (1 à 3)
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  
  // Date du jour par défaut
  const todayString = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(todayString);
  
  const [selectedTime, setSelectedTime] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [existingBookings, setExistingBookings] = useState<BookingInterval[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Gestion du mois affiché dans la grille calendrier
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Formulaire, Promo et Paiement
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('onsite');
  
  // États Promo
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPortalData() {
      if (!slug) return;

      const { data: settingsData, error: settingsError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (settingsError || !settingsData) {
        console.error("Erreur chargement paramètres business:", settingsError?.message || "Salon introuvable");
        setLoading(false);
        return;
      }

      setSettings(settingsData);

      const openHour = parseInt(settingsData.working_hours?.start ? settingsData.working_hours.start.split(':')[0] : '9', 10);
      const closeHour = parseInt(settingsData.working_hours?.end ? settingsData.working_hours.end.split(':')[0] : '18', 10);
      
      const slots: string[] = [];
      for (let h = openHour; h < closeHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
      }
      setTimeSlots(slots);

      const [srvRes, stfRes] = await Promise.all([
        supabase.from('services').select('*').eq('business_id', settingsData.business_id).order('name'),
        supabase.from('employees').select('*').eq('business_id', settingsData.business_id).order('name')
      ]);

      setServices(srvRes.data || []);
      const formattedStaff = (stfRes.data || []).map((emp: any) => ({
        id: emp.id,
        business_id: emp.business_id,
        name: emp.name,
        color_code: emp.color || '#2563EB'
      }));
      setStaffList(formattedStaff);
      setLoading(false);
    }

    fetchPortalData();
  }, [slug, supabase]);

  useEffect(() => {
    if (selectedStaff && !selectedDate) {
      setSelectedDate(todayString);
    }
  }, [selectedStaff, todayString]);

  useEffect(() => {
    async function fetchStaffBookings() {
      if (!selectedDate || !selectedStaff || !settings) {
        setExistingBookings([]);
        return;
      }

      setLoadingSlots(true);
      const { data } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('business_id', settings.business_id)
        .eq('employee_id', selectedStaff.id)
        .eq('booking_date', selectedDate)
        .neq('status', 'canceled');

      if (data) {
        setExistingBookings(data);
      } else {
        setExistingBookings([]);
      }
      setLoadingSlots(false);
    }

    fetchStaffBookings();
  }, [selectedDate, selectedStaff, settings, supabase]);

  // Calcul du prix avec réduction
  const originalPrice = selectedService?.price || 0;
  let finalPrice = originalPrice;
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percent') {
      finalPrice = Math.max(0, originalPrice * (1 - appliedPromo.discount_value / 100));
    } else {
      finalPrice = Math.max(0, originalPrice - appliedPromo.discount_value);
    }
  }

  

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !selectedService || !selectedStaff) return;
    setSubmitting(true);

    try {
      let clientId;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('business_id', settings.business_id)
        .eq('phone', clientPhone)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            business_id: settings.business_id,
            full_name: clientName,
            phone: clientPhone,
            email: clientEmail,
          })
          .select()
          .single();

        if (clientError || !newClient) {
          throw new Error("Erreur lors de l'enregistrement du client : " + clientError?.message);
        }
        clientId = newClient.id;
      }

      const [h, m] = selectedTime.split(':').map(Number);
      const startMins = h * 60 + m;
      const endMins = startMins + selectedService.duration_minutes;
      const endH = Math.floor(endMins / 60);
      const endM = endMins % 60;
      const formattedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const { error: bookingError } = await supabase.from('bookings').insert({
        business_id: settings.business_id,
        client_name: clientName,
        client_whatsapp: clientPhone,
        client_id: clientId,
        service_id: selectedService.id,
        employee_id: selectedStaff.id,
        booking_date: selectedDate,
        start_time: selectedTime,
        end_time: formattedEndTime,
        status: 'still',
        is_walk_in: false,
        total_price: finalPrice,
      });

      if (bookingError) throw new Error(bookingError.message);

      setBookingSuccess(true);
    } catch (err: any) {
      alert("Erreur lors de la réservation : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" /> Chargement du portail salon...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800 font-bold text-sm">
        Salon introuvable. Veuillez vérifier l'adresse URL.
      </div>
    );
  }

  const primaryColor = settings.primary_color || '#2563EB';

  // Générateur des jours du mois pour la grille calendrier
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Ajustement pour commencer la semaine un lundi (0 = Lundi, 6 = Dimanche)
  const startingDayIndex = (firstDayOfMonth + 6) % 7; 
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const allowedDays = settings.working_hours?.days || [1, 2, 3, 4, 5, 6];

  const calendarDays = [];
  // Cases vides pour aligner le premier jour du mois
  for (let i = 0; i < startingDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    calendarDays.push(new Date(year, month, d));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-28">
      
      {/* HERO HEADER */}
      <div className="relative min-h-[320px] sm:min-h-[360px] flex items-end justify-start px-6 sm:px-12 pb-20 overflow-hidden border-b border-white/10" style={{ backgroundColor: primaryColor }}>
        {settings.hero_image_url ? (
          <div className="absolute inset-0 z-0">
            <img src={settings.hero_image_url} alt={settings.name} className="w-full h-full object-cover scale-105 filter brightness-75" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        )}

        <div className="relative z-10 max-w-3xl w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden shrink-0">
              {settings.store_image ? (
                <img src={settings.store_image} alt={settings.name} className="w-full h-full object-cover" />
              ) : (
                <Scissors size={36} className="text-white/90" />
              )}
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                <Sparkles size={11} /> Réservation en ligne vérifiée
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">{settings.name}</h1>
              <p className="text-xs sm:text-sm text-white/90 max-w-xl font-normal leading-relaxed">
                {settings.description || settings.booking_subtitle || "Réservez votre moment bien-être en quelques secondes."}
              </p>

              <div className="flex items-center gap-3 text-xs text-white/95 font-medium pt-1 flex-wrap">
                {settings.location && (
                  <a href={settings.maps_url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-xl backdrop-blur-md transition border border-white/20">
                    <MapPin size={13} className="text-white" /> {settings.location}
                  </a>
                )}
                {settings.whatsapp_number && (
                  <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-xl backdrop-blur-md transition border border-white/20">
                    <Phone size={13} className="text-white" /> {settings.whatsapp_number}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN BOOKING CONTAINER */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-5 relative z-20">
        {bookingSuccess ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 text-center shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Réservation Confirmée !</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Votre créneau a été enregistré avec succès. Pour finaliser, envoyez le récapitulatif directement sur le WhatsApp du salon !
              </p>
            </div>

            {settings.whatsapp_number && (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Bonjour ${settings.name} 👋\n\nJe viens de réserver un rendez-vous en ligne :\n- *Prestation* : ${selectedService?.name}\n- *Expert* : ${selectedStaff?.name}\n- *Date* : ${selectedDate} à ${selectedTime}\n- *Client* : ${clientName} (${clientPhone})\n- *Total* : ${finalPrice.toFixed(2)} TND\n\nMerci de me confirmer la prise en compte !`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3.5 rounded-2xl text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  <MessageSquare size={16} /> Envoyer la confirmation sur WhatsApp
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Effectuer une autre réservation
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl space-y-8">
            
            {/* Stepper Indicator */}
            <div className="grid grid-cols-3 gap-2 pb-6 border-b border-slate-100 text-center">
              <div 
                className="text-xs font-bold pb-2 border-b-2 transition"
                style={{ borderColor: step === 1 ? primaryColor : 'transparent', color: step === 1 ? primaryColor : '#94a3b8' }}
              >
                1. Prestation
              </div>
              <div 
                className="text-xs font-bold pb-2 border-b-2 transition"
                style={{ borderColor: step === 2 ? primaryColor : 'transparent', color: step === 2 ? primaryColor : '#94a3b8' }}
              >
                2. Expert & Date
              </div>
              <div 
                className="text-xs font-bold pb-2 border-b-2 transition"
                style={{ borderColor: step === 3 ? primaryColor : 'transparent', color: step === 3 ? primaryColor : '#94a3b8' }}
              >
                3. Coordonnées & Promo
              </div>
            </div>

            {/* STEP 1: SELECT SERVICE */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    {settings.booking_title || "Choisissez une prestation"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {settings.booking_subtitle || "Sélectionnez le soin ou la coupe de votre choix pour continuer."}
                  </p>
                </div>

                {services.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">Aucun service disponible pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service);
                          setStep(2);
                        }}
                        className="bg-slate-50/80 hover:bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 transition cursor-pointer flex items-center justify-between gap-4 group shadow-2xs"
                      >
                        <div className="space-y-1">
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Clock size={12} /> {service.duration_minutes} min</span>
                            <span>•</span>
                            <span className="text-slate-600">{service.category || 'Général'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-slate-900 text-sm sm:text-base">{service.price} TND</span>
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition text-slate-600 group-hover:text-white"
                            style={{ backgroundColor: '#f1f5f9' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = primaryColor}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          >
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: STAFF, MONTHLY CALENDAR GRID & TIME SLOTS */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Expert, Date & Horaire</h2>
                  <p className="text-xs text-slate-500">Sélectionnez le professionnel souhaité et votre jour de disponibilité.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Choisissez l'expert</label>
                  {staffList.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucun membre d'équipe enregistré.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {staffList.map((staff) => {
                        const isSelected = selectedStaff?.id === staff.id;
                        return (
                          <div
                            key={staff.id}
                            onClick={() => {
                              setSelectedStaff(staff);
                              setSelectedTime('');
                            }}
                            style={{
                              borderColor: isSelected ? primaryColor : '#e2e8f0',
                              backgroundColor: isSelected ? `${primaryColor}0d` : '#f8fafc',
                            }}
                            className="border-2 rounded-2xl p-3.5 transition cursor-pointer flex items-center gap-3 shadow-2xs"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm" style={{ backgroundColor: staff.color_code || primaryColor }}>
                              {staff.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-xs truncate">{staff.name}</h3>
                              <p className="text-[10px] text-slate-500 font-medium">Disponible</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedStaff && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    
                    {/* Grille Calendrier Mensuelle */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sélectionnez un jour</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold cursor-pointer"
                          >
                            ←
                          </button>
                          <span className="text-xs font-bold text-slate-800 px-2">
                            {currentMonthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold cursor-pointer"
                          >
                            →
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                          <span key={d} className="text-[10px] font-bold text-slate-400 py-1">{d}</span>
                        ))}

                        {calendarDays.map((dayDate, idx) => {
                          if (!dayDate) {
                            return <div key={`empty-${idx}`} />;
                          }

                          const dateStr = dayDate.toLocaleDateString('en-CA');
                          const dayOfWeek = dayDate.getDay(); // 0 = Dimanche, 1 = Lundi...
                          const isPast = dateStr < todayString;
                          const isAllowedDay = allowedDays.includes(dayOfWeek);
                          const isDisabled = isPast || !isAllowedDay;
                          const isSelected = selectedDate === dateStr;

                          return (
                            <button
                              key={dateStr}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setSelectedTime('');
                              }}
                              style={{
                                backgroundColor: isSelected ? primaryColor : isDisabled ? '#f1f5f9' : '#f8fafc',
                                color: isSelected ? '#ffffff' : isDisabled ? '#cbd5e1' : '#334155',
                                borderColor: isSelected ? primaryColor : '#e2e8f0'
                              }}
                              className={`h-9 rounded-xl text-xs font-bold border transition flex items-center justify-center ${
                                isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-indigo-500'
                              }`}
                            >
                              {dayDate.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Créneaux Horaires */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Créneaux disponibles</label>
                      {!selectedDate ? (
                        <p className="text-xs text-slate-400 italic py-2">Veuillez d'abord sélectionner une date sur le calendrier.</p>
                      ) : loadingSlots ? (
                        <p className="text-xs text-slate-500 animate-pulse py-2">Recherche des disponibilités...</p>
                      ) : (
                        (() => {
                          const serviceDuration = selectedService?.duration_minutes || 30;
                          const openTimeStr = settings.working_hours?.start || '09:00';
                          const closeTimeStr = settings.working_hours?.end || '18:00';
                          
                          const [openH, openM] = openTimeStr.split(':').map(Number);
                          const [closeH, closeM] = closeTimeStr.split(':').map(Number);
                          
                          const openMinutes = openH * 60 + openM;
                          const closeMinutes = closeH * 60 + closeM;

                          const dynamicSlots: string[] = [];
                          for (let m = openMinutes; m < closeMinutes; m += 30) {
                            const h = Math.floor(m / 60);
                            const min = m % 60;
                            dynamicSlots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
                          }

                          // Vérification si la date sélectionnée est aujourd'hui pour bloquer les heures passées
                          const now = new Date();
                          const currentHour = now.getHours();
                          const currentMinute = now.getMinutes();
                          const currentTotalMins = currentHour * 60 + currentMinute;
                          const isToday = selectedDate === todayString;

                          const availableSlots = dynamicSlots.filter((time) => {
                            const [h, m] = time.split(':').map(Number);
                            const slotStartMins = h * 60 + m;
                            const slotEndMins = slotStartMins + serviceDuration;

                            if (slotEndMins > closeMinutes) return false;

                            // Empêcher de réserver dans le passé si c'est aujourd'hui
                            if (isToday && slotStartMins <= currentTotalMins) return false;

                            const hasCollision = existingBookings.some((booking) => {
                              const [bH, bM] = booking.start_time.split(':').map(Number);
                              const [eH, eM] = booking.end_time.split(':').map(Number);
                              const bStartMins = bH * 60 + bM;
                              const bEndMins = eH * 60 + eM;

                              return slotStartMins < bEndMins && slotEndMins > bStartMins;
                            });

                            return !hasCollision;
                          });

                          if (availableSlots.length === 0) {
                            return <p className="text-xs text-rose-500 font-medium py-2">Aucun créneau libre (ou heures dépassées) pour cette date.</p>;
                          }

                          return (
                            <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                              {availableSlots.map((time) => {
                                const isSelected = selectedTime === time;
                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => setSelectedTime(time)}
                                    style={{
                                      backgroundColor: isSelected ? primaryColor : '#f8fafc',
                                      color: isSelected ? '#ffffff' : '#334155',
                                      borderColor: isSelected ? primaryColor : '#e2e8f0'
                                    }}
                                    className="py-2.5 text-xs font-bold rounded-xl border transition shadow-2xs cursor-pointer"
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()
                      )}
                    </div>

                  </div>
                )}

                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                  <button onClick={() => setStep(1)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">← Retour aux services</button>
                  <button
                    disabled={!selectedStaff || !selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                    style={{ backgroundColor: primaryColor }}
                    className="text-white px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-40 transition shadow-sm cursor-pointer"
                  >
                    Continuer vers le formulaire
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CLIENT FORM, PROMO CODE & SUBMISSION */}
            {step === 3 && (
              <form onSubmit={handleConfirmBooking} className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Vos coordonnées & Paiement</h2>
                  <p className="text-xs text-slate-500">Dernière étape pour valider votre rendez-vous chez {settings.name}.</p>
                </div>
                
                {/* Récapitulatif avec gestion Code Promo */}
                <div className="rounded-2xl p-4 border text-xs space-y-2 text-slate-700 bg-slate-50/80 border-slate-200">
                  <div className="flex justify-between font-bold text-slate-900 pb-2 border-b border-slate-200/60">
                    <span>{selectedService?.name}</span>
                    <div className="text-right">
                      {appliedPromo ? (
                        <div>
                          <span className="line-through text-slate-400 mr-2">{originalPrice.toFixed(2)} TND</span>
                          <span className="text-emerald-600 font-black">{finalPrice.toFixed(2)} TND</span>
                        </div>
                      ) : (
                        <span style={{ color: primaryColor }}>{originalPrice.toFixed(2)} TND</span>
                      )}
                    </div>
                  </div>

                  <p><strong>Expert :</strong> {selectedStaff?.name}</p>
                  <p><strong>Date & Heure :</strong> {selectedDate} à {selectedTime}</p>
                  <p><strong>Durée :</strong> {selectedService?.duration_minutes} minutes</p>

                  {/* Input Code Promo */}
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Tag size={12} className="text-indigo-600" /> Avez-vous un code promo ? (ex: WELCOME10, BOOKI20)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Entrez votre code"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Appliquer
                      </button>
                    </div>
                    {promoError && <p className="text-[10px] text-rose-500 font-semibold">{promoError}</p>}
                    {appliedPromo && (
                      <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 text-[11px] font-bold">
                        <span>Code "{appliedPromo.code}" appliqué (-{appliedPromo.discount_type === 'percent' ? `${appliedPromo.discount_value}%` : `${appliedPromo.discount_value} TND`})</span>
                        <button type="button" onClick={() => setAppliedPromo(null)} className="text-emerald-700 hover:text-emerald-900"><X size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Nom complet</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      placeholder="ex: Youssef Ben Amor"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium bg-slate-50 focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Numéro de téléphone (WhatsApp)</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                      placeholder="+216 98 000 000"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium bg-slate-50 focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">E-mail (Optionnel)</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium bg-slate-50 focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Mode de règlement</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium bg-slate-50 focus:outline-none transition cursor-pointer"
                    >
                      <option value="onsite">Paiement sur place (Espèces / Carte)</option>
                      <option value="deposit">Acompte en ligne sécurisé (30% via Konnect/Flouci)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setStep(2)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">← Retour</button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    style={{ backgroundColor: primaryColor }}
                    className="text-white px-7 py-3.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? "Validation en cours..." : "Confirmer le rendez-vous"}
                  </button>
                </div>
              </form>
            )}

          </div>
        )}
      </div>

      {/* STICKY FLOATING SUMMARY BAR */}
      {selectedService && !bookingSuccess && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl p-4 sm:px-8 animate-in slide-in-from-bottom-5 duration-300">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Scissors size={18} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 truncate">{selectedService.name}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: primaryColor }}>
                    {finalPrice.toFixed(2)} TND {appliedPromo && '(Promo)'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {selectedStaff ? `Expert: ${selectedStaff.name}` : "Aucun expert choisi"} 
                  {selectedDate && selectedTime ? ` • ${selectedDate} à ${selectedTime}` : ""}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer hover:opacity-90"
                >
                  Choisir l'expert →
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  disabled={!selectedStaff || !selectedDate || !selectedTime}
                  onClick={() => setStep(3)}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 transition shadow-sm cursor-pointer hover:opacity-90"
                >
                  Continuer →
                </button>
              )}

              {step === 3 && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
                  Étape finale
                </span>
              )}
            </div>

          </div>
        </div>
      )}

      <footer className="mt-20 text-center text-xs text-slate-400 space-y-1">
        <p className="font-bold text-slate-600">Propulsé par Booki<span style={{ color: primaryColor }}>.tn</span></p>
        <p className="text-[11px]">Plateforme de réservation et gestion pour salons en Tunisie.</p>
      </footer>

    </div>
  );
}

export default function BookingPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" /> Chargement du portail...
        </div>
      </div>
    }>
      <BookingPortalContent />
    </Suspense>
  );
}