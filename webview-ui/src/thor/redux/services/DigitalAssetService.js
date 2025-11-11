import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const DigitalAssetService = createApi({
    reducerPath: 'DigitalAsset', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['DigitalAsset'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getDigitalAssetsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `DigitalAsset?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'DigitalAsset', id })),
                    { type: 'DigitalAsset', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getDigitalAssets: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `DigitalAsset?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `DigitalAsset`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'DigitalAsset', id })),
                    { type: 'DigitalAsset', id: 'LIST' },
                ]
                : [{ type: 'DigitalAsset', id: 'LIST' }],
        }),
        // 3) Create
        addDigitalAsset: build.mutation({
            query: (body) => ({
                url: `DigitalAsset`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'DigitalAsset', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getDigitalAsset: build.query({
            query: (id) => `DigitalAsset/${id}`,
            providesTags: (result, error, id) => [{ type: 'DigitalAsset', id }],
        }),
        // 5) Update
        updateDigitalAsset: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `DigitalAsset/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(DigitalAssetService.util.updateQueryData('getDigitalAsset', id, (draft) => {
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
                { type: 'DigitalAsset', id },
                { type: 'DigitalAsset', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteDigitalAsset: build.mutation({
            query(id) {
                return {
                    url: `DigitalAsset/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'DigitalAsset', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetDigitalAssetsPagedQuery`
export const { useGetDigitalAssetsPagedQuery, // immediate fetch
useLazyGetDigitalAssetsPagedQuery, // lazy fetch
useGetDigitalAssetQuery, useGetDigitalAssetsQuery, useAddDigitalAssetMutation, useUpdateDigitalAssetMutation, useDeleteDigitalAssetMutation, } = DigitalAssetService;
//# sourceMappingURL=DigitalAssetService.js.map