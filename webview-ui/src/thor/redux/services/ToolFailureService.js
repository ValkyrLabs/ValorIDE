import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const ToolFailureService = createApi({
    reducerPath: "ToolFailure", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["ToolFailure"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getToolFailuresPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ToolFailure?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: "ToolFailure", id })),
                    { type: "ToolFailure", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getToolFailures: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ToolFailure?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ToolFailure`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: "ToolFailure", id })),
                    { type: "ToolFailure", id: "LIST" },
                ]
                : [{ type: "ToolFailure", id: "LIST" }],
        }),
        // 3) Create
        addToolFailure: build.mutation({
            query: (body) => ({
                url: `ToolFailure`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "ToolFailure", id: "LIST" }],
        }),
        // 4) Get single by ID
        getToolFailure: build.query({
            query: (id) => `ToolFailure/${id}`,
            providesTags: (result, error, id) => [{ type: "ToolFailure", id }],
        }),
        // 5) Update
        updateToolFailure: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ToolFailure/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ToolFailureService.util.updateQueryData("getToolFailure", id, (draft) => {
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
                { type: "ToolFailure", id },
                { type: "ToolFailure", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteToolFailure: build.mutation({
            query(id) {
                return {
                    url: `ToolFailure/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [{ type: "ToolFailure", id }],
        }),
    }),
});
// Notice we now also export `useLazyGetToolFailuresPagedQuery`
export const { useGetToolFailuresPagedQuery, // immediate fetch
useLazyGetToolFailuresPagedQuery, // lazy fetch
useGetToolFailureQuery, useGetToolFailuresQuery, useAddToolFailureMutation, useUpdateToolFailureMutation, useDeleteToolFailureMutation, } = ToolFailureService;
//# sourceMappingURL=ToolFailureService.js.map