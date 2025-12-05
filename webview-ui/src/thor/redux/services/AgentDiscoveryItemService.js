import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const AgentDiscoveryItemService = createApi({
    reducerPath: "AgentDiscoveryItem", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["AgentDiscoveryItem"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getAgentDiscoveryItemsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `AgentDiscoveryItem?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "AgentDiscoveryItem",
                        id,
                    })),
                    { type: "AgentDiscoveryItem", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getAgentDiscoveryItems: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `AgentDiscoveryItem?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `AgentDiscoveryItem`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "AgentDiscoveryItem",
                        id,
                    })),
                    { type: "AgentDiscoveryItem", id: "LIST" },
                ]
                : [{ type: "AgentDiscoveryItem", id: "LIST" }],
        }),
        // 3) Create
        addAgentDiscoveryItem: build.mutation({
            query: (body) => ({
                url: `AgentDiscoveryItem`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "AgentDiscoveryItem", id: "LIST" }],
        }),
        // 4) Get single by ID
        getAgentDiscoveryItem: build.query({
            query: (id) => `AgentDiscoveryItem/${id}`,
            providesTags: (result, error, id) => [{ type: "AgentDiscoveryItem", id }],
        }),
        // 5) Update
        updateAgentDiscoveryItem: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `AgentDiscoveryItem/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(AgentDiscoveryItemService.util.updateQueryData("getAgentDiscoveryItem", id, (draft) => {
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
                { type: "AgentDiscoveryItem", id },
                { type: "AgentDiscoveryItem", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteAgentDiscoveryItem: build.mutation({
            query(id) {
                return {
                    url: `AgentDiscoveryItem/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "AgentDiscoveryItem", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetAgentDiscoveryItemsPagedQuery`
export const { useGetAgentDiscoveryItemsPagedQuery, // immediate fetch
useLazyGetAgentDiscoveryItemsPagedQuery, // lazy fetch
useGetAgentDiscoveryItemQuery, useGetAgentDiscoveryItemsQuery, useAddAgentDiscoveryItemMutation, useUpdateAgentDiscoveryItemMutation, useDeleteAgentDiscoveryItemMutation, } = AgentDiscoveryItemService;
//# sourceMappingURL=AgentDiscoveryItemService.js.map