import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const GoalDependencyService = createApi({
    reducerPath: 'GoalDependency', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['GoalDependency'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getGoalDependencysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `GoalDependency?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'GoalDependency', id })),
                    { type: 'GoalDependency', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getGoalDependencys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `GoalDependency?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `GoalDependency`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'GoalDependency', id })),
                    { type: 'GoalDependency', id: 'LIST' },
                ]
                : [{ type: 'GoalDependency', id: 'LIST' }],
        }),
        // 3) Create
        addGoalDependency: build.mutation({
            query: (body) => ({
                url: `GoalDependency`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'GoalDependency', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getGoalDependency: build.query({
            query: (id) => `GoalDependency/${id}`,
            providesTags: (result, error, id) => [{ type: 'GoalDependency', id }],
        }),
        // 5) Update
        updateGoalDependency: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `GoalDependency/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(GoalDependencyService.util.updateQueryData('getGoalDependency', id, (draft) => {
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
                { type: 'GoalDependency', id },
                { type: 'GoalDependency', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteGoalDependency: build.mutation({
            query(id) {
                return {
                    url: `GoalDependency/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'GoalDependency', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetGoalDependencysPagedQuery`
export const { useGetGoalDependencysPagedQuery, // immediate fetch
useLazyGetGoalDependencysPagedQuery, // lazy fetch
useGetGoalDependencyQuery, useGetGoalDependencysQuery, useAddGoalDependencyMutation, useUpdateGoalDependencyMutation, useDeleteGoalDependencyMutation, } = GoalDependencyService;
//# sourceMappingURL=GoalDependencyService.js.map