import { createApi } from "@reduxjs/toolkit/query/react";
import { IntegrationAccount } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type IntegrationAccountResponse = IntegrationAccount[];

export const IntegrationAccountService = createApi({
  reducerPath: "IntegrationAccount", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["IntegrationAccount"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getIntegrationAccountsPaged: build.query<
      IntegrationAccountResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `IntegrationAccount?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "IntegrationAccount" as const,
                id,
              })),
              { type: "IntegrationAccount", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getIntegrationAccounts: build.query<IntegrationAccountResponse, void>({
      query: () => `IntegrationAccount`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "IntegrationAccount" as const,
                id,
              })),
              { type: "IntegrationAccount", id: "LIST" },
            ]
          : [{ type: "IntegrationAccount", id: "LIST" }],
    }),

    // 3) Create
    addIntegrationAccount: build.mutation<
      IntegrationAccount,
      Partial<IntegrationAccount>
    >({
      query: (body) => ({
        url: `IntegrationAccount`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "IntegrationAccount", id: "LIST" }],
    }),

    // 4) Get single by ID
    getIntegrationAccount: build.query<IntegrationAccount, string>({
      query: (id) => `IntegrationAccount/${id}`,
      providesTags: (result, error, id) => [{ type: "IntegrationAccount", id }],
    }),

    // 5) Update
    updateIntegrationAccount: build.mutation<
      void,
      Pick<IntegrationAccount, "id"> & Partial<IntegrationAccount>
    >({
      query: ({ id, ...patch }) => ({
        url: `IntegrationAccount/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            IntegrationAccountService.util.updateQueryData(
              "getIntegrationAccount",
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
        { type: "IntegrationAccount", id },
      ],
    }),

    // 6) Delete
    deleteIntegrationAccount: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `IntegrationAccount/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "IntegrationAccount", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetIntegrationAccountsPagedQuery`
export const {
  useGetIntegrationAccountsPagedQuery, // immediate fetch
  useLazyGetIntegrationAccountsPagedQuery, // lazy fetch
  useGetIntegrationAccountQuery,
  useGetIntegrationAccountsQuery,
  useAddIntegrationAccountMutation,
  useUpdateIntegrationAccountMutation,
  useDeleteIntegrationAccountMutation,
} = IntegrationAccountService;
