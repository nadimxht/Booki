import { connection } from 'next/server';
import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import AdminShell from './AdminShell';

// Désactive la validation de navigation instantanée pour ce layout de vérification d'authentification
export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return <AdminShell>{children}</AdminShell>;
}