import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SpaceService = createApi({
    reducerPath: 'Space', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Space'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSpacesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Space?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Space', id })),
                    { type: 'Space', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSpaces: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Space?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Space`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Space', id })),
                    { type: 'Space', id: 'LIST' },
                ]
                : [{ type: 'Space', id: 'LIST' }],
        }),
        // 3) Create
        addSpace: build.mutation({
            query: (body) => ({
                url: `Space`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Space', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSpace: build.query({
            query: (id) => `Space/${id}`,
            providesTags: (result, error, id) => [{ type: 'Space', id }],
        }),
        // 5) Update
        updateSpace: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Space/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SpaceService.util.updateQueryData('getSpace', id, (draft) => {
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
                { type: 'Space', id },
                { type: 'Space', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSpace: build.mutation({
            query(id) {
                return {
                    url: `Space/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Space', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSpacesPagedQuery`
export const { useGetSpacesPagedQuery, // immediate fetch
useLazyGetSpacesPagedQuery, // lazy fetch
useGetSpaceQuery, useGetSpacesQuery, useAddSpaceMutation, useUpdateSpaceMutation, useDeleteSpaceMutation, } = SpaceService;
//# sourceMappingURL=SpaceService.js.map