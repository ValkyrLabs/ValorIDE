import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const McpServiceResponseService = createApi({
    reducerPath: "McpServiceResponse", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["McpServiceResponse"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpServiceResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpServiceResponse?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "McpServiceResponse",
                        id,
                    })),
                    { type: "McpServiceResponse", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpServiceResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpServiceResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpServiceResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "McpServiceResponse",
                        id,
                    })),
                    { type: "McpServiceResponse", id: "LIST" },
                ]
                : [{ type: "McpServiceResponse", id: "LIST" }],
        }),
        // 3) Create
        addMcpServiceResponse: build.mutation({
            query: (body) => ({
                url: `McpServiceResponse`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "McpServiceResponse", id: "LIST" }],
        }),
        // 4) Get single by ID
        getMcpServiceResponse: build.query({
            query: (id) => `McpServiceResponse/${id}`,
            providesTags: (result, error, id) => [{ type: "McpServiceResponse", id }],
        }),
        // 5) Update
        updateMcpServiceResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpServiceResponse/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpServiceResponseService.util.updateQueryData("getMcpServiceResponse", id, (draft) => {
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
                { type: "McpServiceResponse", id },
                { type: "McpServiceResponse", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteMcpServiceResponse: build.mutation({
            query(id) {
                return {
                    url: `McpServiceResponse/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "McpServiceResponse", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpServiceResponsesPagedQuery`
export const { useGetMcpServiceResponsesPagedQuery, // immediate fetch
useLazyGetMcpServiceResponsesPagedQuery, // lazy fetch
useGetMcpServiceResponseQuery, useGetMcpServiceResponsesQuery, useAddMcpServiceResponseMutation, useUpdateMcpServiceResponseMutation, useDeleteMcpServiceResponseMutation, } = McpServiceResponseService;
//# sourceMappingURL=McpServiceResponseService.js.map