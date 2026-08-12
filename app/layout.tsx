import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AppFrame } from "@/components/app-frame";
import "./globals.css";

export const metadata: Metadata = {
  title: "VMOU RS-CIT Learner Portal",
  description: "Search VMOU RS-CIT learner results from PostgreSQL"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" afterSignOutUrl="/sign-in">
      <html lang="en" data-scroll-behavior="smooth">
        <body>
          <AppFrame>{children}</AppFrame>
        </body>
      </html>
    </ClerkProvider>
  );
}
