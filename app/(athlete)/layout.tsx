/**
 * Bare layout for the athlete (public) route group.
 * No QueryProvider, no CoachNavbar — anonymous users only.
 * Mobile-first design; this is the primary surface for athletes on phones.
 */
export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground">{children}</main>
  );
}
