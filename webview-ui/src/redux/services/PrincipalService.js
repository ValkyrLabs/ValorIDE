import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery"; // Use Thor base query
export const PrincipalService = createApi({
    reducerPath: "Principal", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["Principal"],
    endpoints: (build) => ({
        getPrincipals: build.query({
            query: () => "Principal",
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: "Principal", id })),
                    { type: "Principal", id: "LIST" },
                ]
                : [{ type: "Principal", id: "LIST" }],
        }),
        // the only thing we need to override. leave the rest for now
        addPrincipal: build.mutation({
            query: (body) => ({
                url: `auth/signup`, // the magic override
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Principal", id: "LIST" }],
        }),
        getPrincipal: build.query({
            query: (id) => `Principal/${id}`,
            providesTags: (result, error, id) => [{ type: "Principal", id }],
        }),
        updatePrincipal: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Principal/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(PrincipalService.util.updateQueryData("getPrincipal", id, (draft) => {
                    Object.assign(draft, patch);
                }));
                try {
                    await queryFulfilled;
                }
                catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: (result, error, { id }) => [{ type: "Principal", id }],
        }),
        deletePrincipal: build.mutation({
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
export const { useGetPrincipalQuery, useGetPrincipalsQuery, useAddPrincipalMutation, useUpdatePrincipalMutation, useDeletePrincipalMutation, } = PrincipalService;
//# sourceMappingURL=PrincipalService.js.map