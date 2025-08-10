import { createApi } from "@reduxjs/toolkit/query/react";
import { PersistentLogin } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PersistentLoginResponse = PersistentLogin[];

export const PersistentLoginService = createApi({
  reducerPath: "PersistentLogin", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["PersistentLogin"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getPersistentLoginsPaged: build.query<
      PersistentLoginResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `PersistentLogin?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PersistentLogin" as const,
                id,
              })),
              { type: "PersistentLogin", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPersistentLogins: build.query<PersistentLoginResponse, void>({
      query: () => `PersistentLogin`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PersistentLogin" as const,
                id,
              })),
              { type: "PersistentLogin", id: "LIST" },
            ]
          : [{ type: "PersistentLogin", id: "LIST" }],
    }),

    // 3) Create
    addPersistentLogin: build.mutation<
      PersistentLogin,
      Partial<PersistentLogin>
    >({
      query: (body) => ({
        url: `PersistentLogin`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PersistentLogin", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPersistentLogin: build.query<PersistentLogin, string>({
      query: (id) => `PersistentLogin/${id}`,
      providesTags: (result, error, id) => [{ type: "PersistentLogin", id }],
    }),

    // 5) Update
    updatePersistentLogin: build.mutation<
      void,
      Pick<PersistentLogin, "id"> & Partial<PersistentLogin>
    >({
      query: ({ id, ...patch }) => ({
        url: `PersistentLogin/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PersistentLoginService.util.updateQueryData(
              "getPersistentLogin",
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
        { type: "PersistentLogin", id },
      ],
    }),

    // 6) Delete
    deletePersistentLogin: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `PersistentLogin/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "PersistentLogin", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetPersistentLoginsPagedQuery`
export const {
  useGetPersistentLoginsPagedQuery, // immediate fetch
  useLazyGetPersistentLoginsPagedQuery, // lazy fetch
  useGetPersistentLoginQuery,
  useGetPersistentLoginsQuery,
  useAddPersistentLoginMutation,
  useUpdatePersistentLoginMutation,
  useDeletePersistentLoginMutation,
} = PersistentLoginService;
