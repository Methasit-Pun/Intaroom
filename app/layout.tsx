import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { LiffProvider } from "@/components/liff-provider"

// Import Markazi Text font for login button
import { Markazi_Text } from "next/font/google"
import { Loader2 } from "lucide-react"

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
          <LiffProvider
            liffId="2006743184-dkWgpPwk"
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-[#5A0D16] mx-auto mb-4" />
                  <p className="text-center text-gray-700">Loading LINE integration...</p>
                </div>
              </div>
            }
          >
            {children}
          </LiffProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
