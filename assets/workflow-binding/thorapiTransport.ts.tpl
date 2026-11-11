// Reuse the generated client's issuing-origin, session, tenant and CSRF controls.
import { configureStore } from "@reduxjs/toolkit";
import { createApi } from "@reduxjs/toolkit/query";
import customBaseQuery from "@thorapi/redux/customBaseQuery";
import { resolveApiBaseUrl } from "@thorapi/utils/resolveApiBaseUrl";
import { installGeneratedTransport, sessionTransport } from "./runtime";
const api = createApi({
  reducerPath: "valkyrWorkflowCommands",
  baseQuery: customBaseQuery,
  endpoints: (build) => ({
    launch: build.mutation<
      unknown,
      { path: string; body: Record<string, unknown> }
    >({
      query: ({ path, body }) => ({ url: path, method: "POST", body }),
    }),
  }),
});
// Isolated, transient command dispatch for plain TypeScript actions; auth remains owned by ThorAPI.
const commands = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (g) => g().concat(api.middleware),
});
installGeneratedTransport(async (binding, path, body) => {
  const base = new URL(
    resolveApiBaseUrl(),
    globalThis.location?.href,
  ).href.replace(/\/+$/, "");
  if (base !== binding.backend) return sessionTransport(binding, path, body);
  const handle = commands.dispatch(
    api.endpoints.launch.initiate({ path, body }, { track: false }),
  );
  try {
    return await handle.unwrap();
  } catch (err) {
    const status = (err as { status?: unknown })?.status;
    throw new Error(
      "Workflow launch was not confirmed" +
        (status ? " (" + status + ")" : "") +
        ". Check your account, deployment and execution history.",
    );
  }
});
