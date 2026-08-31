import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { isSuperScreen } from "@/lib/hap-routes";

const TITLES: Record<string, [string, string]> = {
  restaurants: ["Restaurants — Hap Control", "Every restaurant account on the Hap platform."],
  users: ["Users — Hap Control", "Owners, managers and support accounts across the platform."],
  plans: ["Plans — Hap Control", "Tiers, feature access, subscriptions and manual access grants."],
  settings: ["Settings — Hap Control", "Signups, trials, languages and platform email templates."],
};

export const Route = createFileRoute("/super/$")({
  loader: ({ params }) => {
    const screen = (params._splat ?? "").replace(/\/+$/, "");
    if (!isSuperScreen(screen)) throw notFound();
    return { screen };
  },
  head: ({ params }) => {
    const screen = (params._splat ?? "").replace(/\/+$/, "");
    const [title, description] = TITLES[screen] ?? [
      "Not found — Hap Control",
      "This Hap Control screen does not exist.",
    ];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: SuperNotFound,
  component: SuperScreenRoute,
});

function SuperScreenRoute() {
  // The iframe lives in the /super layout route so it survives navigation.
  return null;
}

function SuperNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Hap Control
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">This control page doesn't exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The screen you tried to open isn't part of Hap Control.
        </p>
        <Link
          to="/super"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
