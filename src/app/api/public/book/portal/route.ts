import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("MISSING_SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey);
}

async function resolveBusinessBySlug(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  rawSlug: string
) {
  const cleanSlug = decodeURIComponent(rawSlug).trim();

  // 1. Try business_settings first
  const { data: settingsRows, error: settingsErr } = await supabaseAdmin
    .from("business_settings")
    .select("*")
    .ilike("slug", cleanSlug)
    .limit(1);

  if (settingsErr) {
    console.error("Supabase business_settings error:", settingsErr);
  }

  if (settingsRows && settingsRows.length > 0) {
    return settingsRows[0];
  }

  // Diagnostic in dev: see what slugs exist (or if RLS / key is blocking)
  if (process.env.NODE_ENV === "development") {
    const { data: sample, error: sampleErr } = await supabaseAdmin
      .from("business_settings")
      .select("business_id, name, slug")
      .limit(10);
    console.log("DEV CHECK business_settings slugs:", sample, "error:", sampleErr);
  }

  // 2. Fallback to businesses table
  const { data: bizRows, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .ilike("slug", cleanSlug)
    .limit(1);

  if (bizErr) {
    console.error("Supabase businesses error:", bizErr);
  }

  if (!bizRows || bizRows.length === 0) {
    return null;
  }

  const biz = bizRows[0];
  const { data: linkedRows } = await supabaseAdmin
    .from("business_settings")
    .select("*")
    .eq("business_id", biz.id)
    .limit(1);

  const linked = linkedRows?.[0] || {};
  return {
    ...biz,
    ...linked,
    business_id: biz.id,
    name: linked.name || biz.name,
    slug: linked.slug || biz.slug,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const date = searchParams.get("date");
    const staffId = searchParams.get("staffId");

    if (!slug) {
      return NextResponse.json({ error: "Slug manquant" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const settings = await resolveBusinessBySlug(supabaseAdmin, slug);

    if (!settings) {
      return NextResponse.json({ error: "Salon introuvable" }, { status: 404 });
    }

    if (date && staffId) {
      const { data: bookings } = await supabaseAdmin
        .from("bookings")
        .select("start_time, end_time")
        .eq("business_id", settings.business_id)
        .eq("employee_id", staffId)
        .eq("booking_date", date)
        .neq("status", "canceled");

      return NextResponse.json({ busySlots: bookings || [] });
    }

    const [srvRes, stfRes] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id, business_id, name, category, duration_minutes, price")
        .eq("business_id", settings.business_id)
        .order("name"),
      supabaseAdmin
        .from("employees")
        .select("id, business_id, name, color")
        .eq("business_id", settings.business_id)
        .order("name"),
    ]);

    return NextResponse.json({
      settings,
      services: srvRes.data || [],
      staffList: (stfRes.data || []).map((emp: any) => ({
        id: emp.id,
        business_id: emp.business_id,
        name: emp.name,
        color_code: emp.color || "#2563EB",
      })),
    });
  } catch (err: any) {
    console.error("Erreur GET /api/public/book/portal:", err.message);
    return NextResponse.json(
      {
        error:
          err.message === "MISSING_SUPABASE_SERVICE_ROLE_KEY"
            ? "Configuration serveur manquante (.env.local)"
            : "Erreur serveur",
      },
      { status: 500 }
    );
  }
}