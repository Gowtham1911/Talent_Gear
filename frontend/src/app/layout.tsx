import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentGear — AI Recruitment Platform",
  description: "Smart hiring powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
