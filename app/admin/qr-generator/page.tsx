"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { autoGenerateAllQRCodes } from "@/lib/reservation-utils"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

interface GenerationResult {
  updated: number
  errors: number
  total: number
}

export default function QRCodeGeneratorPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateAllQRCodes = async (statusFilter?: "Pending" | "Approved" | "Rejected") => {
    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      // Generate QR codes for reservations
      const generationResult = await autoGenerateAllQRCodes(
        supabaseUrl,
        supabaseAnonKey,
        statusFilter
      )

      setResult({
        updated: generationResult.updated,
        errors: generationResult.errors,
        total: generationResult.updated + generationResult.errors
      })

    } catch (error: any) {
      console.error("QR code generation failed:", error)
      setError(error.message || "Failed to generate QR codes")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#5A0D16] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#8B1F2D]/30">
        <h1 className="text-2xl font-bold text-center">
          <span className="text-[#D4AF37]">INTANIA</span> QR CODE GENERATOR
        </h1>
        <p className="text-center text-white/70 mt-2">
          Generate access codes for all reservations in the database
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* How it Works */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-[#5A0D16]">How QR Code Generation Works</CardTitle>
              <CardDescription>
                This tool automatically generates unique access codes for all reservation records in the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">QR Code Format</h3>
                  <p className="text-blue-700 text-sm">
                    <code className="bg-blue-100 px-2 py-1 rounded">
                      INR + RoomID + Date + Time + ConfirmationNumber
                    </code>
                  </p>
                  <p className="text-blue-600 text-xs mt-2">
                    Example: INR012507301300001 for Room 01, July 30, 2025, 13:00, Confirmation #001
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Process</h3>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• Fetches all reservations from database</li>
                    <li>• Generates unique QR code for each record</li>
                    <li>• Updates the qr_code_url column</li>
                    <li>• Reports success/error counts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-[#5A0D16]">Generate QR Codes</CardTitle>
              <CardDescription>
                Choose which reservations to generate QR codes for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => generateAllQRCodes()}
                  disabled={isGenerating}
                  className="bg-[#5A0D16] hover:bg-[#4A0B12] text-white"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  All Reservations
                </Button>

                <Button
                  onClick={() => generateAllQRCodes("Approved")}
                  disabled={isGenerating}
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approved Only
                </Button>

                <Button
                  onClick={() => generateAllQRCodes("Pending")}
                  disabled={isGenerating}
                  variant="outline"
                  className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-2" />
                  )}
                  Pending Only
                </Button>

                <Button
                  onClick={() => generateAllQRCodes("Rejected")}
                  disabled={isGenerating}
                  variant="outline"
                  className="border-red-500 text-red-700 hover:bg-red-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-2" />
                  )}
                  Rejected Only
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {(result || error) && (
            <Card className="bg-white/95 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-[#5A0D16]">Generation Results</CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-red-800 font-medium">Error</span>
                    </div>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                ) : result ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-800 font-medium">Generation Completed</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-800">{result.updated}</div>
                        <div className="text-green-600 text-sm">Updated</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-800">{result.errors}</div>
                        <div className="text-red-600 text-sm">Errors</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-800">{result.total}</div>
                        <div className="text-blue-600 text-sm">Total Processed</div>
                      </div>
                    </div>

                    {result.updated > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-green-800 text-sm">
                          ✅ Successfully generated and stored {result.updated} QR codes in the database.
                        </p>
                      </div>
                    )}

                    {result.errors > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-red-800 text-sm">
                          ❌ {result.errors} reservations could not be processed. Check the console for details.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-[#5A0D16]">Alternative: Command Line Script</CardTitle>
              <CardDescription>
                You can also run the generation script directly from the command line
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                <div className="mb-2"># Navigate to project directory</div>
                <div className="mb-2">cd /path/to/intaroom</div>
                <div className="mb-2"># Run the QR code generation script</div>
                <div>node scripts/generate-qr-codes.js</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
