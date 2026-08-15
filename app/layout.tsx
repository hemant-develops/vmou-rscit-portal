import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AppFrame } from "@/components/app-frame";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "VMOU RS-CIT Learner Portal",
    template: "%s | VMOU RS-CIT Learner Portal"
  },
  description: "Fast VMOU RS-CIT learner result search, exam event summaries, and secure result imports.",
  keywords: ["VMOU", "RS-CIT", "learner results", "exam events", "result search"],
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true
  }
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
