// "use client"

// import { useEffect } from "react"
// import { useRouter } from "next/navigation"

// export default function DebugAuthPage() {
//   const router = useRouter()

//   useEffect(() => {
//     // Redirect to home page in production
//     router.replace("/")
//   }, [router])

//   return (
//     <div className="flex items-center justify-center min-h-screen">
//       <div className="text-center">
//         <h1 className="text-2xl font-bold">Page Not Available</h1>
//         <p className="text-gray-600">Redirecting to home page...</p>
//       </div>
//     </div>
//   )
// }
//   )
// }
//   const [results, setResults] = useState<any[]>([])
//   const [loading, setLoading] = useState(false)

//   const supabase = createClientComponentClient({
//     supabaseUrl,
//     supabaseKey: supabaseAnonKey,
//   })

//   const addResult = (test: string, result: any) => {
//     setResults((prev) => [...prev, { test, result, timestamp: new Date().toISOString() }])
//   }

//   const testConnection = async () => {
//     setLoading(true)
//     setResults([])

//     try {
//       // Test 1: Basic connection
//       addResult("Supabase Connection", {
//         url: supabaseUrl,
//         keyLength: supabaseAnonKey.length,
//         status: "Connected",
//       })

//       // Test 2: Check profiles table access
//       try {
//         const { data: profiles, error: profilesError } = await supabase
//           .from("profiles")
//           .select("id, username, email")
//           .limit(5)

//         addResult("Profiles Table Access", {
//           success: !profilesError,
//           error: profilesError?.message,
//           count: profiles?.length || 0,
//           data: profiles,
//         })
//       } catch (error: any) {
//         addResult("Profiles Table Access", {
//           success: false,
//           error: error.message,
//         })
//       }

//       // Test 3: Look for MB user
//       try {
//         const { data: mbUser, error: mbError } = await supabase
//           .from("profiles")
//           .select("*")
//           .eq("username", "MB")
//           .single()

//         addResult("MB User Lookup", {
//           found: !mbError && !!mbUser,
//           error: mbError?.message,
//           user: mbUser,
//         })
//       } catch (error: any) {
//         addResult("MB User Lookup", {
//           found: false,
//           error: error.message,
//         })
//       }

//       // Test 4: Test authentication with MB credentials
//       try {
//         const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
//           email: "mb@test.com",
//           password: "abc123",
//         })

//         addResult("Authentication Test", {
//           success: !authError && !!authData.user,
//           error: authError?.message,
//           userId: authData.user?.id,
//           emailConfirmed: authData.user?.email_confirmed_at,
//         })

//         // Sign out after test
//         if (authData.user) {
//           await supabase.auth.signOut()
//         }
//       } catch (error: any) {
//         addResult("Authentication Test", {
//           success: false,
//           error: error.message,
//         })
//       }

//       // Test 5: Check current session
//       try {
//         const { data: session } = await supabase.auth.getSession()
//         addResult("Current Session", {
//           hasSession: !!session.session,
//           user: session.session?.user?.email,
//         })
//       } catch (error: any) {
//         addResult("Current Session", {
//           hasSession: false,
//           error: error.message,
//         })
//       }
//     } catch (error: any) {
//       addResult("General Error", { error: error.message })
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gray-100 p-8">
//       <div className="max-w-4xl mx-auto">
//         <h1 className="text-3xl font-bold mb-6">Supabase Authentication Debug</h1>

//         <button
//           onClick={testConnection}
//           disabled={loading}
//           className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 mb-6"
//         >
//           {loading ? "Testing..." : "Run Authentication Tests"}
//         </button>

//         <div className="space-y-4">
//           {results.map((result, index) => (
//             <div key={index} className="bg-white p-4 rounded-lg shadow">
//               <h3 className="font-semibold text-lg mb-2">{result.test}</h3>
//               <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
//                 {JSON.stringify(result.result, null, 2)}
//               </pre>
//               <p className="text-xs text-gray-500 mt-2">{result.timestamp}</p>
//             </div>
//           ))}
//         </div>

//         {results.length === 0 && !loading && (
//           <div className="bg-white p-8 rounded-lg shadow text-center">
//             <p className="text-gray-500">Click "Run Authentication Tests" to start debugging</p>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }
