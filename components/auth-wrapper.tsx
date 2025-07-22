"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabaseUrl, supabaseAnonKey } from "@/app/env";
import { useLiff } from "./liff-provider";

interface AuthWrapperProps {
    children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isLoggedIn: isLiffLoggedIn, isReady: liffReady } = useLiff();

    const supabase = createClientComponentClient({
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
    });

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                console.log("🔒 AuthWrapper: Checking authentication state...")
                console.log("🌍 Environment:", process.env.NODE_ENV)
                
                // Check if user is admin (highest priority)
                if (typeof window !== "undefined") {
                    const isAdmin = localStorage.getItem("isAdmin") === "true";
                    if (isAdmin) {
                        console.log("👑 AuthWrapper: Admin session found")
                        setIsAuthenticated(true);
                        setIsLoading(false);
                        return;
                    }
                }

                // Check Supabase session
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error("❌ AuthWrapper: Session check error:", error)
                }

                // User is authenticated if they have either:
                // 1. A valid Supabase session, OR
                // 2. Are logged in with LINE LIFF
                const hasSupabaseSession = !!session;
                const hasLiffAuth = liffReady && isLiffLoggedIn;
                
                console.log("🔍 AuthWrapper: Auth status check:", {
                    hasSupabaseSession,
                    hasLiffAuth,
                    liffReady,
                    isLiffLoggedIn,
                    sessionUserId: session?.user?.id
                })
                
                const authenticated = hasSupabaseSession || hasLiffAuth;
                
                setIsAuthenticated(authenticated);
                
                if (!authenticated) {
                    console.log("🚫 AuthWrapper: Not authenticated, redirecting to login")
                    router.replace("/login");
                } else {
                    console.log("✅ AuthWrapper: User is authenticated")
                }
            } catch (error) {
                console.error("❌ AuthWrapper: Authentication check error:", error);
                setIsAuthenticated(false);
                router.replace("/login");
            } finally {
                setIsLoading(false);
            }
        };

        // Only check authentication if LIFF is ready or if we don't need LIFF
        if (liffReady || typeof window !== "undefined") {
            checkAuthentication();
        }
    }, [router, supabase, isLiffLoggedIn, liffReady]);

    // Show loading while checking authentication
    if (isLoading || isAuthenticated === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // Don't render children if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
};

export default AuthWrapper;