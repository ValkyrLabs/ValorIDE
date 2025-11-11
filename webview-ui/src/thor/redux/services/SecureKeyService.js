import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SecureKeyService = createApi({
    reducerPath: 'SecureKey', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SecureKey'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSecureKeysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SecureKey?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SecureKey', id })),
                    { type: 'SecureKey', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSecureKeys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SecureKey?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SecureKey`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SecureKey', id })),
                    { type: 'SecureKey', id: 'LIST' },
                ]
                : [{ type: 'SecureKey', id: 'LIST' }],
        }),
        // 3) Create
        addSecureKey: build.mutation({
            query: (body) => ({
                url: `SecureKey`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SecureKey', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSecureKey: build.query({
            query: (id) => `SecureKey/${id}`,
            providesTags: (result, error, id) => [{ type: 'SecureKey', id }],
        }),
        // 5) Update
        updateSecureKey: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SecureKey/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SecureKeyService.util.updateQueryData('getSecureKey', id, (draft) => {
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
                { type: 'SecureKey', id },
                { type: 'SecureKey', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSecureKey: build.mutation({
            query(id) {
                return {
                    url: `SecureKey/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SecureKey', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSecureKeysPagedQuery`
export const { useGetSecureKeysPagedQuery, // immediate fetch
useLazyGetSecureKeysPagedQuery, // lazy fetch
useGetSecureKeyQuery, useGetSecureKeysQuery, useAddSecureKeyMutation, useUpdateSecureKeyMutation, useDeleteSecureKeyMutation, } = SecureKeyService;
//# sourceMappingURL=SecureKeyService.js.map