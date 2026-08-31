import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { HapApp } from "@/components/hap-app";
import { RESTAURANT_NAMES, isRestaurantSlug } from "@/lib/hap-routes";

export const Route = createFileRoute("/menu/$slug")({
  loader: ({ params }) => {
    if (!isRestaurantSlug(params.slug)) throw notFound();
    return { name: RESTAURANT_NAMES[params.slug] ?? params.slug };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Menu not found — Hap" },
          { name: "description", content: "This menu is not available." },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.name} — Menu`;
    const description = `Browse the ${loaderData.name} menu: dishes, prices and today's highlights, in your language.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: `/menu/${params.slug}` }],
    };
  },
  notFoundComponent: MenuNotFound,
  component: PublicMenuRoute,
});

function PublicMenuRoute() {
  const { slug } = Route.useParams();
  const { name } = Route.useLoaderData();
  return <HapApp path={`/menu/${slug}`} slug={slug} publicContext title={`${name} menu`} />;
}

function MenuNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hap</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Menu not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This menu link is no longer active. Ask the restaurant for an up-to-date QR code.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go to Hap
        </Link>
      </div>
    </div>
  );
}
