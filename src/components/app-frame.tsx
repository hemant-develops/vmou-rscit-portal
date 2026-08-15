"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PortalNav } from "@/components/portal-nav";

const publicPaths = new Set(["/sign-in", "/unauthorized"]);

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = isPublicFramePath(pathname);
  
  const isHomePage = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      {!isPublicPath ? (
        <>
          {/* University Banner */}
          <header className="w-full bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-center items-center">
              <img 
                src="/vmou-banner.png" 
                alt="Vardhman Mahaveer Open University" 
                className="max-h-16 w-auto object-contain"
              />
            </div>
          </header>

          {/* Navigation & Brand Strip */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
            {/* <-- CHANGED: Adjusted padding and gap for seamless mobile display */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link className="text-base sm:text-lg font-bold text-blue-900 tracking-tight hover:text-blue-700 transition-colors" href="/">
                VMOU RS-CIT Admin Portal
              </Link>
              
              {/* <-- CHANGED: Ensured full-width alignment on mobile to keep nav and user button inline */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <PortalNav />
                <div className="flex items-center pl-2 border-l border-gray-200 shrink-0">
                  <UserButton />
                </div>
              </div>
            </div>
          </div>

          {/* Back Button Strip (Hidden on Home Page) */}
          {!isHomePage && (
            <div className="max-w-7xl w-full mx-auto px-4 py-3">
              <button 
                className="inline-flex items-center px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => router.back()} 
                type="button"
              >
                ← Back
              </button>
            </div>
          )}
        </>
      ) : null}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pb-12">
        {children}
      </main>
    </div>
  );
}

export function isPublicFramePath(pathname: string) {
  return publicPaths.has(pathname) || pathname.startsWith("/sign-in/");
}