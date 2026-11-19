"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Scissors,
  Package,
  Plus,
  Trash2,
  Edit,
  Clock,
  AlertTriangle,
  X,
  Layers,
  TrendingDown,
  RefreshCw,
  Search,
  Copy,
  MessageSquare,
} from "lucide-react";

interface InventoryItem {
  id: string;
  business_id: string;
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
  business_id: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  price: number;
  inventory_requirements: ServiceRequirement[] | string;
}

const PRESET_CATEGORIES = [
  "Coiffure",
  "Barbe",
  "Soins Capillaires",
  "Soins Visage",
  "Onglerie",
  "Épilation",
  "Massage / Spa",
  "Tattoo",
  "Soin / Prestation",
];

function getTunisTodayStr(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value || "2026";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

function parseRequirements(
  reqs: ServiceRequirement[] | string | null | undefined
): ServiceRequirement[] {
  if (!reqs) return [];
  if (typeof reqs === "string") {
    try {
      const parsed = JSON.parse(reqs);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(reqs) ? reqs : [];
}

export default function AdminServicesAndInventoryPage() {
  const supabase = createClient();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"services" | "inventory">("services");

  const [services, setServices] = useState<Service[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [inventorySearch, setInventorySearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedItemToRestock, setSelectedItemToRestock] =
    useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockCost, setRestockCost] = useState("");

  // Service Form
  const [sName, setSName] = useState("");
  const [sCategory, setSCategory] = useState("Soin / Prestation");
  const [sDescription, setSDescription] = useState("");
  const [sDuration, setSDuration] = useState("30");
  const [sPrice, setSPrice] = useState("");
  const [sRequirements, setSRequirements] = useState<ServiceRequirement[]>([]);

  // Inventory Form
  const [iName, setIName] = useState("");
  const [iQuantity, setIQuantity] = useState("");
  const [iUnit, setIUnit] = useState("unités");
  const [iMinAlert, setIMinAlert] = useState("5");
  const [iPrice, setIPrice] = useState("");
  const [iSupplierPhone, setISupplierPhone] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initBusinessAndData();
  }, []);

  async function initBusinessAndData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      setLoading(false);
      return;
    }

    const bizId = profile.business_id;
    setBusinessId(bizId);
    await fetchData(bizId, false);
  }

  async function fetchData(bizId: string, isManualRefresh = false) {
    if (isManualRefresh) setRefreshing(true);

    const [srvRes, invRes] = await Promise.all([
      supabase.from("services").select("*").eq("business_id", bizId).order("name"),
      supabase.from("inventory").select("*").eq("business_id", bizId).order("name"),
    ]);

    if (srvRes.data) setServices(srvRes.data);
    if (invRes.data) setInventory(invRes.data);

    setLoading(false);
    setRefreshing(false);
    if (isManualRefresh) {
      toast.success("Services et inventaire actualisés.");
    }
  }

  const inventoryMap = useMemo(
    () => new Map(inventory.map((i) => [i.id, i])),
    [inventory]
  );

  const serviceCategories = useMemo(() => {
    const cats = Array.from(
      new Set(services.map((s) => (s.category || "Général").trim()).filter(Boolean))
    );
    return ["Tous", ...cats];
  }, [services]);

  const allCategorySuggestions = useMemo(() => {
    return Array.from(
      new Set([
        ...PRESET_CATEGORIES,
        ...services.map((s) => (s.category || "").trim()).filter(Boolean),
      ])
    );
  }, [services]);

  const lowStockCount = useMemo(
    () => inventory.filter((i) => Number(i.quantity) <= Number(i.min_alert)).length,
    [inventory]
  );

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return services.filter((srv) => {
      const cat = (srv.category || "Général").trim();
      const matchCat = selectedCategory === "Tous" || cat === selectedCategory;
      const matchSearch =
        !q ||
        srv.name.toLowerCase().includes(q) ||
        (srv.description && srv.description.toLowerCase().includes(q)) ||
        cat.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [services, serviceSearch, selectedCategory]);

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    return inventory.filter((item) => {
      const isLow = Number(item.quantity) <= Number(item.min_alert);
      const matchLow = !onlyLowStock || isLow;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.supplier_phone && item.supplier_phone.toLowerCase().includes(q));
      return matchLow && matchSearch;
    });
  }, [inventory, inventorySearch, onlyLowStock]);

  function computeRequirementsCost(reqs: ServiceRequirement[]): number {
    return reqs.reduce((sum, req) => {
      const item = inventoryMap.get(req.item_id);
      if (!item) return sum;
      return sum + (Number(req.amount) || 0) * (Number(item.price) || 0);
    }, 0);
  }

  // Service Modal Handlers
  const openServiceModalForCreate = () => {
    setEditingServiceId(null);
    setSName("");
    setSCategory("Soin / Prestation");
    setSDescription("");
    setSDuration("30");
    setSPrice("");
    setSRequirements([]);
    setIsServiceModalOpen(true);
  };

  const openServiceModalForEdit = (srv: Service) => {
    setEditingServiceId(srv.id);
    setSName(srv.name);
    setSCategory(srv.category || "Soin / Prestation");
    setSDescription(srv.description || "");
    setSDuration(srv.duration_minutes.toString());
    setSPrice(srv.price.toString());
    setSRequirements(parseRequirements(srv.inventory_requirements));
    setIsServiceModalOpen(true);
  };

  const openServiceModalForDuplicate = (srv: Service) => {
    setEditingServiceId(null);
    setSName(`${srv.name} (Copie)`);
    setSCategory(srv.category || "Soin / Prestation");
    setSDescription(srv.description || "");
    setSDuration(srv.duration_minutes.toString());
    setSPrice(srv.price.toString());
    setSRequirements(parseRequirements(srv.inventory_requirements).map((r) => ({ ...r })));
    setIsServiceModalOpen(true);
  };

  const handleAddRequirementRow = () => {
    const usedIds = new Set(sRequirements.map((r) => r.item_id));
    const nextAvailable = inventory.find((item) => !usedIds.has(item.id));
    if (!nextAvailable) {
      toast.info("Tous vos produits d'inventaire sont déjà associés à ce service.");
      return;
    }
    setSRequirements([...sRequirements, { item_id: nextAvailable.id, amount: 1 }]);
  };

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);

    const validReqs = sRequirements.filter(
      (r) => r.item_id && Number(r.amount) > 0
    );

    const payload = {
      business_id: businessId,
      name: sName.trim(),
      category: sCategory.trim() || "Général",
      description: sDescription.trim(),
      duration_minutes: Math.max(5, parseInt(sDuration, 10) || 30),
      price: Math.max(0, parseFloat(sPrice) || 0),
      image_url: null,
      inventory_requirements: validReqs,
    };

    let error;
    if (editingServiceId) {
      const res = await supabase
        .from("services")
        .update(payload)
        .eq("id", editingServiceId)
        .eq("business_id", businessId);
      error = res.error;
    } else {
      const res = await supabase.from("services").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement : " + error.message);
    } else {
      toast.success(editingServiceId ? "Prestation mise à jour !" : "Prestation ajoutée !");
      setIsServiceModalOpen(false);
      fetchData(businessId, false);
    }
  }

  async function handleDeleteService(id: string) {
    if (!businessId) return;
    if (!confirm("Voulez-vous vraiment supprimer ce service ?")) return;
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Prestation supprimée.");
      fetchData(businessId, false);
    }
  }

  // Inventory Modal Handlers
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
    if (!businessId) return;
    setSaving(true);

    const payload = {
      business_id: businessId,
      name: iName.trim(),
      quantity: Math.max(0, parseFloat(iQuantity) || 0),
      unit: iUnit.trim() || "unités",
      min_alert: Math.max(0, parseFloat(iMinAlert) || 0),
      price: Math.max(0, parseFloat(iPrice) || 0),
      supplier_phone: iSupplierPhone.trim(),
    };

    let error;
    if (editingInventoryId) {
      const res = await supabase
        .from("inventory")
        .update(payload)
        .eq("id", editingInventoryId)
        .eq("business_id", businessId);
      error = res.error;
    } else {
      const res = await supabase.from("inventory").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Produit enregistré !");
      setIsInventoryModalOpen(false);
      fetchData(businessId, false);
    }
  }

  async function handleDeleteInventory(id: string) {
    if (!businessId) return;
    if (!confirm("Supprimer ce produit de l'inventaire ?")) return;
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Produit supprimé.");
      fetchData(businessId, false);
    }
  }

  const openRestockModal = (item: InventoryItem) => {
    setSelectedItemToRestock(item);
    setRestockQty("");
    setRestockCost(item.price ? item.price.toString() : "0");
    setIsRestockModalOpen(true);
  };

  async function handleConfirmRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemToRestock || !businessId) return;

    const addedQty = Math.max(0, parseFloat(restockQty) || 0);
    if (addedQty <= 0) {
      toast.error("La quantité doit être supérieure à 0.");
      return;
    }

    const unitCost = Math.max(
      0,
      restockCost !== "" ? parseFloat(restockCost) || 0 : Number(selectedItemToRestock.price) || 0
    );
    const totalCost = addedQty * unitCost;
    const newTotalQty = Number(selectedItemToRestock.quantity) + addedQty;

    setSaving(true);

    try {
      const { error: invError } = await supabase
        .from("inventory")
        .update({ quantity: newTotalQty, price: unitCost })
        .eq("id", selectedItemToRestock.id)
        .eq("business_id", businessId);

      if (invError) throw invError;

      const { error: restockError } = await supabase
        .from("inventory_restocks")
        .insert([
          {
            business_id: businessId,
            inventory_id: selectedItemToRestock.id,
            item_name: selectedItemToRestock.name,
            quantity_added: addedQty,
            unit_cost: unitCost,
            total_cost: totalCost,
            restock_date: getTunisTodayStr(),
          },
        ]);

      if (restockError) throw restockError;

      toast.success("Stock mis à jour et dépense enregistrée !");
      setIsRestockModalOpen(false);
      fetchData(businessId, false);
    } catch (err: any) {
      toast.error("Erreur lors du restockage : " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalStockExpenses = inventory.reduce(
    (acc, curr) => acc + (Number(curr.quantity) || 0) * (Number(curr.price) || 0),
    0
  );

  const modalEstimatedCost = computeRequirementsCost(sRequirements);
  const modalPriceNum = parseFloat(sPrice) || 0;
  const modalMargin = modalPriceNum - modalEstimatedCost;

  const restockTotalPreview =
    (parseFloat(restockQty) || 0) * (parseFloat(restockCost) || 0);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-slate-200 rounded-xl" />
            <div className="h-3.5 w-80 bg-slate-200/70 rounded-lg" />
          </div>
          <div className="h-10 w-64 bg-slate-200 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 h-52" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Services &amp; Inventaire</h1>
          <p className="text-xs text-slate-500 font-medium">
            Gérez vos prestations, leur coût en consommables, vos marges et vos stocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => businessId && fetchData(businessId, true)}
            disabled={refreshing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>

          <div className="flex bg-slate-200/70 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "services"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Scissors size={14} /> Prestations ({services.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "inventory"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package size={14} /> Inventaire ({inventory.length})
              {lowStockCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                  {lowStockCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ONGLET SERVICES */}
      {activeTab === "services" && (
        <div className="space-y-5">
          {/* Barre de recherche + Catégories + CTA */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Rechercher une prestation..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={openServiceModalForCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer shrink-0"
              >
                <Plus size={16} /> Ajouter un service
              </button>
            </div>

            {serviceCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {serviceCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {services.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-3">
              <Scissors size={32} className="mx-auto text-slate-300" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Aucune prestation configurée
                </h3>
                <p className="text-xs text-slate-500">
                  Ajoutez vos prestations pour activer la réservation en ligne et le planning.
                </p>
              </div>
              <button
                type="button"
                onClick={openServiceModalForCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus size={15} /> Ajouter votre premier service
              </button>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center space-y-3">
              <p className="text-xs text-slate-400">
                Aucune prestation ne correspond à votre filtre.
              </p>
              <button
                type="button"
                onClick={() => {
                  setServiceSearch("");
                  setSelectedCategory("Tous");
                }}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((srv) => {
                const reqs = parseRequirements(srv.inventory_requirements);
                const cogs = computeRequirementsCost(reqs);
                const margin = Number(srv.price) - cogs;
                const hasLowIngredient = reqs.some((r) => {
                  const inv = inventoryMap.get(r.item_id);
                  return inv && Number(inv.quantity) <= Number(inv.min_alert);
                });

                return (
                  <div
                    key={srv.id}
                    className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden flex flex-col justify-between p-5 space-y-4 hover:shadow-md transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full truncate">
                          {srv.category || "Général"}
                        </span>
                        <span className="font-extrabold text-indigo-600 text-sm shrink-0">
                          {Number(srv.price).toFixed(2)} TND
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{srv.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {srv.description || "Aucune description."}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Produits consommés
                          </span>
                          {hasLowIngredient && (
                            <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={10} /> Stock bas
                            </span>
                          )}
                        </div>

                        {reqs.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {reqs.map((req, idx) => {
                              const invItem = inventoryMap.get(req.item_id);
                              if (!invItem) return null;
                              const isLow =
                                Number(invItem.quantity) <= Number(invItem.min_alert);
                              return (
                                <span
                                  key={idx}
                                  className={`border text-[10px] font-bold px-2 py-1 rounded-xl flex items-center gap-1 shadow-2xs ${
                                    isLow
                                      ? "bg-rose-50 border-rose-200 text-rose-700"
                                      : "bg-white border-slate-200/80 text-slate-700"
                                  }`}
                                >
                                  <Package
                                    size={10}
                                    className={isLow ? "text-rose-600" : "text-indigo-600"}
                                  />
                                  {req.amount} {invItem.unit} • {invItem.name}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic block">
                            Aucun produit lié
                          </span>
                        )}

                        {reqs.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500">
                              Coût : {cogs.toFixed(2)} TND
                            </span>
                            <span
                              className={
                                margin >= 0 ? "text-emerald-600" : "text-rose-600"
                              }
                            >
                              Marge : {margin >= 0 ? "+" : ""}
                              {margin.toFixed(2)} TND
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/40 -mx-5 -mb-5 px-5 py-3.5">
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                        <Clock size={14} /> {srv.duration_minutes} min
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openServiceModalForDuplicate(srv)}
                          className="p-2 hover:bg-white rounded-xl text-slate-500 transition shadow-2xs cursor-pointer"
                          title="Dupliquer"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openServiceModalForEdit(srv)}
                          className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-2xs cursor-pointer"
                          title="Modifier"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
                          className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ONGLET INVENTAIRE */}
      {activeTab === "inventory" && (
        <div className="space-y-5">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown size={14} /> Valeur Totale en Stock
              </span>
              <h2 className="text-3xl font-black text-white">
                {totalStockExpenses.toFixed(2)} TND
              </h2>
              <p className="text-xs text-slate-400">
                {inventory.length} produit(s) •{" "}
                <span className={lowStockCount > 0 ? "text-rose-400 font-bold" : ""}>
                  {lowStockCount} en alerte stock bas
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={openInventoryModalForCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Plus size={16} /> Nouveau Produit
            </button>
          </div>

          {/* Barre de recherche & Filtre Stock Bas */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Rechercher un produit ou fournisseur..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyLowStock((v) => !v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
                onlyLowStock
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <AlertTriangle size={14} /> Stock Bas uniquement ({lowStockCount})
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden divide-y divide-slate-100">
            {inventory.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Package size={32} className="mx-auto text-slate-300" />
                <p className="text-xs text-slate-400">
                  Aucun produit dans l&apos;inventaire.
                </p>
                <button
                  type="button"
                  onClick={openInventoryModalForCreate}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Ajouter un produit
                </button>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  Aucun produit ne correspond à votre recherche.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setInventorySearch("");
                    setOnlyLowStock(false);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              filteredInventory.map((item) => {
                const isLowStock = Number(item.quantity) <= Number(item.min_alert);
                const itemTotalValue = Number(item.quantity) * Number(item.price);
                const cleanSupplierPhone = (item.supplier_phone || "").replace(
                  /[^0-9]/g,
                  ""
                );

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                          isLowStock
                            ? "bg-rose-50 text-rose-600 animate-pulse"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        <Package size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {item.name}
                          </h4>
                          {isLowStock && (
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={11} /> Stock Bas
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>
                            Restant :{" "}
                            <strong
                              className={
                                isLowStock
                                  ? "text-rose-600 font-extrabold"
                                  : "text-slate-800 font-bold"
                              }
                            >
                              {item.quantity} {item.unit}
                            </strong>
                          </span>
                          <span className="text-slate-400">
                            (Alerte &le; {item.min_alert})
                          </span>
                          {item.supplier_phone && (
                            <span className="text-slate-400">
                              • Fourn. : {item.supplier_phone}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-left lg:text-right mr-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Coût / Valeur
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {Number(item.price).toFixed(2)} TND
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1">
                          ({itemTotalValue.toFixed(2)} TND)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cleanSupplierPhone && (
                          <a
                            href={`https://wa.me/${cleanSupplierPhone}?text=${encodeURIComponent(
                              `Bonjour 👋, nous souhaitons commander du "${item.name}" (stock restant : ${item.quantity} ${item.unit}). Merci de nous confirmer la disponibilité et le tarif.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                            title="Commander au fournisseur via WhatsApp"
                          >
                            <MessageSquare size={14} /> Commander
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => openRestockModal(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                          title="Restocker"
                        >
                          <RefreshCw size={14} /> Restocker
                        </button>
                        <button
                          type="button"
                          onClick={() => openInventoryModalForEdit(item)}
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition cursor-pointer"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInventory(item.id)}
                          className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition cursor-pointer"
                          title="Supprimer"
                        >
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

      {/* MODAL RESTOCK */}
      {isRestockModalOpen && selectedItemToRestock && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">
                Restocker : {selectedItemToRestock.name}
              </h2>
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl text-xs text-slate-600 border border-slate-100">
                Stock actuel :{" "}
                <strong className="text-slate-900">
                  {selectedItemToRestock.quantity} {selectedItemToRestock.unit}
                </strong>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Quantité à ajouter ({selectedItemToRestock.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="ex: 10"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Coût unitaire d&apos;achat (TND)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  placeholder="ex: 25.00"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>

              {restockQty && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">Coût total de l&apos;achat :</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {restockTotalPreview.toFixed(2)} TND
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SERVICE */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">
                {editingServiceId ? "Modifier le service" : "Ajouter un service"}
              </h2>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nom du service *
                </label>
                <input
                  type="text"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="ex: Shampoing & Brushing / Massage / Coupe"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    list="service-categories-list"
                    value={sCategory}
                    onChange={(e) => setSCategory(e.target.value)}
                    placeholder="ex: Coiffure / Spa"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  />
                  <datalist id="service-categories-list">
                    {allCategorySuggestions.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Prix (TND) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sPrice}
                    onChange={(e) => setSPrice(e.target.value)}
                    placeholder="ex: 40"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Durée (minutes) *
                </label>
                <input
                  type="number"
                  min="5"
                  value={sDuration}
                  onChange={(e) => setSDuration(e.target.value)}
                  placeholder="ex: 45"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={sDescription}
                  onChange={(e) => setSDescription(e.target.value)}
                  placeholder="Détails visibles par vos clients..."
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Layers size={14} className="text-indigo-600" /> Produits déduits
                  </span>
                  <button
                    type="button"
                    disabled={inventory.length === 0}
                    onClick={handleAddRequirementRow}
                    className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-indigo-200 transition cursor-pointer disabled:opacity-40"
                  >
                    + Associer un produit
                  </button>
                </div>

                {sRequirements.map((req, index) => {
                  const selectedItem = inventoryMap.get(req.item_id);
                  const otherUsedIds = new Set(
                    sRequirements
                      .filter((_, i) => i !== index)
                      .map((r) => r.item_id)
                  );

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={req.item_id}
                        onChange={(e) => {
                          const updated = [...sRequirements];
                          updated[index] = {
                            ...updated[index],
                            item_id: e.target.value,
                          };
                          setSRequirements(updated);
                        }}
                        className="flex-1 min-w-0 border border-slate-200 bg-white p-2 rounded-xl text-xs text-slate-900"
                      >
                        {inventory.map((inv) => (
                          <option
                            key={inv.id}
                            value={inv.id}
                            disabled={otherUsedIds.has(inv.id)}
                          >
                            {inv.name} ({inv.unit})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={req.amount}
                          onChange={(e) => {
                            const updated = [...sRequirements];
                            updated[index] = {
                              ...updated[index],
                              amount: Math.max(0, parseFloat(e.target.value) || 0),
                            };
                            setSRequirements(updated);
                          }}
                          placeholder="Qté"
                          className="w-20 border border-slate-200 bg-white p-2 rounded-xl text-xs text-center text-slate-900"
                        />
                        {selectedItem && (
                          <span className="text-[10px] font-bold text-slate-500 w-10 truncate">
                            {selectedItem.unit}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSRequirements(
                            sRequirements.filter((_, i) => i !== index)
                          )
                        }
                        className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl cursor-pointer shrink-0"
                        title="Retirer ce produit"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                {sRequirements.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600">
                      Coût estimé :{" "}
                      <strong className="text-slate-900">
                        {modalEstimatedCost.toFixed(2)} TND
                      </strong>
                    </span>
                    {sPrice && (
                      <span
                        className={
                          modalMargin >= 0 ? "text-emerald-600" : "text-rose-600"
                        }
                      >
                        Marge nette : {modalMargin >= 0 ? "+" : ""}
                        {modalMargin.toFixed(2)} TND
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INVENTAIRE */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">
                {editingInventoryId ? "Modifier le produit" : "Ajouter un produit"}
              </h2>
              <button
                type="button"
                onClick={() => setIsInventoryModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nom du produit *
                </label>
                <input
                  type="text"
                  value={iName}
                  onChange={(e) => setIName(e.target.value)}
                  placeholder="ex: Shampooing Pro / Encre / Huile"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Quantité en stock *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={iQuantity}
                    onChange={(e) => setIQuantity(e.target.value)}
                    placeholder="ex: 10"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Unité *
                  </label>
                  <input
                    type="text"
                    value={iUnit}
                    onChange={(e) => setIUnit(e.target.value)}
                    placeholder="ex: ml, L, flacons"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Coût unitaire (TND) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={iPrice}
                    onChange={(e) => setIPrice(e.target.value)}
                    placeholder="ex: 15.00"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Seuil d&apos;alerte *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={iMinAlert}
                    onChange={(e) => setIMinAlert(e.target.value)}
                    placeholder="ex: 2"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Téléphone Fournisseur (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={iSupplierPhone}
                  onChange={(e) => setISupplierPhone(e.target.value)}
                  placeholder="+216..."
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInventoryModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
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