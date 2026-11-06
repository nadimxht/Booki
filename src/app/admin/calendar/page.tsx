"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Calendar as CalendarIcon, X } from "lucide-react";

interface Employee { id: string; name: string; color: string; }
interface Service { id: string; name: string; duration_minutes: number; price: number; }
interface Booking {
  id: string;
  client_name: string;
  client_whatsapp: string;
  service_id: string;
  employee_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "still" | "ongoing" | "done" | "canceled";
  is_walk_in: boolean;
  services?: { name: string; duration_minutes: number; price: number };
  employees?: { name: string; color: string };
}

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export default function AdminCalendarPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [newWalkIn, setNewWalkIn] = useState({
    client_name: "",
    client_whatsapp: "",
    service_id: "",
    employee_id: "",
    start_time: "10:00",
  });

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
    fetchMetaData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchBookings();
    }
  }, [selectedDate]);

  async function fetchMetaData() {
    const { data: empData } = await supabase.from("employees").select("*");
    if (empData) setEmployees(empData);

    const { data: sData } = await supabase.from("services").select("*");
    if (sData) setServices(sData);
  }

  async function fetchBookings() {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name, duration_minutes, price), employees(name, color)")
      .eq("booking_date", selectedDate);

    if (error) {
      console.error("Erreur chargement réservations:", error.message);
    } else if (data) {
      const fetchedBookings = data as Booking[];
      setBookings(fetchedBookings);

      // Synchronisation automatique : Si l'heure de fin est dépassée, 
      // mettre à jour le statut dans la base de données Supabase à "done"
      const now = new Date();
      let hasUpdates = false;

      for (const booking of fetchedBookings) {
        if (booking.status !== "done" && booking.status !== "canceled") {
          const [endH, endM] = booking.end_time.split(":").map(Number);
          const endDateTime = new Date(`${booking.booking_date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);

          if (now > endDateTime) {
            // Mise à jour effective en base de données
            const { error: updateErr } = await supabase
              .from("bookings")
              .update({ status: "done" })
              .eq("id", booking.id);

            if (!updateErr) {
              hasUpdates = true;
            }
          }
        }
      }

      // Recharger les réservations si des mises à jour ont eu lieu pour refléter le nouveau statut "done"
      if (hasUpdates) {
        const { data: refreshedData } = await supabase
          .from("bookings")
          .select("*, services(name, duration_minutes, price), employees(name, color)")
          .eq("booking_date", selectedDate);

        if (refreshedData) {
          setBookings(refreshedData as Booking[]);
        }
      }
    }
  }

  function getEffectiveStatus(booking: Booking): Booking["status"] {
    if (booking.status === "canceled") return "canceled";
    if (booking.status === "done") return "done";

    const now = new Date();
    const [startH, startM] = booking.start_time.split(":").map(Number);
    const [endH, endM] = booking.end_time.split(":").map(Number);

    const startDateTime = new Date(`${booking.booking_date}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    const endDateTime = new Date(`${booking.booking_date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);

    if (now > endDateTime) {
      return "done";
    } else if (now >= startDateTime && now <= endDateTime) {
      return "ongoing";
    } else {
      return "still";
    }
  }

  async function handleCreateWalkIn(e: React.FormEvent) {
    e.preventDefault();
    const service = services.find(s => s.id === newWalkIn.service_id);
    const duration = service ? service.duration_minutes : 30;

    const [h, m] = newWalkIn.start_time.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + duration;
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const formattedEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const { error } = await supabase.from("bookings").insert([{
      client_name: newWalkIn.client_name,
      client_whatsapp: newWalkIn.client_whatsapp || "N/A",
      service_id: newWalkIn.service_id,
      employee_id: newWalkIn.employee_id || null,
      booking_date: selectedDate,
      start_time: newWalkIn.start_time,
      end_time: formattedEndTime,
      status: "still",
      is_walk_in: true
    }]);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setIsWalkInModalOpen(false);
      setNewWalkIn({ client_name: "", client_whatsapp: "", service_id: "", employee_id: "", start_time: "10:00" });
      fetchBookings();
    }
  }

  async function updateStatusToCanceled(id: string) {
    await supabase.from("bookings").update({ status: "canceled" }).eq("id", id);
    setIsDetailModalOpen(false);
    fetchBookings();
  }

  const displayedEmployees = filterEmployee === "all" 
    ? employees 
    : employees.filter(e => e.id === filterEmployee);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Barre de Contrôle Supérieure */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarIcon size={18} />
          </div>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="all">Tous les membres ({employees.length})</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm flex items-center gap-2 transition"
          >
            <Plus size={16} /> Ajouter Walk-in
          </button>
        </div>
      </div>

      {/* Grille Calendrier */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid border-b border-slate-100 bg-slate-50/70" style={{ gridTemplateColumns: `80px repeat(${displayedEmployees.length || 1}, minmax(0, 1fr))` }}>
            <div className="p-3 text-center text-[10px] font-black text-slate-400 uppercase border-r border-slate-100">Heure</div>
            {displayedEmployees.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">Aucun employé disponible</div>
            ) : (
              displayedEmployees.map(emp => (
                <div key={emp.id} className="p-3 text-center border-r border-slate-100 flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: emp.color }} />
                  <span className="font-bold text-xs text-slate-800">{emp.name}</span>
                </div>
              ))
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {HOURS.map(hour => (
              <div key={hour} className="grid min-h-[70px]" style={{ gridTemplateColumns: `80px repeat(${displayedEmployees.length || 1}, minmax(0, 1fr))` }}>
                <div className="p-2 text-center text-[11px] font-bold text-slate-400 border-r border-slate-100 flex items-start justify-center pt-3">
                  {hour}
                </div>

                {displayedEmployees.map(emp => {
                  const hourBookings = bookings.filter(b => 
                    b.employee_id === emp.id && b.start_time.startsWith(hour.substring(0, 2))
                  );

                  return (
                    <div 
                      key={emp.id} 
                      onClick={() => {
                        setNewWalkIn({ ...newWalkIn, employee_id: emp.id, start_time: hour });
                        setIsWalkInModalOpen(true);
                      }}
                      className="border-r border-slate-100 p-1.5 relative hover:bg-slate-50/50 cursor-pointer transition flex flex-col gap-1.5"
                    >
                      {hourBookings.map(booking => {
                        const currentStatus = getEffectiveStatus(booking);
                        return (
                          <div
                            key={booking.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-2.5 rounded-xl shadow-2xs border text-left transition hover:scale-[1.01]"
                            style={{
                              borderLeftWidth: "5px",
                              borderLeftColor: emp.color,
                              backgroundColor: currentStatus === 'done' ? '#f0fdf4' : currentStatus === 'canceled' ? '#fff1f2' : currentStatus === 'ongoing' ? '#eff6ff' : '#f8fafc'
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-slate-900 truncate">{booking.client_name}</span>
                              {booking.is_walk_in && (
                                <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-md">WI</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{booking.services?.name || "Service"}</p>
                            <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-200/50 text-[9px] text-slate-400 font-medium">
                              <span>{booking.start_time} - {booking.end_time}</span>
                              <span className={`uppercase font-bold ${currentStatus === 'done' ? 'text-emerald-600' : currentStatus === 'ongoing' ? 'text-blue-600' : currentStatus === 'canceled' ? 'text-rose-600' : 'text-slate-600'}`}>
                                {currentStatus}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal d'Ajout Walk-in */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Ajouter une Réservation / Walk-in</h3>
              <button onClick={() => setIsWalkInModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nom du Client</label>
                <input 
                  type="text" 
                  placeholder="ex: Mohamed Ali" 
                  value={newWalkIn.client_name}
                  onChange={(e) => setNewWalkIn({ ...newWalkIn, client_name: e.target.value })}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 focus:outline-none"
                  required 
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Numéro WhatsApp</label>
                <input 
                  type="text" 
                  placeholder="ex: +216 20 000 000" 
                  value={newWalkIn.client_whatsapp}
                  onChange={(e) => setNewWalkIn({ ...newWalkIn, client_whatsapp: e.target.value })}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Service</label>
                <select
                  value={newWalkIn.service_id}
                  onChange={(e) => setNewWalkIn({ ...newWalkIn, service_id: e.target.value })}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 focus:outline-none"
                  required
                >
                  <option value="">Sélectionner un service</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min - {s.price} TND)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Employé Assigné</label>
                  <select
                    value={newWalkIn.employee_id}
                    onChange={(e) => setNewWalkIn({ ...newWalkIn, employee_id: e.target.value })}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 focus:outline-none"
                  >
                    <option value="">Aucun</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Heure de début</label>
                  <input 
                    type="time" 
                    value={newWalkIn.start_time}
                    onChange={(e) => setNewWalkIn({ ...newWalkIn, start_time: e.target.value })}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 focus:outline-none"
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition mt-2">
                Enregistrer la réservation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Détails / Annulation Admin */}
      {isDetailModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Détails du Rendez-vous</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl">
              <p><strong>Client :</strong> {selectedBooking.client_name}</p>
              <p><strong>WhatsApp :</strong> {selectedBooking.client_whatsapp}</p>
              <p><strong>Service :</strong> {selectedBooking.services?.name}</p>
              <p><strong>Horaire :</strong> {selectedBooking.start_time} - {selectedBooking.end_time}</p>
              <p><strong>Statut actuel :</strong> <span className="uppercase font-bold text-indigo-600">{getEffectiveStatus(selectedBooking)}</span></p>
            </div>

            {selectedBooking.status !== "canceled" && (
              <button
                onClick={() => updateStatusToCanceled(selectedBooking.id)}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200"
              >
                Marquer comme Annulé (Canceled)
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}