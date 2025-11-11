import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ApplicationService = createApi({
    reducerPath: 'Application', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Application'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getApplicationsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Application?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Application', id })),
                    { type: 'Application', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getApplications: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Application?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Application`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Application', id })),
                    { type: 'Application', id: 'LIST' },
                ]
                : [{ type: 'Application', id: 'LIST' }],
        }),
        // 3) Create
        addApplication: build.mutation({
            query: (body) => ({
                url: `Application`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Application', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getApplication: build.query({
            query: (id) => `Application/${id}`,
            providesTags: (result, error, id) => [{ type: 'Application', id }],
        }),
        // 5) Update
        updateApplication: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Application/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ApplicationService.util.updateQueryData('getApplication', id, (draft) => {
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
                { type: 'Application', id },
                { type: 'Application', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteApplication: build.mutation({
            query(id) {
                return {
                    url: `Application/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Application', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetApplicationsPagedQuery`
export const { useGetApplicationsPagedQuery, // immediate fetch
useLazyGetApplicationsPagedQuery, // lazy fetch
useGetApplicationQuery, useGetApplicationsQuery, useAddApplicationMutation, useUpdateApplicationMutation, useDeleteApplicationMutation, } = ApplicationService;
//# sourceMappingURL=ApplicationService.js.map