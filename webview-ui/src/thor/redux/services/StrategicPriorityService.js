import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const StrategicPriorityService = createApi({
    reducerPath: 'StrategicPriority', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['StrategicPriority'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getStrategicPrioritysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `StrategicPriority?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'StrategicPriority', id })),
                    { type: 'StrategicPriority', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getStrategicPrioritys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `StrategicPriority?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `StrategicPriority`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'StrategicPriority', id })),
                    { type: 'StrategicPriority', id: 'LIST' },
                ]
                : [{ type: 'StrategicPriority', id: 'LIST' }],
        }),
        // 3) Create
        addStrategicPriority: build.mutation({
            query: (body) => ({
                url: `StrategicPriority`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'StrategicPriority', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getStrategicPriority: build.query({
            query: (id) => `StrategicPriority/${id}`,
            providesTags: (result, error, id) => [{ type: 'StrategicPriority', id }],
        }),
        // 5) Update
        updateStrategicPriority: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `StrategicPriority/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(StrategicPriorityService.util.updateQueryData('getStrategicPriority', id, (draft) => {
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
                { type: 'StrategicPriority', id },
                { type: 'StrategicPriority', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteStrategicPriority: build.mutation({
            query(id) {
                return {
                    url: `StrategicPriority/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'StrategicPriority', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetStrategicPrioritysPagedQuery`
export const { useGetStrategicPrioritysPagedQuery, // immediate fetch
useLazyGetStrategicPrioritysPagedQuery, // lazy fetch
useGetStrategicPriorityQuery, useGetStrategicPrioritysQuery, useAddStrategicPriorityMutation, useUpdateStrategicPriorityMutation, useDeleteStrategicPriorityMutation, } = StrategicPriorityService;
//# sourceMappingURL=StrategicPriorityService.js.map