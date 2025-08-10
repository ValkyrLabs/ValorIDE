import { createApi } from "@reduxjs/toolkit/query/react";
import { PrincipalRoles } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PrincipalRolesResponse = PrincipalRoles[];

export const PrincipalRolesService = createApi({
  reducerPath: "PrincipalRoles", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["PrincipalRoles"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getPrincipalRolessPaged: build.query<
      PrincipalRolesResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `PrincipalRoles?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PrincipalRoles" as const,
                id,
              })),
              { type: "PrincipalRoles", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPrincipalRoless: build.query<PrincipalRolesResponse, void>({
      query: () => `PrincipalRoles`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PrincipalRoles" as const,
                id,
              })),
              { type: "PrincipalRoles", id: "LIST" },
            ]
          : [{ type: "PrincipalRoles", id: "LIST" }],
    }),

    // 3) Create
    addPrincipalRoles: build.mutation<PrincipalRoles, Partial<PrincipalRoles>>({
      query: (body) => ({
        url: `PrincipalRoles`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PrincipalRoles", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPrincipalRoles: build.query<PrincipalRoles, string>({
      query: (id) => `PrincipalRoles/${id}`,
      providesTags: (result, error, id) => [{ type: "PrincipalRoles", id }],
    }),

    // 5) Update
    updatePrincipalRoles: build.mutation<
      void,
      Pick<PrincipalRoles, "id"> & Partial<PrincipalRoles>
    >({
      query: ({ id, ...patch }) => ({
        url: `PrincipalRoles/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PrincipalRolesService.util.updateQueryData(
              "getPrincipalRoles",
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
        { type: "PrincipalRoles", id },
      ],
    }),

    // 6) Delete
    deletePrincipalRoles: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `PrincipalRoles/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "PrincipalRoles", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetPrincipalRolessPagedQuery`
export const {
  useGetPrincipalRolessPagedQuery, // immediate fetch
  useLazyGetPrincipalRolessPagedQuery, // lazy fetch
  useGetPrincipalRolesQuery,
  useGetPrincipalRolessQuery,
  useAddPrincipalRolesMutation,
  useUpdatePrincipalRolesMutation,
  useDeletePrincipalRolesMutation,
} = PrincipalRolesService;
