import { QueryProvider } from "./providers";

/**
 * Layout for all coach-protected routes (/coach/**).
 * Wraps children in TanStack QueryClientProvider so all coach components
 * can use useQuery / useMutation hooks.
 */
export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
