import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const WorkflowExecutionService = createApi({
    reducerPath: 'WorkflowExecution', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['WorkflowExecution'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getWorkflowExecutionsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `WorkflowExecution?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'WorkflowExecution', id })),
                    { type: 'WorkflowExecution', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getWorkflowExecutions: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `WorkflowExecution?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `WorkflowExecution`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'WorkflowExecution', id })),
                    { type: 'WorkflowExecution', id: 'LIST' },
                ]
                : [{ type: 'WorkflowExecution', id: 'LIST' }],
        }),
        // 3) Create
        addWorkflowExecution: build.mutation({
            query: (body) => ({
                url: `WorkflowExecution`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'WorkflowExecution', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getWorkflowExecution: build.query({
            query: (id) => `WorkflowExecution/${id}`,
            providesTags: (result, error, id) => [{ type: 'WorkflowExecution', id }],
        }),
        // 5) Update
        updateWorkflowExecution: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `WorkflowExecution/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(WorkflowExecutionService.util.updateQueryData('getWorkflowExecution', id, (draft) => {
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
                { type: 'WorkflowExecution', id },
                { type: 'WorkflowExecution', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteWorkflowExecution: build.mutation({
            query(id) {
                return {
                    url: `WorkflowExecution/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'WorkflowExecution', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetWorkflowExecutionsPagedQuery`
export const { useGetWorkflowExecutionsPagedQuery, // immediate fetch
useLazyGetWorkflowExecutionsPagedQuery, // lazy fetch
useGetWorkflowExecutionQuery, useGetWorkflowExecutionsQuery, useAddWorkflowExecutionMutation, useUpdateWorkflowExecutionMutation, useDeleteWorkflowExecutionMutation, } = WorkflowExecutionService;
//# sourceMappingURL=WorkflowExecutionService.js.map