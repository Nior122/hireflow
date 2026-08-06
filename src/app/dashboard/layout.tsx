import { Header } from "@/components/Header";
import { QuickActionsFAB } from "@/components/QuickActionsFAB";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>
      <QuickActionsFAB />
    </>
  );
}

