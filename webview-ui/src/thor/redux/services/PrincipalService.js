import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const PrincipalService = createApi({
    reducerPath: 'Principal', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Principal'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPrincipalsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Principal?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Principal', id })),
                    { type: 'Principal', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPrincipals: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Principal?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Principal`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Principal', id })),
                    { type: 'Principal', id: 'LIST' },
                ]
                : [{ type: 'Principal', id: 'LIST' }],
        }),
        // 3) Create
        addPrincipal: build.mutation({
            query: (body) => ({
                url: `Principal`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Principal', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getPrincipal: build.query({
            query: (id) => `Principal/${id}`,
            providesTags: (result, error, id) => [{ type: 'Principal', id }],
        }),
        // 5) Update
        updatePrincipal: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Principal/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PrincipalService.util.updateQueryData('getPrincipal', id, (draft) => {
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
                { type: 'Principal', id },
                { type: 'Principal', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deletePrincipal: build.mutation({
            query(id) {
                return {
                    url: `Principal/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Principal', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetPrincipalsPagedQuery`
export const { useGetPrincipalsPagedQuery, // immediate fetch
useLazyGetPrincipalsPagedQuery, // lazy fetch
useGetPrincipalQuery, useGetPrincipalsQuery, useAddPrincipalMutation, useUpdatePrincipalMutation, useDeletePrincipalMutation, } = PrincipalService;
//# sourceMappingURL=PrincipalService.js.map