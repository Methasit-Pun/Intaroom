import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

// Import Markazi Text font for login button
import { Markazi_Text } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })
const markaziText = Markazi_Text({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-markazi-text",
})

export const metadata = {
  title: "Intania Room Reservation",
  description: "Room reservation system for Intania",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${markaziText.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'