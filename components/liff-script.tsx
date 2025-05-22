"use client"

import { useEffect } from "react"
import Script from "next/script"

interface LiffScriptProps {
  onLoad?: () => void
  onError?: (error: Error) => void
}

export default function LiffScript({ onLoad, onError }: LiffScriptProps) {
  useEffect(() => {
    // Check if LIFF is already loaded
    if (typeof window !== "undefined" && window.liff) {
      onLoad?.()
    }
  }, [onLoad])

  return (
    <Script
      src="https://static.line-scdn.net/liff/edge/2/sdk.js"
      strategy="beforeInteractive"
      onLoad={() => {
        console.log("LIFF SDK loaded from CDN")
        onLoad?.()
      }}
      onError={(e) => {
        console.error("Error loading LIFF SDK:", e)
        onError?.(new Error("Failed to load LIFF SDK from CDN"))
      }}
    />
  )
}
