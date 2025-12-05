import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const InvokeMcpToolRequestService = createApi({
    reducerPath: "InvokeMcpToolRequest", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["InvokeMcpToolRequest"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getInvokeMcpToolRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `InvokeMcpToolRequest?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "InvokeMcpToolRequest",
                        id,
                    })),
                    { type: "InvokeMcpToolRequest", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getInvokeMcpToolRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `InvokeMcpToolRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `InvokeMcpToolRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "InvokeMcpToolRequest",
                        id,
                    })),
                    { type: "InvokeMcpToolRequest", id: "LIST" },
                ]
                : [{ type: "InvokeMcpToolRequest", id: "LIST" }],
        }),
        // 3) Create
        addInvokeMcpToolRequest: build.mutation({
            query: (body) => ({
                url: `InvokeMcpToolRequest`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "InvokeMcpToolRequest", id: "LIST" }],
        }),
        // 4) Get single by ID
        getInvokeMcpToolRequest: build.query({
            query: (id) => `InvokeMcpToolRequest/${id}`,
            providesTags: (result, error, id) => [
                { type: "InvokeMcpToolRequest", id },
            ],
        }),
        // 5) Update
        updateInvokeMcpToolRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `InvokeMcpToolRequest/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(InvokeMcpToolRequestService.util.updateQueryData("getInvokeMcpToolRequest", id, (draft) => {
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
                { type: "InvokeMcpToolRequest", id },
                { type: "InvokeMcpToolRequest", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteInvokeMcpToolRequest: build.mutation({
            query(id) {
                return {
                    url: `InvokeMcpToolRequest/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "InvokeMcpToolRequest", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetInvokeMcpToolRequestsPagedQuery`
export const { useGetInvokeMcpToolRequestsPagedQuery, // immediate fetch
useLazyGetInvokeMcpToolRequestsPagedQuery, // lazy fetch
useGetInvokeMcpToolRequestQuery, useGetInvokeMcpToolRequestsQuery, useAddInvokeMcpToolRequestMutation, useUpdateInvokeMcpToolRequestMutation, useDeleteInvokeMcpToolRequestMutation, } = InvokeMcpToolRequestService;
//# sourceMappingURL=InvokeMcpToolRequestService.js.map