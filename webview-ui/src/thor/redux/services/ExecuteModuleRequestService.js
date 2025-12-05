import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const ExecuteModuleRequestService = createApi({
    reducerPath: "ExecuteModuleRequest", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["ExecuteModuleRequest"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getExecuteModuleRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ExecuteModuleRequest?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "ExecuteModuleRequest",
                        id,
                    })),
                    { type: "ExecuteModuleRequest", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getExecuteModuleRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ExecuteModuleRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ExecuteModuleRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "ExecuteModuleRequest",
                        id,
                    })),
                    { type: "ExecuteModuleRequest", id: "LIST" },
                ]
                : [{ type: "ExecuteModuleRequest", id: "LIST" }],
        }),
        // 3) Create
        addExecuteModuleRequest: build.mutation({
            query: (body) => ({
                url: `ExecuteModuleRequest`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "ExecuteModuleRequest", id: "LIST" }],
        }),
        // 4) Get single by ID
        getExecuteModuleRequest: build.query({
            query: (id) => `ExecuteModuleRequest/${id}`,
            providesTags: (result, error, id) => [
                { type: "ExecuteModuleRequest", id },
            ],
        }),
        // 5) Update
        updateExecuteModuleRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ExecuteModuleRequest/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ExecuteModuleRequestService.util.updateQueryData("getExecuteModuleRequest", id, (draft) => {
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
                { type: "ExecuteModuleRequest", id },
                { type: "ExecuteModuleRequest", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteExecuteModuleRequest: build.mutation({
            query(id) {
                return {
                    url: `ExecuteModuleRequest/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [
                { type: "ExecuteModuleRequest", id },
            ],
        }),
    }),
});
// Notice we now also export `useLazyGetExecuteModuleRequestsPagedQuery`
export const { useGetExecuteModuleRequestsPagedQuery, // immediate fetch
useLazyGetExecuteModuleRequestsPagedQuery, // lazy fetch
useGetExecuteModuleRequestQuery, useGetExecuteModuleRequestsQuery, useAddExecuteModuleRequestMutation, useUpdateExecuteModuleRequestMutation, useDeleteExecuteModuleRequestMutation, } = ExecuteModuleRequestService;
//# sourceMappingURL=ExecuteModuleRequestService.js.map