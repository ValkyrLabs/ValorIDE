import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const WorkflowService = createApi({
    reducerPath: 'Workflow', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Workflow'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getWorkflowsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Workflow?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Workflow', id })),
                    { type: 'Workflow', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getWorkflows: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Workflow?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Workflow`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Workflow', id })),
                    { type: 'Workflow', id: 'LIST' },
                ]
                : [{ type: 'Workflow', id: 'LIST' }],
        }),
        // 3) Create
        addWorkflow: build.mutation({
            query: (body) => ({
                url: `Workflow`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Workflow', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getWorkflow: build.query({
            query: (id) => `Workflow/${id}`,
            providesTags: (result, error, id) => [{ type: 'Workflow', id }],
        }),
        // 5) Update
        updateWorkflow: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Workflow/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(WorkflowService.util.updateQueryData('getWorkflow', id, (draft) => {
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
                { type: 'Workflow', id },
                { type: 'Workflow', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteWorkflow: build.mutation({
            query(id) {
                return {
                    url: `Workflow/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Workflow', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetWorkflowsPagedQuery`
export const { useGetWorkflowsPagedQuery, // immediate fetch
useLazyGetWorkflowsPagedQuery, // lazy fetch
useGetWorkflowQuery, useGetWorkflowsQuery, useAddWorkflowMutation, useUpdateWorkflowMutation, useDeleteWorkflowMutation, } = WorkflowService;
//# sourceMappingURL=WorkflowService.js.map