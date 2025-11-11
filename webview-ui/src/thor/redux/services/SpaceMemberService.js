import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SpaceMemberService = createApi({
    reducerPath: 'SpaceMember', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SpaceMember'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSpaceMembersPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SpaceMember?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SpaceMember', id })),
                    { type: 'SpaceMember', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSpaceMembers: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SpaceMember?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SpaceMember`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SpaceMember', id })),
                    { type: 'SpaceMember', id: 'LIST' },
                ]
                : [{ type: 'SpaceMember', id: 'LIST' }],
        }),
        // 3) Create
        addSpaceMember: build.mutation({
            query: (body) => ({
                url: `SpaceMember`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SpaceMember', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSpaceMember: build.query({
            query: (id) => `SpaceMember/${id}`,
            providesTags: (result, error, id) => [{ type: 'SpaceMember', id }],
        }),
        // 5) Update
        updateSpaceMember: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SpaceMember/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SpaceMemberService.util.updateQueryData('getSpaceMember', id, (draft) => {
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
                { type: 'SpaceMember', id },
                { type: 'SpaceMember', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSpaceMember: build.mutation({
            query(id) {
                return {
                    url: `SpaceMember/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SpaceMember', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSpaceMembersPagedQuery`
export const { useGetSpaceMembersPagedQuery, // immediate fetch
useLazyGetSpaceMembersPagedQuery, // lazy fetch
useGetSpaceMemberQuery, useGetSpaceMembersQuery, useAddSpaceMemberMutation, useUpdateSpaceMemberMutation, useDeleteSpaceMemberMutation, } = SpaceMemberService;
//# sourceMappingURL=SpaceMemberService.js.map