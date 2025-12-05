import { createApi } from "@reduxjs/toolkit/query/react";
import { UpdateFileRequest } from "@thor/model/UpdateFileRequest";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type UpdateFileRequestResponse = UpdateFileRequest[];

export const UpdateFileRequestService = createApi({
  reducerPath: "UpdateFileRequest", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["UpdateFileRequest"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getUpdateFileRequestsPaged: build.query<
      UpdateFileRequestResponse,
      { page: number; size?: number; example?: Partial<UpdateFileRequest> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `UpdateFileRequest?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "UpdateFileRequest" as const,
                id,
              })),
              { type: "UpdateFileRequest", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getUpdateFileRequests: build.query<
      UpdateFileRequestResponse,
      { example?: Partial<UpdateFileRequest> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `UpdateFileRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `UpdateFileRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "UpdateFileRequest" as const,
                id,
              })),
              { type: "UpdateFileRequest", id: "LIST" },
            ]
          : [{ type: "UpdateFileRequest", id: "LIST" }],
    }),

    // 3) Create
    addUpdateFileRequest: build.mutation<
      UpdateFileRequest,
      Partial<UpdateFileRequest>
    >({
      query: (body) => ({
        url: `UpdateFileRequest`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "UpdateFileRequest", id: "LIST" }],
    }),

    // 4) Get single by ID
    getUpdateFileRequest: build.query<UpdateFileRequest, string>({
      query: (id) => `UpdateFileRequest/${id}`,
      providesTags: (result, error, id) => [{ type: "UpdateFileRequest", id }],
    }),

    // 5) Update
    updateUpdateFileRequest: build.mutation<
      void,
      Pick<UpdateFileRequest, "id"> & Partial<UpdateFileRequest>
    >({
      query: ({ id, ...patch }) => ({
        url: `UpdateFileRequest/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            UpdateFileRequestService.util.updateQueryData(
              "getUpdateFileRequest",
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
        { id }: Pick<UpdateFileRequest, "id">,
      ) => [
        { type: "UpdateFileRequest", id },
        { type: "UpdateFileRequest", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteUpdateFileRequest: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `UpdateFileRequest/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "UpdateFileRequest", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetUpdateFileRequestsPagedQuery`
export const {
  useGetUpdateFileRequestsPagedQuery, // immediate fetch
  useLazyGetUpdateFileRequestsPagedQuery, // lazy fetch
  useGetUpdateFileRequestQuery,
  useGetUpdateFileRequestsQuery,
  useAddUpdateFileRequestMutation,
  useUpdateUpdateFileRequestMutation,
  useDeleteUpdateFileRequestMutation,
} = UpdateFileRequestService;
