import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const PrincipalRolesService = createApi({
    reducerPath: 'PrincipalRoles', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['PrincipalRoles'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPrincipalRolessPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `PrincipalRoles?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PrincipalRoles', id })),
                    { type: 'PrincipalRoles', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPrincipalRoless: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `PrincipalRoles?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `PrincipalRoles`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PrincipalRoles', id })),
                    { type: 'PrincipalRoles', id: 'LIST' },
                ]
                : [{ type: 'PrincipalRoles', id: 'LIST' }],
        }),
        // 3) Create
        addPrincipalRoles: build.mutation({
            query: (body) => ({
                url: `PrincipalRoles`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'PrincipalRoles', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getPrincipalRoles: build.query({
            query: (id) => `PrincipalRoles/${id}`,
            providesTags: (result, error, id) => [{ type: 'PrincipalRoles', id }],
        }),
        // 5) Update
        updatePrincipalRoles: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `PrincipalRoles/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PrincipalRolesService.util.updateQueryData('getPrincipalRoles', id, (draft) => {
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
                { type: 'PrincipalRoles', id },
                { type: 'PrincipalRoles', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deletePrincipalRoles: build.mutation({
            query(id) {
                return {
                    url: `PrincipalRoles/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'PrincipalRoles', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetPrincipalRolessPagedQuery`
export const { useGetPrincipalRolessPagedQuery, // immediate fetch
useLazyGetPrincipalRolessPagedQuery, // lazy fetch
useGetPrincipalRolesQuery, useGetPrincipalRolessQuery, useAddPrincipalRolesMutation, useUpdatePrincipalRolesMutation, useDeletePrincipalRolesMutation, } = PrincipalRolesService;
//# sourceMappingURL=PrincipalRolesService.js.map