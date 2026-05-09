import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-surface="light"
      data-theme="app"
      className="relative min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]"
    >
      {/* Decorative ambient gradient — subtle so it doesn't fight content.
          Blue tones pair with the in-app accent. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-[420px] max-w-[1100px] -translate-y-1/3 opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(59,130,246,0.20) 0%, rgba(59,130,246,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 left-0 z-0 h-[360px] w-[520px] -translate-x-1/4 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(147,197,253,0.22) 0%, rgba(147,197,253,0) 70%)",
        }}
      />
      <div className="relative z-10">
        <AuthGate>
          <AppShell>{children}</AppShell>
        </AuthGate>
      </div>
    </div>
  );
}
