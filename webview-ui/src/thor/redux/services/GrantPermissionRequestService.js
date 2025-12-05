import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const GrantPermissionRequestService = createApi({
    reducerPath: "GrantPermissionRequest", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["GrantPermissionRequest"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getGrantPermissionRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `GrantPermissionRequest?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "GrantPermissionRequest",
                        id,
                    })),
                    { type: "GrantPermissionRequest", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getGrantPermissionRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `GrantPermissionRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `GrantPermissionRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "GrantPermissionRequest",
                        id,
                    })),
                    { type: "GrantPermissionRequest", id: "LIST" },
                ]
                : [{ type: "GrantPermissionRequest", id: "LIST" }],
        }),
        // 3) Create
        addGrantPermissionRequest: build.mutation({
            query: (body) => ({
                url: `GrantPermissionRequest`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "GrantPermissionRequest", id: "LIST" }],
        }),
        // 4) Get single by ID
        getGrantPermissionRequest: build.query({
            query: (id) => `GrantPermissionRequest/${id}`,
            providesTags: (result, error, id) => [
                { type: "GrantPermissionRequest", id },
            ],
        }),
        // 5) Update
        updateGrantPermissionRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `GrantPermissionRequest/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(GrantPermissionRequestService.util.updateQueryData("getGrantPermissionRequest", id, (draft) => {
                        Object.assign(draft, patch);
                    }));
                    try {
                        await queryFulfilled;
                    }
                    catch {
                        patchResult.undo();
                    }
                }
            },
            invalidatesTags: (result, error, { id }) => [
                { type: "GrantPermissionRequest", id },
                { type: "GrantPermissionRequest", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteGrantPermissionRequest: build.mutation({
            query(id) {
                return {
                    url: `GrantPermissionRequest/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "GrantPermissionRequest", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetGrantPermissionRequestsPagedQuery`
export const { useGetGrantPermissionRequestsPagedQuery, // immediate fetch
useLazyGetGrantPermissionRequestsPagedQuery, // lazy fetch
useGetGrantPermissionRequestQuery, useGetGrantPermissionRequestsQuery, useAddGrantPermissionRequestMutation, useUpdateGrantPermissionRequestMutation, useDeleteGrantPermissionRequestMutation, } = GrantPermissionRequestService;
//# sourceMappingURL=GrantPermissionRequestService.js.map