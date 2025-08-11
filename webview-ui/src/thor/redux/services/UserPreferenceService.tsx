import { createApi } from "@reduxjs/toolkit/query/react";
import { UserPreference } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type UserPreferenceResponse = UserPreference[];

export const UserPreferenceService = createApi({
  reducerPath: "UserPreference", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["UserPreference"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getUserPreferencesPaged: build.query<
      UserPreferenceResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `UserPreference?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "UserPreference" as const,
                id,
              })),
              { type: "UserPreference", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getUserPreferences: build.query<UserPreferenceResponse, void>({
      query: () => `UserPreference`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "UserPreference" as const,
                id,
              })),
              { type: "UserPreference", id: "LIST" },
            ]
          : [{ type: "UserPreference", id: "LIST" }],
    }),

    // 3) Create
    addUserPreference: build.mutation<UserPreference, Partial<UserPreference>>({
      query: (body) => ({
        url: `UserPreference`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "UserPreference", id: "LIST" }],
    }),

    // 4) Get single by ID
    getUserPreference: build.query<UserPreference, string>({
      query: (id) => `UserPreference/${id}`,
      providesTags: (result, error, id) => [{ type: "UserPreference", id }],
    }),

    // 5) Update
    updateUserPreference: build.mutation<
      void,
      Pick<UserPreference, "id"> & Partial<UserPreference>
    >({
      query: ({ id, ...patch }) => ({
        url: `UserPreference/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            UserPreferenceService.util.updateQueryData(
              "getUserPreference",
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
        { type: "UserPreference", id },
      ],
    }),

    // 6) Delete
    deleteUserPreference: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `UserPreference/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "UserPreference", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetUserPreferencesPagedQuery`
export const {
  useGetUserPreferencesPagedQuery, // immediate fetch
  useLazyGetUserPreferencesPagedQuery, // lazy fetch
  useGetUserPreferenceQuery,
  useGetUserPreferencesQuery,
  useAddUserPreferenceMutation,
  useUpdateUserPreferenceMutation,
  useDeleteUserPreferenceMutation,
} = UserPreferenceService;
