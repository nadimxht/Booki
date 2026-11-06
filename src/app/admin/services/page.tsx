"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Scissors, Package, Plus, Trash2, Edit, Clock, 
  AlertTriangle, PhoneCall, X, Layers, TrendingDown, RefreshCw 
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_alert: number;
  price: number;
  supplier_phone?: string;
}

interface ServiceRequirement {
  item_id: string;
  amount: number;
}

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  price: number;
  inventory_requirements: ServiceRequirement[];
}

export default function AdminServicesAndInventoryPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"services" | "inventory">("services");
  
  const [services, setServices] = useState<Service[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);

  // Restock Modal State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedItemToRestock, setSelectedItemToRestock] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockCost, setRestockCost] = useState("");

  // Service Form State
  const [sName, setSName] = useState("");
  const [sCategory, setSCategory] = useState("Coiffure");
  const [sDescription, setSDescription] = useState("");
  const [sDuration, setSDuration] = useState("30");
  const [sPrice, setSPrice] = useState("");
  const [sRequirements, setSRequirements] = useState<ServiceRequirement[]>([]);

  // Inventory Form State
  const [iName, setIName] = useState("");
  const [iQuantity, setIQuantity] = useState("");
  const [iUnit, setIUnit] = useState("unités");
  const [iMinAlert, setIMinAlert] = useState("5");
  const [iPrice, setIPrice] = useState("");
  const [iSupplierPhone, setISupplierPhone] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [srvRes, invRes] = await Promise.all([
      supabase.from("services").select("*").order("name"),
      supabase.from("inventory").select("*").order("name")
    ]);

    if (srvRes.data) setServices(srvRes.data);
    if (invRes.data) setInventory(invRes.data);
    setLoading(false);
  }

  // --- SERVICE ACTIONS ---
  const openServiceModalForCreate = () => {
    setEditingServiceId(null);
    setSName("");
    setSCategory("Coiffure");
    setSDescription("");
    setSDuration("30");
    setSPrice("");
    setSRequirements([]);
    setIsServiceModalOpen(true);
  };

  const openServiceModalForEdit = (srv: Service) => {
    setEditingServiceId(srv.id);
    setSName(srv.name);
    setSCategory(srv.category || "Coiffure");
    setSDescription(srv.description || "");
    setSDuration(srv.duration_minutes.toString());
    setSPrice(srv.price.toString());
    
    // Gérer proprement le format JSON ou tableau des requirements
    let reqs = srv.inventory_requirements;
    if (typeof reqs === "string") {
      try { reqs = JSON.parse(reqs); } catch (e) { reqs = []; }
    }
    setSRequirements(Array.isArray(reqs) ? reqs : []);
    setIsServiceModalOpen(true);
  };

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: sName,
      category: sCategory,
      description: sDescription,
      duration_minutes: parseInt(sDuration) || 30,
      price: parseFloat(sPrice) || 0,
      image_url: null,
      inventory_requirements: sRequirements // Enregistré directement en JSONB
    };

    let error;
    if (editingServiceId) {
      const res = await supabase.from("services").update(payload).eq("id", editingServiceId);
      error = res.error;
    } else {
      const res = await supabase.from("services").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      setIsServiceModalOpen(false);
      fetchData();
    }
  }

  async function handleDeleteService(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce service ?")) return;
    await supabase.from("services").delete().eq("id", id);
    fetchData();
  }

  // --- INVENTORY ACTIONS ---
  const openInventoryModalForCreate = () => {
    setEditingInventoryId(null);
    setIName("");
    setIQuantity("");
    setIUnit("unités");
    setIMinAlert("5");
    setIPrice("");
    setISupplierPhone("");
    setIsInventoryModalOpen(true);
  };

  const openInventoryModalForEdit = (item: InventoryItem) => {
    setEditingInventoryId(item.id);
    setIName(item.name);
    setIQuantity(item.quantity.toString());
    setIUnit(item.unit || "unités");
    setIMinAlert(item.min_alert ? item.min_alert.toString() : "5");
    setIPrice(item.price ? item.price.toString() : "");
    setISupplierPhone(item.supplier_phone || "");
    setIsInventoryModalOpen(true);
  };

  async function handleSaveInventory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: iName,
      quantity: parseFloat(iQuantity) || 0,
      unit: iUnit,
      min_alert: parseFloat(iMinAlert) || 5,
      price: parseFloat(iPrice) || 0,
      supplier_phone: iSupplierPhone
    };

    let error;
    if (editingInventoryId) {
      const res = await supabase.from("inventory").update(payload).eq("id", editingInventoryId);
      error = res.error;
    } else {
      const res = await supabase.from("inventory").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setIsInventoryModalOpen(false);
      fetchData();
    }
  }

  async function handleDeleteInventory(id: string) {
    if (!confirm("Supprimer ce produit de l'inventaire ?")) return;
    await supabase.from("inventory").delete().eq("id", id);
    fetchData();
  }

  // --- RESTOCK ACTIONS ---
  const openRestockModal = (item: InventoryItem) => {
    setSelectedItemToRestock(item);
    setRestockQty("");
    setRestockCost(item.price ? item.price.toString() : "");
    setIsRestockModalOpen(true);
  };

  async function handleConfirmRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemToRestock) return;

    const addedQty = parseFloat(restockQty) || 0;
    const newTotalQty = Number(selectedItemToRestock.quantity) + addedQty;
    const newPrice = restockCost ? parseFloat(restockCost) : selectedItemToRestock.price;

    setSaving(true);
    const { error } = await supabase
      .from("inventory")
      .update({ quantity: newTotalQty, price: newPrice })
      .eq("id", selectedItemToRestock.id);

    setSaving(false);
    if (error) {
      alert("Erreur lors du restockage : " + error.message);
    } else {
      setIsRestockModalOpen(false);
      fetchData();
    }
  }

  const totalStockExpenses = inventory.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.price)), 0);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px] text-xs text-slate-400 font-medium">Chargement...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* En-tête & Onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Services & Inventaire</h1>
          <p className="text-xs text-slate-500 font-medium">
            Gérez vos prestations, leurs produits consommés et suivez vos stocks.
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("services")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "services" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scissors size={14} /> Prestations ({services.length})
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "inventory" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package size={14} /> Inventaire ({inventory.length})
          </button>
        </div>
      </div>

      {/* --- ONGLET SERVICES --- */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-900">Liste des Prestations</h2>
            <button
              onClick={openServiceModalForCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
            >
              <Plus size={16} /> Ajouter un service
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <div key={srv.id} className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden flex flex-col justify-between p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {srv.category}
                    </span>
                    <span className="font-extrabold text-indigo-600 text-sm">{srv.price} TND</span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{srv.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{srv.description || "Aucune description."}</p>
                  </div>

                  {/* Produits consommés */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Produits consommés :</span>
                    {srv.inventory_requirements && Array.isArray(srv.inventory_requirements) && srv.inventory_requirements.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {srv.inventory_requirements.map((req, idx) => {
                          const invItem = inventory.find((i) => i.id === req.item_id);
                          if (!invItem) return null;
                          return (
                            <span key={idx} className="bg-white border border-slate-200/80 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                              <Package size={10} className="text-indigo-600" />
                              {req.amount} {invItem.unit} de {invItem.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Aucun produit lié</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30 -mx-5 -mb-5 p-5">
                  <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Clock size={14} /> {srv.duration_minutes} min
                  </span>

                  <div className="flex items-center gap-1">
                    <button onClick={() => openServiceModalForEdit(srv)} className="p-2 hover:bg-white rounded-xl text-slate-500 transition shadow-2xs" title="Modifier">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteService(srv.id)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition" title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ONGLET INVENTAIRE --- */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className=" rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown size={14} /> Valeur Totale / Dépenses en Stock
              </span>
              <h2 className="text-3xl font-black text-black">{totalStockExpenses.toFixed(2)} TND</h2>
              <p className="text-xs text-slate-300">
                Basé sur {inventory.length} produit(s) enregistré(s).
              </p>
            </div>
            <button
              onClick={openInventoryModalForCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
            >
              <Plus size={16} /> Nouveau Produit
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden divide-y divide-slate-100">
            {inventory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Aucun produit dans l'inventaire.</div>
            ) : (
              inventory.map((item) => {
                const isLowStock = item.quantity <= item.min_alert;
                const itemTotalValue = Number(item.quantity) * Number(item.price);

                return (
                  <div key={item.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                        isLowStock ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-emerald-50 text-emerald-600"
                      }`}>
                        <Package size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                          {isLowStock && (
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={12} /> Stock Bas !
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Restant : <strong className={isLowStock ? "text-rose-600 font-extrabold" : "text-slate-800 font-bold"}>
                            {item.quantity} {item.unit}
                          </strong> 
                          <span className="text-slate-400 ml-2">(Alerte &le; {item.min_alert})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coût / Total</span>
                        <span className="text-xs font-bold text-slate-900">{item.price} TND</span>
                        <span className="text-[11px] text-slate-500 ml-1">({itemTotalValue.toFixed(2)} TND)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openRestockModal(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                          title="Restocker"
                        >
                          <RefreshCw size={14} /> Restocker
                        </button>
                        <button onClick={() => openInventoryModalForEdit(item)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition" title="Modifier">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteInventory(item.id)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition" title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- MODAL RESTOCK --- */}
      {isRestockModalOpen && selectedItemToRestock && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">Restocker : {selectedItemToRestock.name}</h2>
              <button onClick={() => setIsRestockModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl text-xs text-slate-600">
                Stock actuel : <strong className="text-slate-900">{selectedItemToRestock.quantity} {selectedItemToRestock.unit}</strong>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Quantité à ajouter</label>
                <input type="number" step="0.01" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} placeholder="ex: 10" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Coût unitaire d'achat (TND)</label>
                <input type="number" step="0.01" value={restockCost} onChange={(e) => setRestockCost(e.target.value)} placeholder="ex: 25.00" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsRestockModalOpen(false)} className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm">Confirmer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL SERVICE & PRODUITS LIÉS --- */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">{editingServiceId ? "Modifier le service" : "Ajouter un service"}</h2>
              <button onClick={() => setIsServiceModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom du service</label>
                <input type="text" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="ex: Shampoing & Brushing" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Catégorie</label>
                  <input type="text" value={sCategory} onChange={(e) => setSCategory(e.target.value)} placeholder="ex: Coiffure" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Prix (TND)</label>
                  <input type="number" step="0.01" value={sPrice} onChange={(e) => setSPrice(e.target.value)} placeholder="ex: 40" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Durée (minutes)</label>
                <input type="number" value={sDuration} onChange={(e) => setSDuration(e.target.value)} placeholder="ex: 45" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                <textarea rows={3} value={sDescription} onChange={(e) => setSDescription(e.target.value)} placeholder="Détails..." className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" />
              </div>

              {/* Gestion manuelle des produits déduits */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Layers size={14} className="text-indigo-600" /> Produits déduits à chaque réservation
                  </span>
                  <button
                    type="button"
                    onClick={() => setSRequirements([...sRequirements, { item_id: inventory[0]?.id || "", amount: 1 }])}
                    className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-indigo-200 transition"
                  >
                    + Associer un produit
                  </button>
                </div>

                {sRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={req.item_id}
                      onChange={(e) => {
                        const updated = [...sRequirements];
                        updated[index].item_id = e.target.value;
                        setSRequirements(updated);
                      }}
                      className="w-full border border-slate-200 bg-white p-2 rounded-xl text-xs"
                    >
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      value={req.amount}
                      onChange={(e) => {
                        const updated = [...sRequirements];
                        updated[index].amount = parseFloat(e.target.value) || 0;
                        setSRequirements(updated);
                      }}
                      placeholder="Qté"
                      className="w-24 border border-slate-200 bg-white p-2 rounded-xl text-xs text-center"
                    />

                    <button
                      type="button"
                      onClick={() => setSRequirements(sRequirements.filter((_, i) => i !== index))}
                      className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsServiceModalOpen(false)} className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm">{saving ? "Enregistrement..." : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL INVENTAIRE --- */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">{editingInventoryId ? "Modifier le produit" : "Ajouter un produit"}</h2>
              <button onClick={() => setIsInventoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom du produit</label>
                <input type="text" value={iName} onChange={(e) => setIName(e.target.value)} placeholder="ex: Shampooing Pro" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Quantité initiale</label>
                  <input type="number" step="0.01" value={iQuantity} onChange={(e) => setIQuantity(e.target.value)} placeholder="ex: 10" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Unité</label>
                  <input type="text" value={iUnit} onChange={(e) => setIUnit(e.target.value)} placeholder="ex: L, flacons" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Coût unitaire (TND)</label>
                  <input type="number" step="0.01" value={iPrice} onChange={(e) => setIPrice(e.target.value)} placeholder="ex: 15.00" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Seuil d'alerte</label>
                  <input type="number" step="0.01" value={iMinAlert} onChange={(e) => setIMinAlert(e.target.value)} placeholder="ex: 2" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Téléphone Fournisseur</label>
                <input type="tel" value={iSupplierPhone} onChange={(e) => setISupplierPhone(e.target.value)} placeholder="+216..." className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsInventoryModalOpen(false)} className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}