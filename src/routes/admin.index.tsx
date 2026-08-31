import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hap Admin" },
      {
        name: "description",
        content: "Your restaurant at a glance: setup progress, service controls and tonight's signals.",
      },
      { property: "og:title", content: "Dashboard — Hap Admin" },
      {
        property: "og:description",
        content: "Your restaurant at a glance: setup progress, service controls and tonight's signals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => null,
});
