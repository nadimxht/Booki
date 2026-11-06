"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ShoppingBag, LayoutDashboard, Store } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Planning", href: "/admin/calendar", icon: Calendar },
    { label: "Boutique Admin", href: "/admin/store", icon: Store },
    { label: "Store Client", href: "/store", icon: ShoppingBag },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition ${
                isActive ? "text-indigo-600 font-extrabold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon size={20} className={isActive ? "scale-110 transition duration-150" : ""} />
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}