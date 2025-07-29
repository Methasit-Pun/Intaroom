import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import AuthDebug from "@/components/auth-debug"

export const metadata: Metadata = {
  title: "Intaroom",
  description: "Created by Eng Enterprise",
  generator: "Intaroom.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* <AuthDebug /> */}
      </body>
    </html>
  )
}
