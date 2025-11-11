import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ApiTrafficEventService = createApi({
    reducerPath: 'ApiTrafficEvent', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ApiTrafficEvent'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getApiTrafficEventsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ApiTrafficEvent?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ApiTrafficEvent', id })),
                    { type: 'ApiTrafficEvent', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getApiTrafficEvents: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ApiTrafficEvent?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ApiTrafficEvent`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ApiTrafficEvent', id })),
                    { type: 'ApiTrafficEvent', id: 'LIST' },
                ]
                : [{ type: 'ApiTrafficEvent', id: 'LIST' }],
        }),
        // 3) Create
        addApiTrafficEvent: build.mutation({
            query: (body) => ({
                url: `ApiTrafficEvent`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ApiTrafficEvent', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getApiTrafficEvent: build.query({
            query: (id) => `ApiTrafficEvent/${id}`,
            providesTags: (result, error, id) => [{ type: 'ApiTrafficEvent', id }],
        }),
        // 5) Update
        updateApiTrafficEvent: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ApiTrafficEvent/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ApiTrafficEventService.util.updateQueryData('getApiTrafficEvent', id, (draft) => {
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
                { type: 'ApiTrafficEvent', id },
                { type: 'ApiTrafficEvent', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteApiTrafficEvent: build.mutation({
            query(id) {
                return {
                    url: `ApiTrafficEvent/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ApiTrafficEvent', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetApiTrafficEventsPagedQuery`
export const { useGetApiTrafficEventsPagedQuery, // immediate fetch
useLazyGetApiTrafficEventsPagedQuery, // lazy fetch
useGetApiTrafficEventQuery, useGetApiTrafficEventsQuery, useAddApiTrafficEventMutation, useUpdateApiTrafficEventMutation, useDeleteApiTrafficEventMutation, } = ApiTrafficEventService;
//# sourceMappingURL=ApiTrafficEventService.js.map