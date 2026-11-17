"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ShoppingBag, ShoppingCart, Plus, Minus, X, CheckCircle, 
  Store, Phone, User, CreditCard, Sparkles, AlertCircle, Search, Filter, Ticket, MapPin, ExternalLink, Scissors 
} from "lucide-react";

interface BusinessSettings {
  business_id: string;
  name: string;
  slug: string;
  description?: string;
  booking_title?: string;
  booking_subtitle?: string;
  location?: string;
  maps_url?: string;
  whatsapp_number?: string;
  hero_image_url?: string;
  store_image?: string;
  color_palette?: string; // Désormais unifié dans business_settings
}

interface StoreProduct {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
}

interface StoreDesign {
  banner_url: string;
  welcome_title: string;
  welcome_subtitle: string;
  primary_color: string;
  layout_style: string;
}

interface CartItem extends StoreProduct {
  quantity: number;
}

function StoreContent() {
  const supabase = createClient();
  const params = useParams();
  const slug = params?.slug as string;

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [design, setDesign] = useState<StoreDesign>({
    banner_url: "",
    welcome_title: "Boutique en ligne",
    welcome_subtitle: "Découvrez nos produits professionnels",
    primary_color: "#2563EB",
    layout_style: "grid"
  });
  const [loading, setLoading] = useState(true);

  // Filtrage et Recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");

  // Panier & Commande State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Espèces");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [generatedPickupCode, setGeneratedPickupCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Suivi de commande
  const [showTrackingInput, setShowTrackingInput] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    async function initStore() {
      if (!slug) return;
      setLoading(true);

      // 1. Récupération alignée sur la table unifiée "business_settings"
      let { data: settingsData, error: settingsError } = await supabase
        .from('business_settings')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!settingsData) {
        const { data: bizData } = await supabase
          .from('businesses')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (bizData) {
          const { data: linkedSettings } = await supabase
            .from('business_settings')
            .select('*')
            .eq('business_id', bizData.id)
            .maybeSingle();

          settingsData = {
            ...bizData,
            ...(linkedSettings || {}),
            business_id: bizData.id,
            name: linkedSettings?.name || bizData.name,
            slug: bizData.slug,
          };
        }
      }

      if (!settingsData) {
        setLoading(false);
        return;
      }

      setSettings(settingsData);
      const bizId = settingsData.business_id;

      // 2. Récupérer les produits et réglages de design de la boutique
      const [prodRes, designRes] = await Promise.all([
        supabase.from("store_products").select("*").eq("business_id", bizId).gt("stock", 0).order("name"),
        supabase.from("store_settings").select("*").eq("business_id", bizId).maybeSingle()
      ]);

      if (prodRes.data) setProducts(prodRes.data);

      setDesign({
        banner_url: designRes.data?.banner_url || settingsData.hero_image_url || "",
        welcome_title: designRes.data?.welcome_title || `Boutique - ${settingsData.name}`,
        welcome_subtitle: designRes.data?.welcome_subtitle || settingsData.description || "Découvrez nos produits de soins professionnels",
        primary_color: designRes.data?.primary_color || settingsData.color_palette || "#2563EB",
        layout_style: designRes.data?.layout_style || "grid"
      });

      setLoading(false);
    }

    initStore();
  }, [slug, supabase]);

  // Fonction pour rechercher et suivre une commande
  async function handleTrackOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingCode.trim() || !settings) return;
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackedOrder(null);

    const { data, error } = await supabase
      .from("store_sales")
      .select("*")
      .eq("business_id", settings.business_id)
      .eq("pickup_code", trackingCode.trim().toUpperCase())
      .single();

    setTrackingLoading(false);
    if (error || !data) {
      setTrackingError("Aucune commande trouvée avec ce code. Vérifiez votre code de retrait.");
    } else {
      setTrackedOrder(data);
    }
  }

  // Fonction pour annuler sa commande
  async function handleClientCancelOrder(orderId: string) {
    if (!settings) return;
    if (!confirm("Voulez-vous vraiment annuler cette commande ?")) return;

    const { error } = await supabase
      .from("store_sales")
      .update({ status: "canceled" })
      .eq("id", orderId)
      .eq("business_id", settings.business_id);

    if (error) {
      alert("Erreur lors de l'annulation : " + error.message);
    } else {
      alert("Votre commande a été annulée avec succès.");
      setTrackedOrder((prev: any) => prev ? { ...prev, status: "canceled" } : null);
    }
  }

  const categories = ["Tous", ...Array.from(new Set(products.map((p) => p.category || "Général")))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "Tous" || (p.category || "Général") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: StoreProduct) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert("Stock maximum atteint pour ce produit.");
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stock) {
            alert("Stock insuffisant.");
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const totalCartAmount = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const totalCartItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0 || !settings) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const invoiceNumber = `FAC-${Math.floor(100000 + Math.random() * 900000)}`;
      const pickupCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const orderItems = cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price
      }));

      const { error: saleError } = await supabase.from("store_sales").insert([
        {
          business_id: settings.business_id,
          invoice_number: invoiceNumber,
          pickup_code: pickupCode,
          client_name: clientName,
          client_phone: clientPhone,
          total_amount: totalCartAmount,
          payment_method: paymentMethod,
          status: "pending",
          items: orderItems
        }
      ]);

      if (saleError) throw new Error(saleError.message);

      setGeneratedPickupCode(pickupCode);
      setOrderSuccess(true);
      setCart([]);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la validation de la commande.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" /> Chargement de la boutique...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800 font-bold text-sm">
        Boutique introuvable. Veuillez vérifier l'adresse URL.
      </div>
    );
  }

  // Couleur principale unifiée lue depuis business_settings (ou design store)
  const primaryColor = design.primary_color || settings.color_palette || '#2563EB';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-20">
      
      {/* =====================================================================
          HERO HEADER (Harmonisé avec book/[slug])
      ====================================================================== */}
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
                <Sparkles size={11} /> Boutique Officielle
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">{settings.name}</h1>
              <p className="text-xs sm:text-sm text-white/90 max-w-xl font-normal leading-relaxed">
                {design.welcome_subtitle || settings.description || "Retrouvez tous nos produits professionnels de soin et de beauté."}
              </p>

              <div className="flex items-center gap-3 text-xs text-white/95 font-medium pt-1 flex-wrap">
                {settings.location && (
                  <span className="flex items-center gap-1.5 bg-white/15 px-3.5 py-1.5 rounded-xl backdrop-blur-md border border-white/20">
                    <MapPin size={13} className="text-white" /> {settings.location}
                  </span>
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

      {/* Corps Principal & Filtres UX */}
      <main className="max-w-6xl mx-auto px-6 mt-10 space-y-8">
        
        {/* Barre de Recherche et Filtres par Catégorie */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs">
          <div className="relative w-full md:w-70">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
         

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                style={selectedCategory === cat ? { backgroundColor: primaryColor } : {}}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
           <div className="relative w-70 md:w-80"> 
            <div className="max-w-xl mx-auto">
          {!showTrackingInput ? (
            <button
              onClick={() => setShowTrackingInput(true)}
              style={{ borderColor: primaryColor, color: primaryColor }}
              className="w-full bg-white border-2 border-dashed py-3.5 px-6 rounded-3xl text-xs font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Ticket size={16} /> Suivre votre commande existante
            </button>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Ticket size={16} style={{ color: primaryColor }} /> Suivre ou annuler ma commande
                </h3>
                <button 
                  onClick={() => {
                    setShowTrackingInput(false);
                    setTrackedOrder(null);
                    setTrackingError(null);
                    setTrackingCode("");
                  }} 
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <form onSubmit={handleTrackOrder} className="flex gap-2">
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Entrez votre code (ex: BK-8492)"
                  className="flex-1 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase font-bold focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={trackingLoading}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {trackingLoading ? "Recherche..." : "Vérifier"}
                </button>
              </form>

              {trackingError && <p className="text-xs text-rose-600 font-medium">{trackingError}</p>}

              {trackedOrder && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Client : {trackedOrder.client_name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-black uppercase text-[9px] ${
                      trackedOrder.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      trackedOrder.status === 'canceled' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {trackedOrder.status === 'paid' ? 'Payé & Retiré' : trackedOrder.status === 'canceled' ? 'Annulé' : 'En attente au salon'}
                    </span>
                  </div>
                  <p className="text-slate-500">Montant total : <strong className="text-slate-900">{trackedOrder.total_amount} TND</strong></p>
                  
                  {trackedOrder.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleClientCancelOrder(trackedOrder.id)}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-2 rounded-xl font-bold transition border border-rose-200 cursor-pointer"
                    >
                      Annuler ma commande
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
          </div>
        </div>

        {/* Suivi de commande */}
       

        {/* Panier Flottant */}
        <div className="sticky top-14 z-40 max-w-6xl mx-auto flex justify-end">
          <button
            onClick={() => setIsCartOpen(true)}
            style={{ backgroundColor: primaryColor }}
            className="text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 hover:opacity-95 transition hover:scale-105 cursor-pointer"
          >
            <ShoppingCart size={16} /> Panier ({totalCartItemsCount})
          </button>
        </div>

        {/* Grille de Produits */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center text-slate-400 text-xs shadow-2xs space-y-2">
            <ShoppingBag size={32} className="mx-auto text-slate-300" />
            <p>Aucun produit ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            design.layout_style === "list" 
              ? "grid-cols-1" 
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {filteredProducts.map((prod) => (
              <div key={prod.id} className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition">
                <div>
                  {prod.image_url ? (
                    <div className="h-52 w-full overflow-hidden bg-slate-100 relative">
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      {prod.stock <= 3 && (
                        <span className="absolute top-3 right-3 bg-rose-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                          Derniers articles
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-40 bg-slate-100 flex items-center justify-center text-slate-400">
                      <ShoppingBag size={32} />
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {prod.category || "Général"}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{prod.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{prod.description || "Pas de description."}</p>
                  </div>
                </div>

                <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">En stock ({prod.stock})</span>
                    <span className="font-extrabold text-slate-900 text-sm">{prod.price} TND</span>
                  </div>

                  <button
                    onClick={() => addToCart(prod)}
                    style={{ backgroundColor: primaryColor }}
                    className="text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    Ajouter <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- TIROIR DU PANIER / CHECKOUT --- */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ShoppingCart size={18} /> Votre Panier
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {orderSuccess ? (
                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 text-center space-y-4 my-auto">
                  <div className="w-16 h-16 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20" style={{ backgroundColor: primaryColor }}>
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Commande Réservée !</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Votre commande est mise en attente au salon. Voici votre code de retrait unique à présenter à l'accueil lors de votre paiement :
                  </p>
                  
                  <div className="bg-white border-2 border-dashed p-4 rounded-2xl flex items-center justify-center gap-3 shadow-inner" style={{ borderColor: `${primaryColor}66` }}>
                    <Ticket size={24} style={{ color: primaryColor }} />
                    <span className="text-2xl font-black tracking-wider font-mono" style={{ color: primaryColor }}>{generatedPickupCode}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Un reçu a été enregistré. Le paiement et la remise des articles s'effectueront directement sur place.
                  </p>

                  <button
                    onClick={() => {
                      setOrderSuccess(false);
                      setIsCartOpen(false);
                    }}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full text-white py-3 rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    Terminer
                  </button>
                </div>
              ) : (
                <>
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">Votre panier est vide.</div>
                  ) : (
                    <div className="space-y-4 divide-y divide-slate-100">
                      {cart.map((item) => (
                        <div key={item.id} className="pt-4 first:pt-0 flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                            <span className="text-[11px] font-bold" style={{ color: primaryColor }}>{item.price} TND</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer">
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {!orderSuccess && cart.length > 0 && (
              <form onSubmit={handleCheckout} className="space-y-4 pt-6 border-t border-slate-100 mt-6">
                {errorMessage && (
                  <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertCircle size={16} /> {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom complet</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ex: Amine Ben Ali"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="ex: +216..."
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
                    required
                  />
                </div>

                <div className="flex justify-between items-center py-2 text-xs font-bold text-slate-800">
                  <span>Total estimé :</span>
                  <span className="text-base font-black" style={{ color: primaryColor }}>{totalCartAmount.toFixed(2)} TND</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Génération du code..." : "Réserver au Salon (Click & Collect)"}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="mt-20 text-center text-xs text-slate-400 space-y-1">
        <p className="font-bold text-slate-600">Propulsé par Booki<span style={{ color: primaryColor }}>.tn</span></p>
        <p className="text-[11px]">Boutique en ligne et catalogue pour salons en Tunisie.</p>
      </footer>

    </div>
  );
}

export default function PublicStorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" /> Chargement de la boutique...
        </div>
      </div>
    }>
      <StoreContent />
    </Suspense>
  );
}