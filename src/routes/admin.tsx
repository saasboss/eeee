import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_RESTAURANT_SLUG } from "@/lib/hap-routes";

/**
 * Unscoped admin URLs stay valid forever: every /admin/... link, bookmark and
 * printed QR is redirected to the restaurant-scoped URL for the current
 * restaurant, which is where the admin application actually lives now.
 */
export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/r/${DEFAULT_RESTAURANT_SLUG}${location.pathname}${location.searchStr}`,
      replace: true,
    });
  },
  component: () => null,
});
