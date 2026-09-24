import React from "react";
import ReactDOM from "react-dom/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { reportError } from "./lib/errors";
import { bridgeWebviewFocus } from "./lib/focus";
import "./index.css";

// networkMode "always": the default "online" pauses all queries and
// mutations while the webview reports offline, which would freeze the
// local SQLite queries too. Local IPC must always run; AniList queries
// simply fail into their offline fallbacks.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "always" },
    mutations: { networkMode: "always" },
  },
  // Central error surfacing (ADR-0010): every failed query and mutation
  // toasts and appends to the log file, so no hook duplicates the plumbing.
  queryCache: new QueryCache({
    onError: (error) => reportError(error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => reportError(error),
  }),
});

bridgeWebviewFocus();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
