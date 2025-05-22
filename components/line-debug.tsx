"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useLiff } from "@/components/liff-provider"

export default function LineDebug() {
  const { liff, isReady, isLoggedIn, profile, error } = useLiff()
  const [showDebug, setShowDebug] = useState(false)

  if (!showDebug) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 left-4 bg-white text-gray-700 z-50"
        onClick={() => setShowDebug(true)}
      >
        Debug LINE
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg z-50 max-w-md max-h-[80vh] overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">LINE Debug Info</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowDebug(false)}>
          Close
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold">LIFF SDK Loaded:</span> {window.liff ? "Yes" : "No"}
        </div>
        <div>
          <span className="font-semibold">LIFF Ready:</span> {isReady ? "Yes" : "No"}
        </div>
        <div>
          <span className="font-semibold">Logged In:</span> {isLoggedIn ? "Yes" : "No"}
        </div>
        {error && (
          <div className="bg-red-50 p-2 rounded border border-red-200">
            <span className="font-semibold text-red-700">Error:</span> {error.message}
          </div>
        )}
        {profile && (
          <div>
            <span className="font-semibold">Profile:</span>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto">{JSON.stringify(profile, null, 2)}</pre>
          </div>
        )}
        <div>
          <span className="font-semibold">LIFF Version:</span> {liff?.version || "N/A"}
        </div>
        <div>
          <span className="font-semibold">Is in LINE App:</span> {liff?.isInClient?.() ? "Yes" : "No"}
        </div>
        <div>
          <span className="font-semibold">OS:</span> {liff?.getOS?.() || "N/A"}
        </div>
        <div>
          <span className="font-semibold">Language:</span> {liff?.getLanguage?.() || "N/A"}
        </div>
        <div>
          <span className="font-semibold">LINE App Version:</span> {liff?.getLineVersion?.() || "N/A"}
        </div>
        <div>
          <span className="font-semibold">Current URL:</span> {window.location.href}
        </div>
        <div className="pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (window.liff) {
                try {
                  window.liff.login()
                } catch (e) {
                  console.error("Manual login error:", e)
                  alert("Login error: " + (e instanceof Error ? e.message : String(e)))
                }
              } else {
                alert("LIFF SDK not loaded")
              }
            }}
            disabled={!window.liff || isLoggedIn}
          >
            Force LINE Login
          </Button>
        </div>
      </div>
    </div>
  )
}
