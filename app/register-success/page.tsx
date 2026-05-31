"use client"

import Link from "next/link"
import { MailCheck } from "lucide-react"

export default function RegisterSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#6D3B3B]">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#E8E1D9] rounded-full flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-[#5A0D16]" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-white text-center mb-2">
          Check Your Email
        </h1>
        <p className="text-white/80 text-center text-sm mb-6">
          We sent a verification link to your email address. Click the link to activate your account before logging in.
        </p>

        <div className="bg-white/10 border border-white/20 text-white/70 p-3 rounded-xl mb-6 text-xs text-center">
          Check your spam folder if you don&apos;t see it within a few minutes.
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-full bg-[#E8E1D9] hover:bg-[#D8D1C9] text-[#5A0D16] font-medium transition-colors inline-block"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
