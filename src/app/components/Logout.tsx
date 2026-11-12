'use client'

import { signOutAction } from '@/app/auth/actions'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button onClick={signOutAction} type="submit" className="text-red-600 p-3 rounded-2xl transition relative group flex items-center justify-center hover:clickable hover:bg-slate-800 cursor-pointer">
        <LogOut size={20} />
      </button>
    </form>
  )
}