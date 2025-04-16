"use client"

import Link from "next/link"
import { CheckCircle, Mail, AlertTriangle, ArrowLeft } from "lucide-react"

export default function RegisterSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16] px-4">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-[#6D3B3B]">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-20 w-20 text-green-400 animate-pulse" />
        </div>

        <h1 className="text-2xl font-semibold text-white text-center mb-6">Registration Successful</h1>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 text-white p-4 rounded-lg mb-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
            <p className="text-sm">Please check your email to verify your account before logging in.</p>
          </div>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-500/50 text-white p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <p className="text-sm">If you don't see the email, check your spam folder.</p>
          </div>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[#E8E1D9] hover:bg-[#D8D1C9] text-[#5A0D16] font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
      </div>
    </div>
  )
}
