import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const AclClassService = createApi({
    reducerPath: 'AclClass', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['AclClass'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getAclClasssPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `AclClass?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'AclClass', id })),
                    { type: 'AclClass', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getAclClasss: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `AclClass?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `AclClass`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'AclClass', id })),
                    { type: 'AclClass', id: 'LIST' },
                ]
                : [{ type: 'AclClass', id: 'LIST' }],
        }),
        // 3) Create
        addAclClass: build.mutation({
            query: (body) => ({
                url: `AclClass`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'AclClass', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getAclClass: build.query({
            query: (id) => `AclClass/${id}`,
            providesTags: (result, error, id) => [{ type: 'AclClass', id }],
        }),
        // 5) Update
        updateAclClass: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `AclClass/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(AclClassService.util.updateQueryData('getAclClass', id, (draft) => {
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
                { type: 'AclClass', id },
                { type: 'AclClass', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteAclClass: build.mutation({
            query(id) {
                return {
                    url: `AclClass/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'AclClass', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetAclClasssPagedQuery`
export const { useGetAclClasssPagedQuery, // immediate fetch
useLazyGetAclClasssPagedQuery, // lazy fetch
useGetAclClassQuery, useGetAclClasssQuery, useAddAclClassMutation, useUpdateAclClassMutation, useDeleteAclClassMutation, } = AclClassService;
//# sourceMappingURL=AclClassService.js.map