import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const PersistentLoginService = createApi({
    reducerPath: 'PersistentLogin', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['PersistentLogin'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPersistentLoginsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `PersistentLogin?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PersistentLogin', id })),
                    { type: 'PersistentLogin', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPersistentLogins: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `PersistentLogin?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `PersistentLogin`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PersistentLogin', id })),
                    { type: 'PersistentLogin', id: 'LIST' },
                ]
                : [{ type: 'PersistentLogin', id: 'LIST' }],
        }),
        // 3) Create
        addPersistentLogin: build.mutation({
            query: (body) => ({
                url: `PersistentLogin`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'PersistentLogin', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getPersistentLogin: build.query({
            query: (id) => `PersistentLogin/${id}`,
            providesTags: (result, error, id) => [{ type: 'PersistentLogin', id }],
        }),
        // 5) Update
        updatePersistentLogin: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `PersistentLogin/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PersistentLoginService.util.updateQueryData('getPersistentLogin', id, (draft) => {
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
                { type: 'PersistentLogin', id },
                { type: 'PersistentLogin', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deletePersistentLogin: build.mutation({
            query(id) {
                return {
                    url: `PersistentLogin/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'PersistentLogin', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetPersistentLoginsPagedQuery`
export const { useGetPersistentLoginsPagedQuery, // immediate fetch
useLazyGetPersistentLoginsPagedQuery, // lazy fetch
useGetPersistentLoginQuery, useGetPersistentLoginsQuery, useAddPersistentLoginMutation, useUpdatePersistentLoginMutation, useDeletePersistentLoginMutation, } = PersistentLoginService;
//# sourceMappingURL=PersistentLoginService.js.map