"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ShoppingBag, ShoppingCart, Plus, Minus, X, CheckCircle, 
  Store, Phone, User, CreditCard, Sparkles, AlertCircle, Search, Filter, Ticket 
} from "lucide-react";

interface StoreProduct {
  id: string;
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

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [design, setDesign] = useState<StoreDesign>({
    banner_url: "",
    welcome_title: "Bienvenue sur notre boutique",
    welcome_subtitle: "Découvrez nos produits de soins professionnels",
    primary_color: "#4f46e5",
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
  const [trackingCode, setTrackingCode] = useState("");
const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
const [trackingLoading, setTrackingLoading] = useState(false);
const [trackingError, setTrackingError] = useState<string | null>(null);

// Fonction pour rechercher et suivre une commande
async function handleTrackOrder(e: React.FormEvent) {
  e.preventDefault();
  if (!trackingCode.trim()) return;
  setTrackingLoading(true);
  setTrackingError(null);
  setTrackedOrder(null);

  const { data, error } = await supabase
    .from("store_sales")
    .select("*")
    .eq("pickup_code", trackingCode.trim().toUpperCase())
    .single();

  setTrackingLoading(false);
  if (error || !data) {
    setTrackingError("Aucune commande trouvée avec ce code. Vérifiez votre code de retrait.");
  } else {
    setTrackedOrder(data);
  }
}

// Fonction pour annuler sa commande (uniquement si en statut 'pending')
async function handleClientCancelOrder(orderId: string) {
  if (!confirm("Voulez-vous vraiment annuler cette commande ?")) return;

  const { error } = await supabase
    .from("store_sales")
    .update({ status: "canceled" })
    .eq("id", orderId);

  if (error) {
    alert("Erreur lors de l'annulation : " + error.message);
  } else {
    alert("Votre commande a été annulée avec succès.");
    setTrackedOrder((prev: any) => prev ? { ...prev, status: "canceled" } : null);
  }
}
  useEffect(() => {
    fetchStoreData();
  }, []);

  async function fetchStoreData() {
    setLoading(true);
    const [prodRes, designRes] = await Promise.all([
      supabase.from("store_products").select("*").gt("stock", 0).order("name"),
      supabase.from("store_settings").select("*").eq("id", 1).single()
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (designRes.data) {
      setDesign({
        banner_url: designRes.data.banner_url || "",
        welcome_title: designRes.data.welcome_title || "Bienvenue sur notre boutique",
        welcome_subtitle: designRes.data.welcome_subtitle || "Découvrez nos produits professionnels",
        primary_color: designRes.data.primary_color || "#4f46e5",
        layout_style: designRes.data.layout_style || "grid"
      });
    }
    setLoading(false);
  }

  // Extraire les catégories uniques pour les filtres
  const categories = ["Tous", ...Array.from(new Set(products.map((p) => p.category || "Général")))];

  // Produits filtrés
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "Tous" || (p.category || "Général") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Gestion du Panier
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

  // Validation de la commande (Click & Collect en attente)
  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const invoiceNumber = `FAC-${Math.floor(100000 + Math.random() * 900000)}`;
      // Génération d'un code de retrait unique à 4 chiffres/lettres (ex: C-8392)
      const pickupCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const orderItems = cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price
      }));

      // Insertion dans store_sales avec statut "pending" (en attente de paiement au salon)
      // Note: On ne déduit PAS le stock maintenant, il sera déduit quand l'admin validera le paiement.
      const { error: saleError } = await supabase.from("store_sales").insert([
        {
          invoice_number: invoiceNumber,
          pickup_code: pickupCode,
          client_name: clientName,
          client_phone: clientPhone,
          total_amount: totalCartAmount,
          payment_method: paymentMethod,
          status: "pending", // En attente de paiement en boutique
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
    return <div className="flex justify-center items-center min-h-screen text-xs text-slate-400 font-medium">Chargement de la boutique...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      
      {/* En-tête / Bannière Luxe */}
      <div className="relative bg-slate-900 text-white overflow-hidden shadow-md">
        {design.banner_url ? (
          <div className="absolute inset-0 opacity-45">
            <img src={design.banner_url} alt="Bannière Store" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-indigo-500 to-purple-600" />
        )}
        
        <div className="relative max-w-6xl mx-auto px-6 py-24 flex flex-col items-center text-center space-y-4">
          <span className="bg-white/10 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 border border-white/20 shadow-sm">
            <Store size={12} /> Boutique Officielle • Click & Collect
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{design.welcome_title}</h1>
          <p className="text-xs md:text-sm text-slate-200 max-w-xl font-medium leading-relaxed">{design.welcome_subtitle}</p>
        </div>
      </div>

      {/* Corps Principal & Filtres UX */}
      <main className="max-w-6xl mx-auto px-6 mt-10 space-y-8">
        
        {/* Barre de Recherche et Filtres par Catégorie */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                style={selectedCategory === cat ? { backgroundColor: design.primary_color } : {}}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? "text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs max-w-xl mx-auto space-y-4">
  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
    <Ticket size={16} className="text-indigo-600" /> Suivre ou annuler ma commande en attente
  </h3>
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
      style={{ backgroundColor: design.primary_color }}
      className="text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
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
          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-2 rounded-xl font-bold transition border border-rose-200"
        >
          Annuler ma commande
        </button>
      )}
    </div>
  )}
</div>

        {/* Bouton Panier Flottant */}
        <div className="sticky top-14 z-40 max-w-6xl mx-auto flex justify-end">
          <button
            onClick={() => setIsCartOpen(true)}
            style={{ backgroundColor: design.primary_color }}
            className="text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 hover:opacity-95 transition hover:scale-105"
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
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
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
                    style={{ backgroundColor: design.primary_color }}
                    className="text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition flex items-center gap-1.5 active:scale-95"
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
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
                  <X size={18} />
                </button>
              </div>

              {orderSuccess ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 text-center space-y-4 my-auto">
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Commande Réservée !</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Votre commande est mise en attente au salon. Voici votre code de retrait unique à présenter à l'accueil lors de votre paiement :
                  </p>
                  
                  {/* Affichage en gros du Code de Retrait */}
                  <div className="bg-white border-2 border-dashed border-indigo-300 p-4 rounded-2xl flex items-center justify-center gap-3 shadow-inner">
                    <Ticket className="text-indigo-600" size={24} />
                    <span className="text-2xl font-black text-indigo-700 tracking-wider font-mono">{generatedPickupCode}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Un reçu a été enregistré. Le paiement et la remise des articles s'effectueront directement sur place.
                  </p>

                  <button
                    onClick={() => {
                      setOrderSuccess(false);
                      setIsCartOpen(false);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-xs font-bold shadow-sm transition"
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
                            <span className="text-[11px] text-indigo-600 font-bold">{item.price} TND</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
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
                  <span className="text-base font-black text-indigo-600">{totalCartAmount.toFixed(2)} TND</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: design.primary_color }}
                  className="w-full text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? "Génération du code..." : "Réserver au Salon (Click & Collect)"}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default function PublicStorePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-xs text-slate-400 font-medium">Chargement...</div>}>
      <StoreContent />
    </Suspense>
  );
}