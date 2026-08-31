import { useEffect, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";

type HapAppProps = {
  /** Canonical pathname of the screen to open, e.g. "/admin/menu". */
  path: string;
  /** Public menu context: no admin shell, no mode switch, no editor controls. */
  publicContext?: boolean;
  /** Restaurant slug, used only in the public menu context. */
  slug?: string;
  title?: string;
};

type Runtime = {
  slug: string;
  publicContext: boolean;
  setRoute: (path: string) => void;
  currentPath: () => string;
};

declare global {
  interface Window {
    HapHost?: {
      query: string;
      onNavigate?: (path: string) => void;
      onReady?: (path: string) => void;
    };
    HapRuntime?: Runtime;
  }
}

const SCRIPTS = ["data.js", "services.js", "ops.js", "app.js"];

/**
 * The application is mounted in the host document rather than in a frame, so
 * every screen is made of real elements in the page: they can be inspected,
 * selected and styled individually.
 *
 * Its markup lives in one node that outlives React unmounts, because the
 * application boots once per page load and keeps its own state.
 */
type Host = {
  /** The node holding #app and #toast-layer, reused across mounts. */
  root: HTMLDivElement;
  /** Stylesheet of the application, disabled while no screen is mounted. */
  link: HTMLLinkElement;
  /** Query the application booted with; a different one needs a page load. */
  query: string;
  navigate: (path: string) => void;
};

let host: Host | null = null;

function buildQuery(path: string, publicContext: boolean, slug?: string) {
  const q = new URLSearchParams();
  q.set("p", path);
  if (publicContext) {
    q.set("ctx", "public");
    if (slug) q.set("slug", slug);
  }
  return q.toString();
}

/** Identity of a boot: switching restaurant or context restarts the app. */
function bootKey(query: string) {
  const q = new URLSearchParams(query);
  const p = q.get("p") || "/";
  const tenant = /^\/r\/([a-z0-9-]+)(\/|$)/i.exec(p);
  return `${q.get("ctx") || "admin"}:${q.get("slug") || tenant?.[1] || ""}`;
}

function createHost(query: string, onNavigate: (path: string) => void) {
  const root = document.createElement("div");
  root.className = "hap-root";
  root.innerHTML =
    '<div id="app"></div><div id="toast-layer" aria-live="polite" aria-atomic="true"></div>';

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/hap/styles.css";
  document.head.appendChild(link);

  const created: Host = { root, link, query, navigate: onNavigate };
  host = created;

  window.HapHost = {
    query,
    onNavigate: (path) => created.navigate(path),
    onReady: (path) => created.navigate(path),
  };

  // Ordered, non-deferred loading: the application expects its dependencies
  // to have run before it boots.
  SCRIPTS.forEach((file) => {
    const script = document.createElement("script");
    script.src = `/hap/${file}`;
    script.async = false;
    document.body.appendChild(script);
  });

  return created;
}

export function HapApp({ path, publicContext = false, slug, title = "Hap" }: HapAppProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const query = buildQuery(path, publicContext, slug);

    const navigate = (next: string) => {
      if (publicContext) return;
      if (typeof next !== "string" || next === pathnameRef.current) return;
      void router.navigate({ to: next, replace: false });
    };

    if (host && bootKey(host.query) !== bootKey(query)) {
      // Another restaurant or context: the application boots per tenant.
      window.location.assign(path);
      return;
    }

    const current = host ?? createHost(query, navigate);
    current.navigate = navigate;
    current.link.disabled = false;
    container.appendChild(current.root);
    window.HapRuntime?.setRoute(path);

    return () => {
      current.link.disabled = true;
      current.root.remove();
    };
    // The mount is keyed by boot identity; path changes are pushed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicContext, slug]);

  // Route changes coming from the host (links, back and forward).
  useEffect(() => {
    window.HapRuntime?.setRoute(path);
  }, [path]);

  return <div ref={containerRef} className="fixed inset-0 overflow-hidden overscroll-none" />;
}
