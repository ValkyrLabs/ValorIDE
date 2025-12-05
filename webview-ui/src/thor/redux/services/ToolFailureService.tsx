import { createApi } from "@reduxjs/toolkit/query/react";
import { ToolFailure } from "@thor/model/ToolFailure";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type ToolFailureResponse = ToolFailure[];

export const ToolFailureService = createApi({
  reducerPath: "ToolFailure", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["ToolFailure"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getToolFailuresPaged: build.query<
      ToolFailureResponse,
      { page: number; size?: number; example?: Partial<ToolFailure> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ToolFailure?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "ToolFailure" as const, id })),
              { type: "ToolFailure", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getToolFailures: build.query<
      ToolFailureResponse,
      { example?: Partial<ToolFailure> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ToolFailure?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ToolFailure`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "ToolFailure" as const, id })),
              { type: "ToolFailure", id: "LIST" },
            ]
          : [{ type: "ToolFailure", id: "LIST" }],
    }),

    // 3) Create
    addToolFailure: build.mutation<ToolFailure, Partial<ToolFailure>>({
      query: (body) => ({
        url: `ToolFailure`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ToolFailure", id: "LIST" }],
    }),

    // 4) Get single by ID
    getToolFailure: build.query<ToolFailure, string>({
      query: (id) => `ToolFailure/${id}`,
      providesTags: (result, error, id) => [{ type: "ToolFailure", id }],
    }),

    // 5) Update
    updateToolFailure: build.mutation<
      void,
      Pick<ToolFailure, "id"> & Partial<ToolFailure>
    >({
      query: ({ id, ...patch }) => ({
        url: `ToolFailure/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ToolFailureService.util.updateQueryData(
              "getToolFailure",
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
      invalidatesTags: (result, error, { id }: Pick<ToolFailure, "id">) => [
        { type: "ToolFailure", id },
        { type: "ToolFailure", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteToolFailure: build.mutation<{ success: boolean; id: string }, number>(
      {
        query(id) {
          return {
            url: `ToolFailure/${id}`,
            method: "DELETE",
          };
        },
        invalidatesTags: (result, error, id) => [{ type: "ToolFailure", id }],
      },
    ),
  }),
});

// Notice we now also export `useLazyGetToolFailuresPagedQuery`
export const {
  useGetToolFailuresPagedQuery, // immediate fetch
  useLazyGetToolFailuresPagedQuery, // lazy fetch
  useGetToolFailureQuery,
  useGetToolFailuresQuery,
  useAddToolFailureMutation,
  useUpdateToolFailureMutation,
  useDeleteToolFailureMutation,
} = ToolFailureService;
