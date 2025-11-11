import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OrganizationService = createApi({
    reducerPath: 'Organization', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Organization'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOrganizationsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Organization?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Organization', id })),
                    { type: 'Organization', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOrganizations: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Organization?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Organization`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Organization', id })),
                    { type: 'Organization', id: 'LIST' },
                ]
                : [{ type: 'Organization', id: 'LIST' }],
        }),
        // 3) Create
        addOrganization: build.mutation({
            query: (body) => ({
                url: `Organization`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOrganization: build.query({
            query: (id) => `Organization/${id}`,
            providesTags: (result, error, id) => [{ type: 'Organization', id }],
        }),
        // 5) Update
        updateOrganization: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Organization/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OrganizationService.util.updateQueryData('getOrganization', id, (draft) => {
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
                { type: 'Organization', id },
                { type: 'Organization', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOrganization: build.mutation({
            query(id) {
                return {
                    url: `Organization/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Organization', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOrganizationsPagedQuery`
export const { useGetOrganizationsPagedQuery, // immediate fetch
useLazyGetOrganizationsPagedQuery, // lazy fetch
useGetOrganizationQuery, useGetOrganizationsQuery, useAddOrganizationMutation, useUpdateOrganizationMutation, useDeleteOrganizationMutation, } = OrganizationService;
//# sourceMappingURL=OrganizationService.js.map