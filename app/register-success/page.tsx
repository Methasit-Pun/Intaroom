"use client"

import Link from "next/link"

export default function RegisterSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
      <div className="w-full max-w-md p-6 rounded-3xl bg-[#6D3B3B]">
        <h1 className="text-2xl font-semibold text-white text-center mb-4">Registration Successful</h1>

        <div className="bg-green-500/20 border border-green-500 text-white p-4 rounded-lg mb-6">
          <p className="text-center mb-3">Your account has been created successfully!</p>
          <p className="text-center font-medium">Please check your email to verify your account before logging in.</p>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-500 text-white p-4 rounded-lg mb-6">
          <p className="text-center text-sm">
            <strong>Important:</strong> If you don't see the verification email in your inbox, please check your spam
            folder.
          </p>
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
