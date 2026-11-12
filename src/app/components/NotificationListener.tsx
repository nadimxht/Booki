"use client";

import { useEffect, useState } from "react";
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
  const [businessId, setBusinessId] = useState<string | null>(null);

  // 1. Récupérer le business_id de l'admin connecté au chargement
  useEffect(() => {
    async function initBusiness() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profile?.business_id) {
        setBusinessId(profile.business_id);
      }
    }

    initBusiness();
  }, [supabase]);

  // 2. Initialiser les abonnements Realtime une fois le businessId connu
  useEffect(() => {
    if (!businessId) return;

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

    // Écouter les nouvelles réservations pour ce business_id 🔒
    const bookingChannel = supabase
      .channel(`realtime-bookings-ui-${businessId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "bookings",
          filter: `business_id=eq.${businessId}`
        },
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

    // Écouter les nouvelles ventes pour ce business_id 🔒
    const salesChannel = supabase
      .channel(`realtime-sales-ui-${businessId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "store_sales",
          filter: `business_id=eq.${businessId}`
        },
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

    // Écouter les alertes de stock bas pour ce business_id 🔒
    const inventoryChannel = supabase
      .channel(`realtime-inventory-ui-${businessId}`)
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "inventory",
          filter: `business_id=eq.${businessId}`
        },
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
  }, [businessId, supabase]);

  return null;
}