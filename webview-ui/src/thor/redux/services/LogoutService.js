import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const LogoutService = createApi({
    reducerPath: 'Logout', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Logout'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getLogoutsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Logout?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Logout', id })),
                    { type: 'Logout', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getLogouts: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Logout?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Logout`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Logout', id })),
                    { type: 'Logout', id: 'LIST' },
                ]
                : [{ type: 'Logout', id: 'LIST' }],
        }),
        // 3) Create
        addLogout: build.mutation({
            query: (body) => ({
                url: `Logout`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Logout', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getLogout: build.query({
            query: (id) => `Logout/${id}`,
            providesTags: (result, error, id) => [{ type: 'Logout', id }],
        }),
        // 5) Update
        updateLogout: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Logout/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(LogoutService.util.updateQueryData('getLogout', id, (draft) => {
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
                { type: 'Logout', id },
                { type: 'Logout', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteLogout: build.mutation({
            query(id) {
                return {
                    url: `Logout/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Logout', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetLogoutsPagedQuery`
export const { useGetLogoutsPagedQuery, // immediate fetch
useLazyGetLogoutsPagedQuery, // lazy fetch
useGetLogoutQuery, useGetLogoutsQuery, useAddLogoutMutation, useUpdateLogoutMutation, useDeleteLogoutMutation, } = LogoutService;
//# sourceMappingURL=LogoutService.js.map