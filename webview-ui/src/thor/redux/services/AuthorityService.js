import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const AuthorityService = createApi({
    reducerPath: 'Authority', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Authority'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getAuthoritysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Authority?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Authority', id })),
                    { type: 'Authority', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getAuthoritys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Authority?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Authority`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Authority', id })),
                    { type: 'Authority', id: 'LIST' },
                ]
                : [{ type: 'Authority', id: 'LIST' }],
        }),
        // 3) Create
        addAuthority: build.mutation({
            query: (body) => ({
                url: `Authority`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Authority', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getAuthority: build.query({
            query: (id) => `Authority/${id}`,
            providesTags: (result, error, id) => [{ type: 'Authority', id }],
        }),
        // 5) Update
        updateAuthority: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Authority/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(AuthorityService.util.updateQueryData('getAuthority', id, (draft) => {
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
                { type: 'Authority', id },
                { type: 'Authority', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteAuthority: build.mutation({
            query(id) {
                return {
                    url: `Authority/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Authority', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetAuthoritysPagedQuery`
export const { useGetAuthoritysPagedQuery, // immediate fetch
useLazyGetAuthoritysPagedQuery, // lazy fetch
useGetAuthorityQuery, useGetAuthoritysQuery, useAddAuthorityMutation, useUpdateAuthorityMutation, useDeleteAuthorityMutation, } = AuthorityService;
//# sourceMappingURL=AuthorityService.js.map