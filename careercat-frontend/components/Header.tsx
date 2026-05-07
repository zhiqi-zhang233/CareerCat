/**
 * Legacy <Header /> shim.
 *
 * The (app) layout now provides a full sidebar + topbar via AppShell,
 * so individual pages no longer need to render their own header.
 *
 * This shim is kept so existing imports (`import Header from
 * "@/components/Header"`) remain valid during the v2 migration.
 * It deliberately renders nothing.
 */
export default function Header() {
  return null;
}
