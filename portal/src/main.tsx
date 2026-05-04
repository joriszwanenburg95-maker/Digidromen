import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import App from "./App.tsx";
import "./index.css";

const STALE_BUILD_RELOAD_KEY = "digidromen:stale-build-reloaded";

function reloadOnceForStaleBuild() {
  if (sessionStorage.getItem(STALE_BUILD_RELOAD_KEY) === "1") {
    return;
  }
  sessionStorage.setItem(STALE_BUILD_RELOAD_KEY, "1");
  window.location.reload();
}

window.addEventListener("vite:preloadError", () => {
  reloadOnceForStaleBuild();
});

window.addEventListener("error", (event) => {
  const message = event.message ?? "";
  if (
    message.includes("valid JavaScript MIME type") ||
    message.includes("Failed to fetch dynamically imported module")
  ) {
    reloadOnceForStaleBuild();
  }
});

window.addEventListener("load", () => {
  sessionStorage.removeItem(STALE_BUILD_RELOAD_KEY);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
