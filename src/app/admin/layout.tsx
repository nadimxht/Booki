"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationListener, { AppNotification } from "../components/NotificationListener";
import { 
  LayoutDashboard, Calendar, Users, Package, Settings, 
  LogOut, Scissors, Bell, ShoppingBag, CheckCircle2
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Liste des notifications stockées en état
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "init-1",
      title: "Système de notification prêt",
      message: "Les nouvelles réservations et ventes s'afficheront ici.",
      type: "booking",
      time: "Aujourd'hui",
      read: true
    }
  ]);

  useEffect(() => {
    setMounted(true);

    // Écoute des évènements envoyés par NotificationListener
    const handleNewNotification = (event: Event) => {
      const customEvent = event as CustomEvent<AppNotification>;
      setNotifications((prev) => [customEvent.detail, ...prev]);
    };

    window.addEventListener("booki:new-notification", handleNewNotification);
    return () => {
      window.removeEventListener("booki:new-notification", handleNewNotification);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggleDropdown = () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);

    // Marquer toutes les notifications comme lues à l'ouverture
    if (nextState) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    }
  };

  const navItems = [
    { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Planning", href: "/admin/calendar", icon: Calendar },
    { label: "Équipe & Salaires", href: "/admin/manage", icon: Users },
    { label: "Services & Inventaire", href: "/admin/services", icon: Package },
    { label: "Store", href: "/admin/store", icon: ShoppingBag },
    { label: "Paramètres", href: "/admin/settings", icon: Settings },
  ];

  const getPageTitle = () => {
    switch (pathname) {
      case "/admin":
      case "/admin/dashboard": return "Tableau de Bord";
      case "/admin/calendar": return "Planning & Réservations";
      case "/admin/manage":
      case "/admin/team": return "Équipe & Salaires";
      case "/admin/services": return "Services & Inventaire";
      case "/admin/store": return "Store";
      case "/admin/settings": return "Paramètres de l'Entreprise";
      default: return "Administration";
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      
      {/* Écouteur en arrière-plan */}
      <NotificationListener />

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-20 bg-slate-900 border-r border-slate-800 items-center py-6 justify-between shrink-0 sticky top-0 h-screen">
        <div className="flex flex-col items-center gap-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-md shadow-indigo-600/30">
            <Scissors size={20} />
          </div>

          <nav className="flex flex-col gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = mounted && pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-3 rounded-2xl transition relative group flex items-center justify-center ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon size={20} />
                  <span className="absolute left-20 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-xl z-50 border border-slate-800">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/"
            className="p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition relative group flex items-center justify-center"
          >
            <LogOut size={20} />
            <span className="absolute left-20 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none shadow-xl z-50 border border-slate-800">
              Voir le site public
            </span>
          </Link>
        </div>
      </aside>

      {/* Zone Principale */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-100 px-6 md:px-10 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En ligne
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Cloche de Notification avec Dropdown interactif */}
            <div className="relative">
              <button
                onClick={handleToggleDropdown}
                className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition relative"
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
                    <h3 className="font-bold text-xs text-slate-900">Notifications</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {notifications.length} message(s)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Aucune notification.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">{notif.title}</span>
                            <span className="text-[9px] text-slate-400">{notif.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-2 border-l border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm shadow-indigo-600/30">
                AD
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}