import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AuroraBackground from "@/components/AuroraBackground";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "FlowHook — Automation Engine",
  description: "Webhook-driven workflow automation engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${outfit.className}`}>
        {/* Aurora WebGL background — fixed, behind everything */}
        <AuroraBackground />
        {/* Page content sits above it via z-index */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
