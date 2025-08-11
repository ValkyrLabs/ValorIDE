import { createApi } from "@reduxjs/toolkit/query/react";
import { OasSecurityScheme } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type OasSecuritySchemeResponse = OasSecurityScheme[];

export const OasSecuritySchemeService = createApi({
  reducerPath: "OasSecurityScheme", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["OasSecurityScheme"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getOasSecuritySchemesPaged: build.query<
      OasSecuritySchemeResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `OasSecurityScheme?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "OasSecurityScheme" as const,
                id,
              })),
              { type: "OasSecurityScheme", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasSecuritySchemes: build.query<OasSecuritySchemeResponse, void>({
      query: () => `OasSecurityScheme`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "OasSecurityScheme" as const,
                id,
              })),
              { type: "OasSecurityScheme", id: "LIST" },
            ]
          : [{ type: "OasSecurityScheme", id: "LIST" }],
    }),

    // 3) Create
    addOasSecurityScheme: build.mutation<
      OasSecurityScheme,
      Partial<OasSecurityScheme>
    >({
      query: (body) => ({
        url: `OasSecurityScheme`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "OasSecurityScheme", id: "LIST" }],
    }),

    // 4) Get single by ID
    getOasSecurityScheme: build.query<OasSecurityScheme, string>({
      query: (id) => `OasSecurityScheme/${id}`,
      providesTags: (result, error, id) => [{ type: "OasSecurityScheme", id }],
    }),

    // 5) Update
    updateOasSecurityScheme: build.mutation<
      void,
      Pick<OasSecurityScheme, "id"> & Partial<OasSecurityScheme>
    >({
      query: ({ id, ...patch }) => ({
        url: `OasSecurityScheme/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasSecuritySchemeService.util.updateQueryData(
              "getOasSecurityScheme",
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
        { type: "OasSecurityScheme", id },
      ],
    }),

    // 6) Delete
    deleteOasSecurityScheme: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `OasSecurityScheme/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "OasSecurityScheme", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetOasSecuritySchemesPagedQuery`
export const {
  useGetOasSecuritySchemesPagedQuery, // immediate fetch
  useLazyGetOasSecuritySchemesPagedQuery, // lazy fetch
  useGetOasSecuritySchemeQuery,
  useGetOasSecuritySchemesQuery,
  useAddOasSecuritySchemeMutation,
  useUpdateOasSecuritySchemeMutation,
  useDeleteOasSecuritySchemeMutation,
} = OasSecuritySchemeService;
