"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const MEMBER_NAV = [
  { href: "/meteo",    label: "Météo",   icon: "🌤️" },
  { href: "/fil",      label: "Fil",     icon: "💬" },
  { href: "/bilans",   label: "Bilans",  icon: "📋" },
  { href: "/gratitudes", label: "Merci", icon: "💜" },
]

const LEAD_NAV = [
  { href: "/meteo",    label: "Météo",   icon: "🌤️" },
  { href: "/fil",      label: "Fil",     icon: "💬" },
  { href: "/bilans",   label: "Bilans",  icon: "📋" },
  { href: "/gratitudes", label: "Merci", icon: "💜" },
  { href: "/lead",     label: "Lead",    icon: "📊" },
]

export default function BottomNav({ role }: { role: "MEMBER" | "LEAD" }) {
  const pathname = usePathname()
  const nav = role === "LEAD" ? LEAD_NAV : MEMBER_NAV

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
      {nav.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
              active ? "text-primary" : "text-gray-400"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
