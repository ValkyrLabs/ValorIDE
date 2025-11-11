import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const RoleService = createApi({
    reducerPath: 'Role', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Role'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getRolesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Role?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Role', id })),
                    { type: 'Role', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getRoles: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Role?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Role`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Role', id })),
                    { type: 'Role', id: 'LIST' },
                ]
                : [{ type: 'Role', id: 'LIST' }],
        }),
        // 3) Create
        addRole: build.mutation({
            query: (body) => ({
                url: `Role`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Role', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getRole: build.query({
            query: (id) => `Role/${id}`,
            providesTags: (result, error, id) => [{ type: 'Role', id }],
        }),
        // 5) Update
        updateRole: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Role/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(RoleService.util.updateQueryData('getRole', id, (draft) => {
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
                { type: 'Role', id },
                { type: 'Role', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteRole: build.mutation({
            query(id) {
                return {
                    url: `Role/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Role', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetRolesPagedQuery`
export const { useGetRolesPagedQuery, // immediate fetch
useLazyGetRolesPagedQuery, // lazy fetch
useGetRoleQuery, useGetRolesQuery, useAddRoleMutation, useUpdateRoleMutation, useDeleteRoleMutation, } = RoleService;
//# sourceMappingURL=RoleService.js.map