"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "booking" | "sale" | "inventory";
  time: string;
  read: boolean;
}

export default function NotificationListener() {
  const supabase = createClient();

  useEffect(() => {
    const dispatchAppNotification = (title: string, message: string, type: "booking" | "sale" | "inventory") => {
      const newNotification: AppNotification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        time: "À l'instant",
        read: false,
      };

      // Émission d'un événement personnalisé écouté par le Layout
      window.dispatchEvent(new CustomEvent("booki:new-notification", { detail: newNotification }));
    };

    // Écouter les nouvelles réservations
    const bookingChannel = supabase
      .channel("realtime-bookings-ui")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const b = payload.new;
          dispatchAppNotification(
            "Nouvelle Réservation 📅",
            `${b.client_name || "Un client"} le ${b.booking_date} à ${b.start_time}`,
            "booking"
          );
        }
      )
      .subscribe();

    // Écouter les nouvelles ventes
    const salesChannel = supabase
      .channel("realtime-sales-ui")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "store_sales" },
        (payload) => {
          const s = payload.new;
          dispatchAppNotification(
            "Nouvelle Vente 🛍️",
            `Achat validé pour un montant de ${s.total_amount || 0} TND`,
            "sale"
          );
        }
      )
      .subscribe();

    // Écouter les alertes de stock bas
    const inventoryChannel = supabase
      .channel("realtime-inventory-ui")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "inventory" },
        (payload) => {
          const item = payload.new;
          if (item.quantity <= item.min_alert) {
            dispatchAppNotification(
              "Alerte Stock Bas ⚠️",
              `Il ne reste que ${item.quantity} ${item.unit} de ${item.name}`,
              "inventory"
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, [supabase]);

  return null;
}