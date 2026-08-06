import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
        <Compass className="h-10 w-10 text-primary animate-pulse-glow" />
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20" style={{ animationDuration: "3s" }} />
      </div>
      <h1 className="text-7xl font-bold tracking-tight mb-4 text-gradient">404</h1>
      <h2 className="text-2xl font-semibold mb-3">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm leading-relaxed">
        The page you are looking for doesn't exist or has been moved. Let's get you back on track.
      </p>
      <Link href="/dashboard">
        <Button size="lg" className="gap-2">
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </Link>
    </div>
  );
}
