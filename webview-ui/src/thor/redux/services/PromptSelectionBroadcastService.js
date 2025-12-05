import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const PromptSelectionBroadcastService = createApi({
    reducerPath: "PromptSelectionBroadcast", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["PromptSelectionBroadcast"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPromptSelectionBroadcastsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `PromptSelectionBroadcast?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "PromptSelectionBroadcast",
                        id,
                    })),
                    { type: "PromptSelectionBroadcast", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPromptSelectionBroadcasts: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `PromptSelectionBroadcast?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `PromptSelectionBroadcast`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "PromptSelectionBroadcast",
                        id,
                    })),
                    { type: "PromptSelectionBroadcast", id: "LIST" },
                ]
                : [{ type: "PromptSelectionBroadcast", id: "LIST" }],
        }),
        // 3) Create
        addPromptSelectionBroadcast: build.mutation({
            query: (body) => ({
                url: `PromptSelectionBroadcast`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "PromptSelectionBroadcast", id: "LIST" }],
        }),
        // 4) Get single by ID
        getPromptSelectionBroadcast: build.query({
            query: (id) => `PromptSelectionBroadcast/${id}`,
            providesTags: (result, error, id) => [
                { type: "PromptSelectionBroadcast", id },
            ],
        }),
        // 5) Update
        updatePromptSelectionBroadcast: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `PromptSelectionBroadcast/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PromptSelectionBroadcastService.util.updateQueryData("getPromptSelectionBroadcast", id, (draft) => {
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
                { type: "PromptSelectionBroadcast", id },
                { type: "PromptSelectionBroadcast", id: "LIST" },
            ],
        }),
        // 6) Delete
        deletePromptSelectionBroadcast: build.mutation({
            query(id) {
                return {
                    url: `PromptSelectionBroadcast/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "PromptSelectionBroadcast", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetPromptSelectionBroadcastsPagedQuery`
export const { useGetPromptSelectionBroadcastsPagedQuery, // immediate fetch
useLazyGetPromptSelectionBroadcastsPagedQuery, // lazy fetch
useGetPromptSelectionBroadcastQuery, useGetPromptSelectionBroadcastsQuery, useAddPromptSelectionBroadcastMutation, useUpdatePromptSelectionBroadcastMutation, useDeletePromptSelectionBroadcastMutation, } = PromptSelectionBroadcastService;
//# sourceMappingURL=PromptSelectionBroadcastService.js.map