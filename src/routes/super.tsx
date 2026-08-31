import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { HapApp } from "@/components/hap-app";
import { isSuperScreen } from "@/lib/hap-routes";

export const Route = createFileRoute("/super")({
  component: SuperLayout,
});

/**
 * Persistent shell for every /super screen: one iframe instance is mounted here
 * so navigating between control routes never remounts the app.
 */
function SuperLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const screen = pathname.replace(/^\/super\/?/, "").replace(/\/+$/, "");
  const valid = screen === "" || isSuperScreen(screen);

  return (
    <>
      {valid ? <HapApp path={pathname} title="Hap Control" /> : null}
      <Outlet />
    </>
  );
}
