'use client';

import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Clock, Calendar as CalendarIcon, CheckCircle2, Menu, MapPin, Phone, User } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  slug: string;
  location?: string;
  whatsapp_number?: string;
  description?: string;
  hero_image_url?: string;
  color_palette?: string;
  maps_url?: string;
  working_hours?: {
    start?: string;
    end?: string;
  };
}

interface Service {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
}

interface Staff {
  id: string;
  name: string;
  color_code: string;
}

interface BookingInterval {
  start_time: string;
  end_time: string;
}

function BookingPortalContent() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Étapes du parcours de réservation (1 à 3)
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [existingBookings, setExistingBookings] = useState<BookingInterval[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Formulaire et paiement
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('onsite');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const getThemeHex = (palette?: string) => {
    switch (palette) {
      case 'emerald': return '#059669';
      case 'violet': return '#7c3aed';
      case 'rose': return '#e11d48';
      default: return '#0092f6';
    }
  };

  useEffect(() => {
    async function fetchPortalData() {
      if (!slug) return;

      const { data: bizData, error: bizError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('slug', slug)
        .single();

      if (bizError || !bizData) {
        setLoading(false);
        return;
      }

      setBusiness(bizData);

      const openHour = parseInt(bizData.working_hours?.start ? bizData.working_hours.start.split(':')[0] : '9', 10);
      const closeHour = parseInt(bizData.working_hours?.end ? bizData.working_hours.end.split(':')[0] : '18', 10);
      
      const slots: string[] = [];
      for (let h = openHour; h < closeHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`); // Intervalles de 30 min pour plus de précision
      }
      setTimeSlots(slots);

      const { data: srvData } = await supabase.from('services').select('*');
      const { data: stfData } = await supabase.from('employees').select('*');

      setServices(srvData || []);
      const formattedStaff = (stfData || []).map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        color_code: emp.color || '#3b82f6'
      }));
      setStaffList(formattedStaff);
      setLoading(false);
    }

    fetchPortalData();
  }, [slug, supabase]);

  // Récupère les réservations de l'employé sélectionné pour la date choisie
  useEffect(() => {
    async function fetchStaffBookings() {
      if (!selectedDate || !selectedStaff) {
        setExistingBookings([]);
        return;
      }

      setLoadingSlots(true);
      const { data } = await supabase
        .from('bookings')
        .select('start_time, end_time')
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
  }, [selectedDate, selectedStaff, supabase]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !selectedService || !selectedStaff) return;

    let clientId;
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', clientPhone)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          full_name: clientName,
          phone: clientPhone,
          email: clientEmail,
        })
        .select()
        .single();

      if (clientError || !newClient) {
        alert("Erreur lors de l'enregistrement du client : " + clientError?.message);
        return;
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
      total_price: selectedService.price,
    });

    if (bookingError) {
      alert("Erreur lors de la réservation : " + bookingError.message);
    } else {
      setBookingSuccess(true);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement du portail...</div>;
  }

  if (!business) {
    return <div className="min-h-screen flex items-center justify-center text-slate-800 font-bold">Entreprise introuvable.</div>;
  }

  const primaryColorHex = getThemeHex(business.color_palette);
  const todayString = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* En-tête Hero */}
      <div className="relative h-72 bg-slate-900 overflow-hidden">
        {business.hero_image_url ? (
          <img src={business.hero_image_url} alt={business.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800 opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent z-10" />
        
        <div className="absolute top-4 left-4 z-20 bg-white/20 backdrop-blur-md p-2 rounded-full text-white cursor-pointer hover:bg-white/30 transition">
          <Menu size={20} />
        </div>

        <div className="absolute bottom-6 left-6 z-20 text-white max-w-2xl">
          <h1 className="text-3xl font-bold">{business.name}</h1>
          {business.description && (
            <p className="text-sm text-slate-200 mt-1 line-clamp-2">{business.description} </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-slate-300 mt-3">
            {business.location && (
              business.maps_url ? (
                <a href={business.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                  <MapPin size={14} /> {business.location}
                </a>
              ) : (
                <span className="flex items-center gap-1"><MapPin size={14} /> {business.location}</span>
              )
            )}
            
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300 mt-3">
          {business.whatsapp_number && (
              <a
                href={`https://wa.me/${business.whatsapp_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
              >
                <Phone size={14} /> {business.whatsapp_number}
              </a>
            )}
            </div>
        </div>
      </div>

      {/* Assistant de réservation principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {bookingSuccess ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Réservation Confirmée !</h2>
            <p className="text-slate-600 mb-6">Un récapitulatif a été enregistré. Nous avons hâte de vous accueillir.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-white px-6 py-2.5 rounded-xl font-medium transition shadow-sm"
              style={{ backgroundColor: primaryColorHex }}
            >
              Effectuer une autre réservation
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {/* En-tête des étapes simplifiées (1 à 3) */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 text-sm font-semibold">
              <span style={{ color: step >= 1 ? primaryColorHex : '#94a3b8' }}>1. Prestation</span>
              <span style={{ color: step >= 2 ? primaryColorHex : '#94a3b8' }}>2. Date & Heure</span>
              <span style={{ color: step >= 3 ? primaryColorHex : '#94a3b8' }}>3. Coordonnées</span>
            </div>

            {/* ÉTAPE 1 : Choix du Service */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Choisissez une prestation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep(2);
                      }}
                      className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition">{service.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">{service.category}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-sm">
                        <span className="flex items-center gap-1 text-slate-600"><Clock size={14} /> {service.duration_minutes} min</span>
                        <span className="font-bold" style={{ color: primaryColorHex }}>{service.price} TND</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : Fusion (Professionnel + Date + Créneaux Anti-Collision dynamiques) */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Choisissez un professionnel, une date et un créneau</h2>
                
                {/* 1. Sélection de l'employé */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-600 mb-2">1. Sélectionnez l'expert</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {staffList.map((staff) => {
                      const isSelected = selectedStaff?.id === staff.id;
                      return (
                        <div
                          key={staff.id}
                          onClick={() => {
                            setSelectedStaff(staff);
                            setSelectedTime(''); // Réinitialise l'heure si l'employé change
                          }}
                          style={{
                            borderColor: isSelected ? primaryColorHex : '#e2e8f0',
                            backgroundColor: isSelected ? `${staff.color_code}10` : '#ffffff',
                          }}
                          className="border rounded-xl p-3 hover:shadow-sm transition cursor-pointer flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: staff.color_code }}>
                            {staff.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">{staff.name}</h3>
                            <p className="text-[10px] text-slate-500">Disponible</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Sélection de la date et affichage des disponibilités en temps réel */}
                {selectedStaff && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">2. Date du rendez-vous</label>
                      <input
                        type="date"
                        min={todayString}
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setSelectedTime('');
                        }}
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">3. Créneaux horaires disponibles</label>
                      {!selectedDate ? (
                        <p className="text-xs text-slate-400 italic">Veuillez d'abord sélectionner une date.</p>
                      ) : loadingSlots ? (
                        <p className="text-xs text-slate-500 animate-pulse">Chargement des disponibilités...</p>
                      ) : (
                        (() => {
                          const serviceDuration = selectedService?.duration_minutes || 30;
                          const closeHour = parseInt(business.working_hours?.end ? business.working_hours.end.split(':')[0] : '18', 10);
                          const closeMinutes = closeHour * 60;

                          // Filtrage strict : exclut tout créneau qui chevauche une réservation existante ou dépasse l'heure de fermeture
                          const availableSlots = timeSlots.filter((time) => {
                            const [h, m] = time.split(':').map(Number);
                            const slotStartMins = h * 60 + m;
                            const slotEndMins = slotStartMins + serviceDuration;

                            // Vérifie si le service dépasse l'heure de fermeture
                            if (slotEndMins > closeMinutes) return false;

                            // Vérifie la collision avec chaque réservation existante pour cet employé
                            const hasCollision = existingBookings.some((booking) => {
                              const [bH, bM] = booking.start_time.split(':').map(Number);
                              const [eH, eM] = booking.end_time.split(':').map(Number);
                              const bStartMins = bH * 60 + bM;
                              const bEndMins = eH * 60 + eM;

                              // Condition de chevauchement d'intervalles
                              return slotStartMins < bEndMins && slotEndMins > bStartMins;
                            });

                            return !hasCollision;
                          });

                          if (availableSlots.length === 0) {
                            return <p className="text-xs text-rose-500 font-medium">Aucun créneau disponible (ou durée trop longue) pour cette date.</p>;
                          }

                          return (
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                              {availableSlots.map((time) => {
                                const isSelected = selectedTime === time;
                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => setSelectedTime(time)}
                                    style={{
                                      backgroundColor: isSelected ? primaryColorHex : '#ffffff',
                                      color: isSelected ? '#ffffff' : '#334155',
                                      borderColor: isSelected ? primaryColorHex : '#cbd5e1'
                                    }}
                                    className="py-2 text-xs font-medium rounded-lg border transition hover:bg-slate-100 shadow-2xs"
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

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:underline">← Retour aux services</button>
                  <button
                    disabled={!selectedStaff || !selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                    style={{ backgroundColor: primaryColorHex }}
                    className="text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition shadow-sm"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : Formulaire et Confirmation */}
            {step === 3 && (
              <form onSubmit={handleConfirmBooking}>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Vos informations de contact</h2>
                
                <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 text-sm space-y-1">
                  <p><strong>Service :</strong> {selectedService?.name} ({selectedService?.price} TND)</p>
                  <p><strong>Professionnel :</strong> {selectedStaff?.name}</p>
                  <p><strong>Date & Heure :</strong> {selectedDate} à {selectedTime}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nom complet</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      placeholder="Votre nom"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Numéro de téléphone (WhatsApp)</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                      placeholder="+216 XX XXX XXX"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail (Optionnel)</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mode de règlement</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none"
                    >
                      <option value="onsite">Paiement sur place (Espèces / Carte)</option>
                      <option value="deposit">Acompte en ligne sécurisé (30%)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setStep(2)} className="text-sm text-slate-500 hover:underline">← Retour</button>
                  <button 
                    type="submit" 
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-sm"
                  >
                    Confirmer le rendez-vous
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Chargement du portail...</div>}>
      <BookingPortalContent />
    </Suspense>
  );
}