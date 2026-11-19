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
  const [reconnectTick, setReconnectTick] = useState(0);

  useEffect(() => {
    async function initBusiness() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("business_id")
          .eq("id", user.id)
          .single();

        if (profile?.business_id) {
          setBusinessId(profile.business_id);
        }
      } catch {
        // ignore if offline
      }
    }

    initBusiness();

    const handleOnlineRestored = () => {
      setReconnectTick((t) => t + 1);
      initBusiness();
    };

    window.addEventListener("booki:online-restored", handleOnlineRestored);
    return () => {
      window.removeEventListener("booki:online-restored", handleOnlineRestored);
    };
  }, [supabase]);

  useEffect(() => {
    if (!businessId) return;

    const dispatchAppNotification = (
      title: string,
      message: string,
      type: "booking" | "sale" | "inventory"
    ) => {
      const newNotification: AppNotification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        time: "À l'instant",
        read: false,
      };

      window.dispatchEvent(
        new CustomEvent("booki:new-notification", { detail: newNotification })
      );
    };

    const bookingChannel = supabase
      .channel(`realtime-bookings-ui-${businessId}-${reconnectTick}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `business_id=eq.${businessId}`,
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

    const salesChannel = supabase
      .channel(`realtime-sales-ui-${businessId}-${reconnectTick}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "store_sales",
          filter: `business_id=eq.${businessId}`,
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

    const inventoryChannel = supabase
      .channel(`realtime-inventory-ui-${businessId}-${reconnectTick}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inventory",
          filter: `business_id=eq.${businessId}`,
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
  }, [businessId, reconnectTick, supabase]);

  return null;
}