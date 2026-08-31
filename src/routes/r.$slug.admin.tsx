import { Outlet, createFileRoute, notFound, useRouterState } from "@tanstack/react-router";
import { HapApp } from "@/components/hap-app";
import { RESTAURANT_NAMES, isAdminScreen, isRestaurantSlug } from "@/lib/hap-routes";

export const Route = createFileRoute("/r/$slug/admin")({
  beforeLoad: ({ params }) => {
    if (!isRestaurantSlug(params.slug)) throw notFound();
  },
  component: TenantAdminLayout,
});

/**
 * Persistent shell for every /r/<slug>/admin screen. The restaurant lives in
 * the URL, so one iframe per restaurant survives navigation inside it.
 */
function TenantAdminLayout() {
  const { slug } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const screen = pathname.replace(/^\/r\/[^/]+\/admin\/?/, "").replace(/\/+$/, "");
  const valid = screen === "" || isAdminScreen(screen);

  return (
    <>
      {valid ? (
        <HapApp
          key={slug}
          path={pathname}
          title={`${RESTAURANT_NAMES[slug] ?? slug} — Hap Admin`}
        />
      ) : null}
      <Outlet />
    </>
  );
}
