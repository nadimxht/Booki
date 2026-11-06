'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Building2, Mail, Lock, Phone, ArrowRight, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [salonName, setSalonName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const slug = salonName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authErr || !authData.user) {
      setErrorMsg(authErr?.message || 'Erreur lors de l’inscription');
      setLoading(false);
      return;
    }

    const { error: bizErr } = await supabase.from('businesses').insert({
      owner_id: authData.user.id,
      name: salonName,
      slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
      phone,
    });

    if (bizErr) {
      setErrorMsg(bizErr.message);
      setLoading(false);
    } else {
      router.push('/admin/calendar');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block font-bold text-2xl tracking-tight text-slate-900">
            booki<span className="text-indigo-600">.tn</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Lancer votre salon sur Booki</h1>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Nom de votre salon *</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Ex: Art Barbershop"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Téléphone WhatsApp *</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                placeholder="+216 98 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Adresse Email *</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="contact@vobresalon.tn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Mot de passe *</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
          >
            {loading ? 'Création...' : 'Démarrer 14 jours gratuits'} <ArrowRight size={14} />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}