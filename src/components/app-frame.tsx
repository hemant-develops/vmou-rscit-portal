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

  return (
    <>
      {!isPublicPath ? (
        <>
          <header className="university-banner">
            <img src="/vmou-banner.png" alt="Vardhman Mahaveer Open University" />
          </header>
          <div className="auth-strip">
            <Link className="brand-link" href="/">
              VMOU RS-CIT Admin Portal
            </Link>
            <div className="nav-wrap">
              <PortalNav />
              <UserButton />
            </div>
          </div>
          <div className="app-back-strip">
            <button className="app-back-btn" onClick={() => router.back()} type="button">
              Back
            </button>
          </div>
        </>
      ) : null}
      {children}
    </>
  );
}

export function isPublicFramePath(pathname: string) {
  return publicPaths.has(pathname) || pathname.startsWith("/sign-in/");
}
