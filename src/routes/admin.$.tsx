import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ADMIN_TITLES, resolveAdminScreen } from "@/lib/hap-routes";

const TITLES: Record<string, [string, string]> = ADMIN_TITLES;

export const Route = createFileRoute("/admin/$")({
  loader: ({ params }) => {
    const screen = resolveAdminScreen(params._splat ?? "");
    if (screen === null) throw notFound();
    return { screen };
  },
  head: ({ params }) => {
    const screen = resolveAdminScreen(params._splat ?? "") ?? "";
    const [title, description] = TITLES[screen] ?? [
      "Not found — Hap Admin",
      "This admin screen does not exist.",
    ];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(TITLES[screen] ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: AdminNotFound,
  component: AdminScreenRoute,
});

function AdminScreenRoute() {
  // The iframe lives in the /admin layout route so it survives navigation.
  return null;
}

function AdminNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Hap Admin
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">This admin page doesn't exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The screen you tried to open isn't part of the admin experience.
        </p>
        <Link
          to="/admin"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
