import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_RESTAURANT_SLUG } from "@/lib/hap-routes";

/**
 * Preview is no longer a mode of the application. The URL stays alive for old
 * bookmarks and printed links, and lands on the real public menu instead.
 */
export const Route = createFileRoute("/preview")({
  beforeLoad: () => {
    throw redirect({ href: `/menu/${DEFAULT_RESTAURANT_SLUG}`, replace: true });
  },
  component: () => null,
});
