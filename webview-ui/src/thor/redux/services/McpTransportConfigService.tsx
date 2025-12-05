import { createApi } from "@reduxjs/toolkit/query/react";
import { McpTransportConfig } from "@thor/model/McpTransportConfig";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type McpTransportConfigResponse = McpTransportConfig[];

export const McpTransportConfigService = createApi({
  reducerPath: "McpTransportConfig", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["McpTransportConfig"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getMcpTransportConfigsPaged: build.query<
      McpTransportConfigResponse,
      { page: number; size?: number; example?: Partial<McpTransportConfig> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `McpTransportConfig?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "McpTransportConfig" as const,
                id,
              })),
              { type: "McpTransportConfig", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpTransportConfigs: build.query<
      McpTransportConfigResponse,
      { example?: Partial<McpTransportConfig> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `McpTransportConfig?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `McpTransportConfig`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "McpTransportConfig" as const,
                id,
              })),
              { type: "McpTransportConfig", id: "LIST" },
            ]
          : [{ type: "McpTransportConfig", id: "LIST" }],
    }),

    // 3) Create
    addMcpTransportConfig: build.mutation<
      McpTransportConfig,
      Partial<McpTransportConfig>
    >({
      query: (body) => ({
        url: `McpTransportConfig`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "McpTransportConfig", id: "LIST" }],
    }),

    // 4) Get single by ID
    getMcpTransportConfig: build.query<McpTransportConfig, string>({
      query: (id) => `McpTransportConfig/${id}`,
      providesTags: (result, error, id) => [{ type: "McpTransportConfig", id }],
    }),

    // 5) Update
    updateMcpTransportConfig: build.mutation<
      void,
      Pick<McpTransportConfig, "id"> & Partial<McpTransportConfig>
    >({
      query: ({ id, ...patch }) => ({
        url: `McpTransportConfig/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpTransportConfigService.util.updateQueryData(
              "getMcpTransportConfig",
              id,
              (draft) => {
                Object.assign(draft, patch);
              },
            ),
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (
        result,
        error,
        { id }: Pick<McpTransportConfig, "id">,
      ) => [
        { type: "McpTransportConfig", id },
        { type: "McpTransportConfig", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteMcpTransportConfig: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `McpTransportConfig/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "McpTransportConfig", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetMcpTransportConfigsPagedQuery`
export const {
  useGetMcpTransportConfigsPagedQuery, // immediate fetch
  useLazyGetMcpTransportConfigsPagedQuery, // lazy fetch
  useGetMcpTransportConfigQuery,
  useGetMcpTransportConfigsQuery,
  useAddMcpTransportConfigMutation,
  useUpdateMcpTransportConfigMutation,
  useDeleteMcpTransportConfigMutation,
} = McpTransportConfigService;
