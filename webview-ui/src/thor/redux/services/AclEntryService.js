import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const AclEntryService = createApi({
    reducerPath: 'AclEntry', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['AclEntry'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getAclEntrysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `AclEntry?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'AclEntry', id })),
                    { type: 'AclEntry', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getAclEntrys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `AclEntry?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `AclEntry`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'AclEntry', id })),
                    { type: 'AclEntry', id: 'LIST' },
                ]
                : [{ type: 'AclEntry', id: 'LIST' }],
        }),
        // 3) Create
        addAclEntry: build.mutation({
            query: (body) => ({
                url: `AclEntry`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'AclEntry', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getAclEntry: build.query({
            query: (id) => `AclEntry/${id}`,
            providesTags: (result, error, id) => [{ type: 'AclEntry', id }],
        }),
        // 5) Update
        updateAclEntry: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `AclEntry/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(AclEntryService.util.updateQueryData('getAclEntry', id, (draft) => {
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
                { type: 'AclEntry', id },
                { type: 'AclEntry', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteAclEntry: build.mutation({
            query(id) {
                return {
                    url: `AclEntry/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'AclEntry', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetAclEntrysPagedQuery`
export const { useGetAclEntrysPagedQuery, // immediate fetch
useLazyGetAclEntrysPagedQuery, // lazy fetch
useGetAclEntryQuery, useGetAclEntrysQuery, useAddAclEntryMutation, useUpdateAclEntryMutation, useDeleteAclEntryMutation, } = AclEntryService;
//# sourceMappingURL=AclEntryService.js.map