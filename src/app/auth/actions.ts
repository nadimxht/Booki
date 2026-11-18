'use server'

import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// INSCRIPTION : Crée le compte Auth + l'Entreprise + le Profil lié


// CONNEXION : Authentifie l'utilisateur


// DÉCONNEXION (Disconnect) : Efface les cookies de session
export async function signOutAction() {
  const supabase = await createClient()

  // 1. Déconnexion Supabase (efface la session auth)
  await supabase.auth.signOut()

  // 2. Invalide le cache Next.js pour l'ensemble des routes admin
  revalidatePath('/admin', 'layout')

  // 3. Redirige impérativement vers la page de connexion
  redirect('/login')
}