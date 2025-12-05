import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const McpServiceRegistryService = createApi({
    reducerPath: "McpServiceRegistry", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["McpServiceRegistry"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpServiceRegistrysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpServiceRegistry?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "McpServiceRegistry",
                        id,
                    })),
                    { type: "McpServiceRegistry", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpServiceRegistrys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpServiceRegistry?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpServiceRegistry`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "McpServiceRegistry",
                        id,
                    })),
                    { type: "McpServiceRegistry", id: "LIST" },
                ]
                : [{ type: "McpServiceRegistry", id: "LIST" }],
        }),
        // 3) Create
        addMcpServiceRegistry: build.mutation({
            query: (body) => ({
                url: `McpServiceRegistry`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "McpServiceRegistry", id: "LIST" }],
        }),
        // 4) Get single by ID
        getMcpServiceRegistry: build.query({
            query: (id) => `McpServiceRegistry/${id}`,
            providesTags: (result, error, id) => [{ type: "McpServiceRegistry", id }],
        }),
        // 5) Update
        updateMcpServiceRegistry: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpServiceRegistry/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpServiceRegistryService.util.updateQueryData("getMcpServiceRegistry", id, (draft) => {
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
                { type: "McpServiceRegistry", id },
                { type: "McpServiceRegistry", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteMcpServiceRegistry: build.mutation({
            query(id) {
                return {
                    url: `McpServiceRegistry/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "McpServiceRegistry", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpServiceRegistrysPagedQuery`
export const { useGetMcpServiceRegistrysPagedQuery, // immediate fetch
useLazyGetMcpServiceRegistrysPagedQuery, // lazy fetch
useGetMcpServiceRegistryQuery, useGetMcpServiceRegistrysQuery, useAddMcpServiceRegistryMutation, useUpdateMcpServiceRegistryMutation, useDeleteMcpServiceRegistryMutation, } = McpServiceRegistryService;
//# sourceMappingURL=McpServiceRegistryService.js.map