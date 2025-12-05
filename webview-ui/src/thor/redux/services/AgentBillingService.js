import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query
export const AgentBillingService = createApi({
    reducerPath: "AgentBilling", // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ["AgentBilling"],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getAgentBillingsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `AgentBilling?${q.join("&")}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "AgentBilling",
                        id,
                    })),
                    { type: "AgentBilling", id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getAgentBillings: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `AgentBilling?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `AgentBilling`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({
                        type: "AgentBilling",
                        id,
                    })),
                    { type: "AgentBilling", id: "LIST" },
                ]
                : [{ type: "AgentBilling", id: "LIST" }],
        }),
        // 3) Create
        addAgentBilling: build.mutation({
            query: (body) => ({
                url: `AgentBilling`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "AgentBilling", id: "LIST" }],
        }),
        // 4) Get single by ID
        getAgentBilling: build.query({
            query: (id) => `AgentBilling/${id}`,
            providesTags: (result, error, id) => [{ type: "AgentBilling", id }],
        }),
        // 5) Update
        updateAgentBilling: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `AgentBilling/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(AgentBillingService.util.updateQueryData("getAgentBilling", id, (draft) => {
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
                { type: "AgentBilling", id },
                { type: "AgentBilling", id: "LIST" },
            ],
        }),
        // 6) Delete
        deleteAgentBilling: build.mutation({
            query(id) {
                return {
                    url: `AgentBilling/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [{ type: "AgentBilling", id }],
        }),
    }),
});
// Notice we now also export `useLazyGetAgentBillingsPagedQuery`
export const { useGetAgentBillingsPagedQuery, // immediate fetch
useLazyGetAgentBillingsPagedQuery, // lazy fetch
useGetAgentBillingQuery, useGetAgentBillingsQuery, useAddAgentBillingMutation, useUpdateAgentBillingMutation, useDeleteAgentBillingMutation, } = AgentBillingService;
//# sourceMappingURL=AgentBillingService.js.map