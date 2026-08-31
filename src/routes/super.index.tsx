import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/super/")({
  head: () => ({
    meta: [
      { title: "Overview — Hap Control" },
      {
        name: "description",
        content: "Platform health for Hap: revenue, restaurants, users and churn at a glance.",
      },
      { property: "og:title", content: "Overview — Hap Control" },
      {
        property: "og:description",
        content: "Platform health for Hap: revenue, restaurants, users and churn at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
