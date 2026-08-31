import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Utensils,
  Sparkles,
  QrCode,
  BarChart3,
  Palette,
  Users,
  ArrowRight,
  Check,
} from "lucide-react";
import heroImg from "@/assets/landing-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hap — Digital Menus for Restaurants" },
      {
        name: "description",
        content:
          "Hap is the digital menu platform for restaurants: manage your menu, promotions, QR codes, analytics and billing from one app.",
      },
      { property: "og:title", content: "Hap — Digital Menus for Restaurants" },
      {
        property: "og:description",
        content:
          "Manage your menu, promotions, QR codes, analytics and billing from one app, and preview exactly what guests see.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Utensils,
    title: "Menu management",
    description:
      "Add dishes, organize categories, set prices, mark sold-out items, and update everything in real time.",
  },
  {
    icon: Sparkles,
    title: "Promotions",
    description:
      "Highlight specials, run timed offers, show was-prices and terms, and push featured categories to guests.",
  },
  {
    icon: QrCode,
    title: "QR codes",
    description:
      "Generate table-specific QR codes so guests open your menu instantly on their phones.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "See what guests view most, track promotion performance, and make menu decisions with data.",
  },
  {
    icon: Palette,
    title: "Design & branding",
    description:
      "Customize colors, fonts, layout, and item styles so the menu feels like your restaurant.",
  },
  {
    icon: Users,
    title: "Team & staff",
    description:
      "Invite team members, manage roles, and keep everyone aligned from one admin workspace.",
  },
];

const capabilities = [
  "Update prices and availability without reprinting menus",
  "Run happy-hour or weekend promotions with start and end times",
  "Preview exactly what guests see before going live",
  "Export QR codes for tables, windows, and social posts",
  "Control branding, staff access, and billing from one place",
];

function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-base font-semibold text-brand-foreground shadow-sm">
              H
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">
              Hap
            </span>
          </Link>

          <Button asChild size="sm" className="rounded-full px-5">
            <Link to="/admin">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-10 pb-14 sm:px-6 sm:pt-24 sm:pb-28">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[50rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.04] blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] translate-x-1/3 translate-y-1/3 rounded-full bg-brand-subtle/40 blur-3xl" />
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm sm:mb-6 sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                <span>Digital menus made simple</span>
              </div>
              <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Your menu, everywhere guests look.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
                Hap gives restaurants one place to manage dishes, run
                promotions, share QR codes, and understand what guests love —
                then shows them a beautiful menu on any phone.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:flex sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-full px-7 shadow-sm sm:w-auto"
                >
                  <Link to="/admin">
                    Sign in to admin
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full rounded-full px-7 sm:w-auto"
                >
                  <Link to="/preview">Preview menu</Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:mt-8 sm:text-sm">
                {["No setup fees", "Works on any phone", "Real-time updates"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-brand" />
                      {item}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-brand/10 via-brand-subtle/30 to-transparent blur-2xl" />
              <img
                src={heroImg}
                alt="Hap admin dashboard on a tablet and guest menu on a phone"
                width={1280}
                height={720}
                className="relative w-full rounded-2xl border border-border bg-card shadow-card"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-14 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl sm:text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Everything in the admin
              </h2>
              <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
                From daily menu changes to long-term branding, Hap puts the
                tools you need in one clean workspace.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="group border-border/70 bg-card/60 backdrop-blur-sm transition-colors hover:bg-card"
                >
                  <CardHeader className="p-4 sm:p-6">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-subtle text-brand sm:mb-3 sm:h-10 sm:w-10">
                      <feature.icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>
                    <CardTitle className="text-base sm:text-lg">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="border-y border-border bg-card/40 px-4 py-14 sm:px-6 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                What you can do with Hap
              </h2>
              <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
                Built for busy restaurant teams who want a menu that keeps up
                with the kitchen, the floor, and the brand.
              </p>

              <ul className="mt-6 space-y-3.5 sm:mt-8 sm:space-y-4">
                {capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="flex items-start gap-3 text-sm text-foreground sm:text-base"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="leading-relaxed">{capability}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 sm:mt-10">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-full px-7 shadow-sm sm:w-auto"
                >
                  <Link to="/admin">
                    Open the admin
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <StatCard label="Menu items" value="Unlimited" />
              <StatCard label="Promotion styles" value="5+" />
              <StatCard label="QR code tables" value="Any amount" />
              <StatCard label="Guest preview" value="Live" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-14 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-4xl rounded-3xl bg-brand px-5 py-12 text-center text-brand-foreground sm:px-12 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">
              Ready to modernize your menu?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-brand-foreground/80 sm:mt-4 sm:text-lg">
              Sign in to explore the admin, or preview the guest menu to see
              what your restaurant could look like.
            </p>
            <div className="mt-7 grid grid-cols-1 gap-3 sm:mt-8 sm:flex sm:justify-center">
              <Button
                asChild
                size="lg"
                className="w-full rounded-full bg-brand-foreground text-brand hover:bg-brand-foreground/90 sm:w-auto"
              >
                <Link to="/admin">Sign in</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-full border-brand-foreground/30 bg-transparent text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground sm:w-auto"
              >
                <Link to="/preview">Preview menu</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-foreground">
              H
            </div>
            <span className="font-semibold text-foreground">Hap</span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            © {new Date().getFullYear()} Hap. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Card className="border-border/70 bg-card/60 text-center">
      <CardContent className="flex flex-col items-center justify-center px-2 py-6 sm:py-8">
        <span className="text-xl font-semibold text-brand sm:text-3xl">
          {value}
        </span>
        <span className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {label}
        </span>
      </CardContent>
    </Card>
  );
}
