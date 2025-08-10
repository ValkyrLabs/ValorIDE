import { createApi } from "@reduxjs/toolkit/query/react";
import { McpMarketplaceCatalog } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type McpMarketplaceCatalogResponse = McpMarketplaceCatalog[];

export const McpMarketplaceCatalogService = createApi({
  reducerPath: "McpMarketplaceCatalog", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["McpMarketplaceCatalog"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getMcpMarketplaceCatalogsPaged: build.query<
      McpMarketplaceCatalogResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `McpMarketplaceCatalog?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "McpMarketplaceCatalog" as const,
                id,
              })),
              { type: "McpMarketplaceCatalog", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpMarketplaceCatalogs: build.query<McpMarketplaceCatalogResponse, void>(
      {
        query: () => `McpMarketplaceCatalog`,
        providesTags: (result) =>
          result
            ? [
                ...result.map(({ id }) => ({
                  type: "McpMarketplaceCatalog" as const,
                  id,
                })),
                { type: "McpMarketplaceCatalog", id: "LIST" },
              ]
            : [{ type: "McpMarketplaceCatalog", id: "LIST" }],
      },
    ),

    // 3) Create
    addMcpMarketplaceCatalog: build.mutation<
      McpMarketplaceCatalog,
      Partial<McpMarketplaceCatalog>
    >({
      query: (body) => ({
        url: `McpMarketplaceCatalog`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "McpMarketplaceCatalog", id: "LIST" }],
    }),

    // 4) Get single by ID
    getMcpMarketplaceCatalog: build.query<McpMarketplaceCatalog, string>({
      query: (id) => `McpMarketplaceCatalog/${id}`,
      providesTags: (result, error, id) => [
        { type: "McpMarketplaceCatalog", id },
      ],
    }),

    // 5) Update
    updateMcpMarketplaceCatalog: build.mutation<
      void,
      Pick<McpMarketplaceCatalog, "id"> & Partial<McpMarketplaceCatalog>
    >({
      query: ({ id, ...patch }) => ({
        url: `McpMarketplaceCatalog/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpMarketplaceCatalogService.util.updateQueryData(
              "getMcpMarketplaceCatalog",
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
      invalidatesTags: (result, error, { id }) => [
        { type: "McpMarketplaceCatalog", id },
      ],
    }),

    // 6) Delete
    deleteMcpMarketplaceCatalog: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `McpMarketplaceCatalog/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "McpMarketplaceCatalog", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetMcpMarketplaceCatalogsPagedQuery`
export const {
  useGetMcpMarketplaceCatalogsPagedQuery, // immediate fetch
  useLazyGetMcpMarketplaceCatalogsPagedQuery, // lazy fetch
  useGetMcpMarketplaceCatalogQuery,
  useGetMcpMarketplaceCatalogsQuery,
  useAddMcpMarketplaceCatalogMutation,
  useUpdateMcpMarketplaceCatalogMutation,
  useDeleteMcpMarketplaceCatalogMutation,
} = McpMarketplaceCatalogService;
