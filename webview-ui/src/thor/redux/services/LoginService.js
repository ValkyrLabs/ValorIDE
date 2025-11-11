import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const LoginService = createApi({
    reducerPath: 'Login', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Login'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getLoginsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Login?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Login', id })),
                    { type: 'Login', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getLogins: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Login?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Login`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Login', id })),
                    { type: 'Login', id: 'LIST' },
                ]
                : [{ type: 'Login', id: 'LIST' }],
        }),
        // 3) Create
        addLogin: build.mutation({
            query: (body) => ({
                url: `Login`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Login', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getLogin: build.query({
            query: (id) => `Login/${id}`,
            providesTags: (result, error, id) => [{ type: 'Login', id }],
        }),
        // 5) Update
        updateLogin: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Login/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(LoginService.util.updateQueryData('getLogin', id, (draft) => {
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
                { type: 'Login', id },
                { type: 'Login', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteLogin: build.mutation({
            query(id) {
                return {
                    url: `Login/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Login', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetLoginsPagedQuery`
export const { useGetLoginsPagedQuery, // immediate fetch
useLazyGetLoginsPagedQuery, // lazy fetch
useGetLoginQuery, useGetLoginsQuery, useAddLoginMutation, useUpdateLoginMutation, useDeleteLoginMutation, } = LoginService;
//# sourceMappingURL=LoginService.js.map