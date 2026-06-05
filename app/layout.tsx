import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Pulse Collectif",
  description: "Santé collective pour les équipes",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
