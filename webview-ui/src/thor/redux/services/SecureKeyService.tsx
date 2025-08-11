import { createApi } from "@reduxjs/toolkit/query/react";
import { SecureKey } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type SecureKeyResponse = SecureKey[];

export const SecureKeyService = createApi({
  reducerPath: "SecureKey", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["SecureKey"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getSecureKeysPaged: build.query<
      SecureKeyResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => `SecureKey?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "SecureKey" as const, id })),
              { type: "SecureKey", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSecureKeys: build.query<SecureKeyResponse, void>({
      query: () => `SecureKey`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "SecureKey" as const, id })),
              { type: "SecureKey", id: "LIST" },
            ]
          : [{ type: "SecureKey", id: "LIST" }],
    }),

    // 3) Create
    addSecureKey: build.mutation<SecureKey, Partial<SecureKey>>({
      query: (body) => ({
        url: `SecureKey`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "SecureKey", id: "LIST" }],
    }),

    // 4) Get single by ID
    getSecureKey: build.query<SecureKey, string>({
      query: (id) => `SecureKey/${id}`,
      providesTags: (result, error, id) => [{ type: "SecureKey", id }],
    }),

    // 5) Update
    updateSecureKey: build.mutation<
      void,
      Pick<SecureKey, "id"> & Partial<SecureKey>
    >({
      query: ({ id, ...patch }) => ({
        url: `SecureKey/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SecureKeyService.util.updateQueryData(
              "getSecureKey",
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
      invalidatesTags: (result, error, { id }) => [{ type: "SecureKey", id }],
    }),

    // 6) Delete
    deleteSecureKey: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SecureKey/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "SecureKey", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetSecureKeysPagedQuery`
export const {
  useGetSecureKeysPagedQuery, // immediate fetch
  useLazyGetSecureKeysPagedQuery, // lazy fetch
  useGetSecureKeyQuery,
  useGetSecureKeysQuery,
  useAddSecureKeyMutation,
  useUpdateSecureKeyMutation,
  useDeleteSecureKeyMutation,
} = SecureKeyService;
