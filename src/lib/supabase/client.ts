import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Permet de voir immédiatement dans la console du navigateur si une variable manque
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ ERREUR SUPABASE : Variables d'environnement manquantes !");
    console.log("-> NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
    console.log("-> NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "Présente" : "Manquante ou Undefined");
  }

  return createBrowserClient(
    supabaseUrl || "",
    supabaseAnonKey || ""
  );
}