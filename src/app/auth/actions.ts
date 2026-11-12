'use server'

import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// INSCRIPTION : Crée le compte Auth + l'Entreprise + le Profil lié
export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const businessName = formData.get('businessName') as string

  const supabase = await createClient()

  // 1. Inscription dans Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })
  if (authError) return { error: authError.message }

  const userId = authData.user?.id
  if (!userId) return { error: "Échec de la création de l'utilisateur." }

  // 2. Création de l'entreprise (tenant)
  const { data: businessData, error: businessError } = await supabase
    .from('businesses')
    .insert({ name: businessName })
    .select('id')
    .single()

  if (businessError) return { error: businessError.message }

  // 3. Rattachement de l'utilisateur à son business_id dans la table profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      business_id: businessData.id,
      email: email,
      role: 'admin' // Premier utilisateur = admin de son entreprise
    })

  if (profileError) return { error: profileError.message }

  redirect('/admin')
}

// CONNEXION : Authentifie l'utilisateur
export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: error.message }

  redirect('/admin')
}

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