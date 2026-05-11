import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import PaintingCanvas from "@/components/PaintingCanvas";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-surface="light"
      data-theme="app"
      className="relative min-h-screen text-[var(--color-text-primary)]"
      style={{ background: "#fdfbf6" }}
    >
      {/* Static textured brand background — sits at z-0, fixed, covers the full viewport */}
      <PaintingCanvas opacity={1} variant="brand" seed={9} flowSpeed={0.32} />

      {/* App shell at z-10 so it renders above the background */}
      <div className="relative z-10">
        <AuthGate>
          <AppShell>{children}</AppShell>
        </AuthGate>
      </div>
    </div>
  );
}
