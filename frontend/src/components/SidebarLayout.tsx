"use client";
import Sidebar from "./Sidebar";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#fffbf7]">
      <Sidebar />
      <main className="flex-1 md:ml-60 min-w-0">
        {children}
      </main>
    </div>
  );
}
