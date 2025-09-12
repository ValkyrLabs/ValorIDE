import { createApi } from "@reduxjs/toolkit/query/react";

import { Principal } from "@thor/model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PrincipalResponse = Principal[];

export const PrincipalService = createApi({
  reducerPath: "Principal", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["Principal"],
  endpoints: (build) => ({
    getPrincipals: build.query<PrincipalResponse, void>({
      query: () => "Principal",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Principal" as const, id })),
              { type: "Principal", id: "LIST" },
            ]
          : [{ type: "Principal", id: "LIST" }],
    }),
    // the only thing we need to override. leave the rest for now
    addPrincipal: build.mutation<Principal, Partial<Principal>>({
      query: (body) => ({
        url: `auth/signup`, // the magic override
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Principal", id: "LIST" }],
    }),
    getPrincipal: build.query<Principal, string>({
      query: (id) => `Principal/${id}`,
      providesTags: (result, error, id) => [{ type: "Principal", id }],
    }),
    updatePrincipal: build.mutation<
      void,
      Pick<Principal, "id"> & Partial<Principal>
    >({
      query: ({ id, ...patch }) => ({
        url: `Principal/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          PrincipalService.util.updateQueryData("getPrincipal", id, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Principal", id }],
    }),
    deletePrincipal: build.mutation<{ success: boolean; id: number }, number>({
      query(id) {
        return {
          url: `Principal/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Principal", id }],
    }),
  }),
});

export const {
  useGetPrincipalQuery,
  useGetPrincipalsQuery,
  useAddPrincipalMutation,
  useUpdatePrincipalMutation,
  useDeletePrincipalMutation,
} = PrincipalService;
