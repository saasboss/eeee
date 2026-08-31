import { createFileRoute } from "@tanstack/react-router";
import { RESTAURANT_NAMES } from "@/lib/hap-routes";

export const Route = createFileRoute("/r/$slug/admin/")({
  head: ({ params }) => {
    const name = RESTAURANT_NAMES[params.slug] ?? params.slug;
    const title = `Dashboard — ${name} on Hap`;
    const description = `${name} at a glance: setup progress, service controls and tonight's signals.`;
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
  component: () => null,
});
