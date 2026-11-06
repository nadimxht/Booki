"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Trash2, Edit, DollarSign, Phone, Mail, X, Check, Palette, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  salary: number;
  color: string;
  email: string;
  phone: string;
  is_paid_this_month?: boolean;
  last_paid_month?: string;
}

const COLOR_PRESETS = [
  "#3b82f6", // Bleu
  "#10b981", // Émeraude
  "#8b5cf6", // Violet
  "#f59e0b", // Ambre
  "#e11d48", // Rose / Rouge
  "#06b6d4", // Cyan
  "#ec4899", // Rose vif
  "#64748b", // Gris ardoise
];

export default function AdminTeamPage() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState("Coiffeur / Esthéticien");
  const [salary, setSalary] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Format YYYY-MM pour le mois en cours
    const monthStr = new Date().toISOString().substring(0, 7);
    setCurrentMonth(monthStr);
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("name", { ascending: true });

    if (data) {
      setEmployees(data);
    }
    setLoading(false);
  }

  // Basculer le statut de paiement du salaire
  async function toggleSalaryStatus(emp: Employee) {
    const newPaidStatus = !(emp.last_paid_month === currentMonth && emp.is_paid_this_month);

    const { error } = await supabase
      .from("employees")
      .update({
        is_paid_this_month: newPaidStatus,
        last_paid_month: newPaidStatus ? currentMonth : null
      })
      .eq("id", emp.id);

    if (error) {
      alert("Erreur lors de la mise à jour du statut : " + error.message);
    } else {
      fetchEmployees();
    }
  }

  const openModalForCreate = () => {
    setEditingId(null);
    setName("");
    setRole("Coiffeur / Esthéticien");
    setSalary("");
    setColor("#3b82f6");
    setEmail("");
    setPhone("");
    setIsModalOpen(true);
  };

  const openModalForEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setName(emp.name);
    setRole(emp.role || "");
    setSalary(emp.salary ? emp.salary.toString() : "");
    setColor(emp.color || "#3b82f6");
    setEmail(emp.email || "");
    setPhone(emp.phone || "");
    setIsModalOpen(true);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name,
      role,
      salary: salary ? parseFloat(salary) : 0,
      color,
      email,
      phone,
    };

    let error;
    if (editingId) {
      const res = await supabase.from("employees").update(payload).eq("id", editingId);
      error = res.error;
    } else {
      const res = await supabase.from("employees").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      setIsModalOpen(false);
      fetchEmployees();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce membre de l'équipe ?")) return;

    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
    } else {
      fetchEmployees();
    }
  }

  // Calculs financiers
  const totalSalaries = employees.reduce((acc, curr) => acc + (Number(curr.salary) || 0), 0);
  const totalPaidSalaries = employees
    .filter((emp) => emp.last_paid_month === currentMonth && emp.is_paid_this_month)
    .reduce((acc, curr) => acc + (Number(curr.salary) || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] text-xs text-slate-400 font-medium">
        Chargement de l'équipe...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Gestion de l'Équipe & Salaires</h1>
          <p className="text-xs text-slate-500 font-medium">
            Gérez vos collaborateurs, leurs rôles, leurs salaires et suivez le paiement mensuel.
          </p>
        </div>
        <button
          onClick={openModalForCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition self-start sm:self-auto"
        >
          <Plus size={16} /> Ajouter un membre
        </button>
      </div>

      {/* Carte Récapitulative des Salaires du Mois */}
      <div className="rounded-3xl p-6 text-white shadow-lg grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider">Masse Salariale Totale</span>
          <h2 className="text-2xl font-black text-black">{totalSalaries.toFixed(2)} TND</h2>
          <p className="text-[11px] text-slate-400">{employees.length} membre(s) au total</p>
        </div>

        <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={12} /> Salaires Versés (Ce mois)
          </span>
          <h2 className="text-2xl font-black text-black">{totalPaidSalaries.toFixed(2)} TND</h2>
          <p className="text-[11px] text-slate-400">
            {employees.filter((emp) => emp.last_paid_month === currentMonth && emp.is_paid_this_month).length} / {employees.length} payé(s)
          </p>
        </div>

        <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} /> Reste à Verser
          </span>
          <h2 className="text-2xl font-black text-emerald-500">{(totalSalaries - totalPaidSalaries).toFixed(2)} TND</h2>
          <p className="text-[11px] text-slate-400">En attente de paiement</p>
        </div>
      </div>

      {/* Liste des Employés en Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {employees.length === 0 ? (
          <div className="col-span-2 bg-white rounded-3xl p-8 text-center border border-slate-100 text-slate-400 text-xs">
            Aucun membre d'équipe enregistré pour le moment.
          </div>
        ) : (
          employees.map((emp) => {
            const isPaid = emp.last_paid_month === currentMonth && emp.is_paid_this_month;

            return (
              <div
                key={emp.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4 flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Indicateur de couleur vertical sur le bord gauche */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-2"
                  style={{ backgroundColor: emp.color || "#3b82f6" }}
                />

                <div className="flex items-start justify-between pl-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: emp.color || "#3b82f6" }}
                    >
                      {emp.name ? emp.name.substring(0, 2).toUpperCase() : "??"}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{emp.name}</h3>
                      <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5">
                        {emp.role || "Employé(e)"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openModalForEdit(emp)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 pl-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Salaire Mensuel</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1">
                      <DollarSign size={14} className="text-emerald-600" />
                      {emp.salary ? `${emp.salary} TND` : "Non défini"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact</span>
                    <div className="text-slate-600 truncate font-medium">
                      {emp.phone ? <p className="flex items-center gap-1"><Phone size={12} /> {emp.phone}</p> : <span className="text-slate-400 italic">Pas de tel</span>}
                    </div>
                  </div>
                </div>

                {/* Statut du paiement du salaire ce mois-ci */}
                <div className="pl-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <CheckCircle2 size={14} /> Salaire Payé (ce mois)
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <AlertCircle size={14} /> Salaire Non Payé
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => toggleSalaryStatus(emp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                      isPaid
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {isPaid ? "Marquer Non Payé" : "Marquer comme Payé"}
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal Création / Édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">
                {editingId ? "Modifier le membre" : "Ajouter un membre d'équipe"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Yassine Mejri"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Rôle / Poste</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="ex: Coiffeur Senior / Manager"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Salaire (TND)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="ex: 1200"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ex: +216..."
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: yassine@booki.tn"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              {/* Sélection de la couleur */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <Palette size={14} /> Couleur sur le planning
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      style={{ backgroundColor: preset }}
                      className={`w-8 h-8 rounded-full transition flex items-center justify-center text-white ${
                        color === preset ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      {color === preset && <Check size={14} />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-full border-0 cursor-pointer p-0 overflow-hidden"
                    title="Choisir une autre couleur"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}