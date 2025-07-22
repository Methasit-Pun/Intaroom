"use client"

import { useLiff } from "@/components/liff-provider"

export default function TestLiff() {
  const { isLoggedIn, liffProfile } = useLiff()

  return (
    <div style={{ padding: 32 }}>
      <h1>LIFF Test Page</h1>
      <div>
        <strong>isLoggedIn:</strong> {isLoggedIn ? "true" : "false"}
      </div>
      <div>
        <strong>liffProfile:</strong>
        <pre>{JSON.stringify(liffProfile, null, 2)}</pre>
      </div>
    </div>
  )
}
