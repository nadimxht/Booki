"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOutAction } from "@/app/auth/actions";
import { toast } from "sonner";
import NotificationListener, { AppNotification } from "../components/NotificationListener";
import {
  LayoutDashboard,
  Calendar,
  Package,
  Settings,
  Bell,
  ShoppingBag,
  Wallet,
  Megaphone,
  Menu,
  X,
  Scissors,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  AlertTriangle,
  Trash2,
  WifiOff,
  RefreshCw,
} from "lucide-react";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [checkingConnection, setCheckingConnection] = useState(false);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [salonName, setSalonName] = useState<string | null>(null);
  const [salonSlug, setSalonSlug] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const originalFetchRef = useRef<typeof window.fetch | null>(null);
  const isOnlineRef = useRef(true);

  const handleStatusChange = useCallback(
    (online: boolean, notify = true) => {
      if (isOnlineRef.current === online) return;
      isOnlineRef.current = online;
      setIsOnline(online);

      if (!online) {
        if (notify) {
          toast.error("Connexion Internet perdue", {
            id: "network-status",
            duration: Infinity,
            description:
              "Ne fermez pas la page : vos saisies en cours sont conservées.",
          });
        }
      } else {
        if (notify) {
          toast.success("Connexion rétablie !", {
            id: "network-status",
            duration: 3500,
            description: "Vous pouvez enregistrer vos modifications.",
          });
        }
        window.dispatchEvent(new Event("booki:online-restored"));
        router.refresh();
      }
    },
    [router]
  );

  const verifyConnection = useCallback(
    async (showFeedback = false) => {
      const fetchFn = originalFetchRef.current || window.fetch;
      if (showFeedback) setCheckingConnection(true);
      try {
        const res = await fetchFn("/api/health", {
          method: "GET",
          cache: "no-store",
        });
        if (res.ok) {
          handleStatusChange(true, true);
          if (showFeedback && isOnlineRef.current) {
            toast.success("Connexion Internet active.", { id: "network-status" });
          }
        } else {
          handleStatusChange(false, true);
        }
      } catch {
        handleStatusChange(false, true);
        if (showFeedback) {
          toast.error("Toujours hors ligne. Vérifiez votre Wi-Fi ou 4G.", {
            id: "network-check",
          });
        }
      } finally {
        if (showFeedback) setCheckingConnection(false);
      }
    },
    [handleStatusChange]
  );

  useEffect(() => {
    setMounted(true);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      isOnlineRef.current = false;
      setIsOnline(false);
    }

    try {
      const savedExpand = localStorage.getItem("booki_sidebar_expanded");
      if (savedExpand === "true") setSidebarExpanded(true);
    } catch {
      // ignore storage errors
    }

    async function loadSalonIdentity() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("business_id, businesses(name)")
          .eq("id", user.id)
          .single();

        if (!profile?.business_id) return;

        const { data: settingsData } = await supabase
          .from("business_settings")
          .select("name, slug")
          .eq("business_id", profile.business_id)
          .maybeSingle();

        const resolvedName =
          settingsData?.name ||
          (profile.businesses && (profile.businesses as any).name) ||
          null;

        setSalonName(resolvedName);
        setSalonSlug(settingsData?.slug || null);
      } catch {
        // ignore if offline during mount
      }
    }

    loadSalonIdentity();

    const handleNewNotification = (event: Event) => {
      const customEvent = event as CustomEvent<AppNotification>;
      const detail = customEvent.detail;
      setNotifications((prev) => [detail, ...prev]);

      toast(detail.title, {
        description: detail.message,
      });
    };

    window.addEventListener("booki:new-notification", handleNewNotification);
    return () => {
      window.removeEventListener("booki:new-notification", handleNewNotification);
    };
  }, [supabase]);

  // Global Online / Offline Listeners + Safe Fetch Network Detection
  useEffect(() => {
    const onOffline = () => handleStatusChange(false, true);
    const onOnline = () => {
      setTimeout(() => {
        verifyConnection(false);
      }, 350);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    // Detect real network drops during any fetch (e.g. Wi-Fi connected but no internet)
    if (!originalFetchRef.current && typeof window !== "undefined") {
      const origFetch = window.fetch.bind(window);
      originalFetchRef.current = origFetch;

      window.fetch = async (...args) => {
        try {
          const response = await origFetch(...args);
          if (!isOnlineRef.current) {
            handleStatusChange(true, true);
          }
          return response;
        } catch (err: any) {
          // Ignore intentional request aborts
          if (err?.name !== "AbortError") {
            handleStatusChange(false, true);
          }
          throw err;
        }
      };
    }

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, [handleStatusChange, verifyConnection]);

  // Close notification dropdown on outside click or Escape
  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  const toggleSidebarExpand = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("booki_sidebar_expanded", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggleDropdown = () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);

    if (nextState) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    setNotificationsOpen(false);
    if (notif.type === "booking") router.push("/admin/calendar");
    else if (notif.type === "sale") router.push("/admin/store");
    else if (notif.type === "inventory") router.push("/admin/services");
  };

  const navItems = [
    { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Planning", href: "/admin/calendar", icon: Calendar },
    { label: "Services & Inventaire", href: "/admin/services", icon: Package },
    { label: "Publicité & WhatsApp", href: "/admin/advertise", icon: Megaphone },
    { label: "Store", href: "/admin/store", icon: ShoppingBag },
    { label: "Dépenses & Rentabilité", href: "/admin/expenses", icon: Wallet },
    { label: "Paramètres", href: "/admin/settings", icon: Settings },
  ];

  const getPageTitle = () => {
    if (!pathname) return "Administration";
    if (pathname === "/admin" || pathname === "/admin/dashboard") return "Tableau de Bord";
    if (pathname.startsWith("/admin/calendar")) return "Planning & Réservations";
    if (pathname.startsWith("/admin/manage")) return "Équipe & Salaires";
    if (pathname.startsWith("/admin/services")) return "Services & Inventaire";
    if (pathname.startsWith("/admin/store")) return "Store & E-commerce";
    if (pathname.startsWith("/admin/advertise")) return "Publicité & WhatsApp";
    if (pathname.startsWith("/admin/expenses")) return "Dépenses & Rentabilité";
    if (pathname.startsWith("/admin/settings")) return "Paramètres de l'Entreprise";
    return "Administration";
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <NotificationListener />

      {/* Sidebar Desktop */}
      <aside
        className={`print:hidden hidden md:flex flex-col bg-slate-900 border-r border-slate-800 py-5 justify-between shrink-0 sticky top-0 h-screen z-30 transition-all duration-200 ${
          sidebarExpanded ? "w-60 px-4" : "w-20 items-center px-2"
        }`}
      >
        <div className={`flex flex-col gap-6 ${sidebarExpanded ? "w-full" : "items-center"}`}>
          <div
            className={`flex items-center ${
              sidebarExpanded ? "justify-between px-1" : "flex-col gap-2"
            }`}
          >
            <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-105 transition shrink-0">
                <Scissors size={18} />
              </div>
              {sidebarExpanded && (
                <span className="font-black text-base tracking-tight text-white">
                  Booki<span className="text-indigo-400">.tn</span>
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleSidebarExpand}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title={sidebarExpanded ? "Réduire le menu" : "Développer le menu"}
            >
              {sidebarExpanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            </button>
          </div>

          <nav className={`flex flex-col gap-2 ${sidebarExpanded ? "w-full" : "items-center"}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                mounted &&
                (pathname === item.href || pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl transition relative group flex items-center ${
                    sidebarExpanded ? "px-3.5 py-3 gap-3 w-full" : "p-3 justify-center"
                  } ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon size={19} className="shrink-0" />
                  {sidebarExpanded ? (
                    <span className="text-xs font-bold truncate">{item.label}</span>
                  ) : (
                    <span className="absolute left-16 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-xl z-50 border border-slate-800">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <form action={signOutAction} className={sidebarExpanded ? "w-full" : ""}>
          <button
            type="submit"
            className={`rounded-2xl transition relative group flex items-center text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 cursor-pointer ${
              sidebarExpanded ? "px-3.5 py-3 gap-3 w-full" : "p-3 justify-center"
            }`}
            title="Déconnexion"
          >
            <LogOut size={19} className="shrink-0" />
            {sidebarExpanded ? (
              <span className="text-xs font-bold">Déconnexion</span>
            ) : (
              <span className="absolute left-16 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-xl z-50 border border-slate-800">
                Déconnexion
              </span>
            )}
          </button>
        </form>
      </aside>

      {/* Sidebar Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-72 bg-slate-900 text-white p-6 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Scissors size={16} />
                  </div>
                  <div>
                    <span className="font-black text-base tracking-tight text-white block leading-none">
                      Booki<span className="text-indigo-400">.tn</span>
                    </span>
                    {salonName && (
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px] block mt-0.5">
                        {salonName}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex flex-col gap-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    mounted &&
                    (pathname === item.href || pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              {salonSlug && (
                <a
                  href={`/book/${salonSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-indigo-300 bg-slate-800/70 hover:bg-slate-800 transition"
                >
                  <span>Voir mon portail</span>
                  <ExternalLink size={15} />
                </a>
              )}

              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <LogOut size={18} />
                  <span>Déconnexion</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="print:hidden h-20 bg-white border-b border-slate-100 px-4 sm:px-6 md:px-10 flex items-center justify-between sticky top-0 z-40 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 transition shrink-0 cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  {getPageTitle()}
                </h1>
                {isOnline ? (
                  <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En ligne
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-rose-200 shrink-0">
                    <WifiOff size={11} /> Hors ligne
                  </span>
                )}
              </div>
              {salonName && (
                <p className="text-[11px] text-slate-400 font-semibold truncate">
                  {salonName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {salonSlug && (
              <a
                href={`/book/${salonSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-100"
              >
                <span>Mon Portail</span>
                <ExternalLink size={13} />
              </a>
            )}

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={handleToggleDropdown}
                className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition relative cursor-pointer"
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs text-slate-900">Notifications</h3>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {notifications.length}
                      </span>
                    </div>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNotifications([])}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Trash2 size={11} /> Tout effacer
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 space-y-1">
                        <Bell size={22} className="mx-auto text-slate-300" />
                        <p className="text-xs text-slate-400">
                          Aucune notification pour le moment.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => handleNotificationClick(notif)}
                          className="w-full text-left bg-slate-50 hover:bg-slate-100/80 p-3 rounded-2xl border border-slate-100 flex items-start gap-2.5 transition cursor-pointer"
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              notif.type === "sale"
                                ? "bg-emerald-50 text-emerald-600"
                                : notif.type === "inventory"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-indigo-50 text-indigo-600"
                            }`}
                          >
                            {notif.type === "sale" ? (
                              <ShoppingBag size={14} />
                            ) : notif.type === "inventory" ? (
                              <AlertTriangle size={14} />
                            ) : (
                              <Calendar size={14} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {notif.title}
                              </span>
                              <span className="text-[9px] text-slate-400 shrink-0">
                                {notif.time}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              {notif.message}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/admin/settings"
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition"
              title="Paramètres"
            >
              <Settings size={18} />
            </Link>
          </div>
        </header>

        {/* Non-blocking Offline Banner */}
        {!isOnline && (
          <div className="print:hidden bg-rose-600 text-white px-4 sm:px-6 md:px-10 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md z-30">
            <div className="flex items-center gap-2.5 text-xs">
              <WifiOff size={16} className="shrink-0" />
              <span>
                <strong>Connexion Internet perdue.</strong> Ne fermez pas la page : vos formulaires ouverts restent intacts. Réessayez dès que le réseau revient.
              </span>
            </div>
            <button
              type="button"
              disabled={checkingConnection}
              onClick={() => verifyConnection(true)}
              className="bg-white text-rose-700 hover:bg-rose-50 px-3.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={12} className={checkingConnection ? "animate-spin" : ""} />
              {checkingConnection ? "Vérification..." : "Tester la connexion"}
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}