import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ProductLandingPageService = createApi({
    reducerPath: 'ProductLandingPage', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ProductLandingPage'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getProductLandingPagesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ProductLandingPage?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ProductLandingPage', id })),
                    { type: 'ProductLandingPage', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getProductLandingPages: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ProductLandingPage?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ProductLandingPage`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ProductLandingPage', id })),
                    { type: 'ProductLandingPage', id: 'LIST' },
                ]
                : [{ type: 'ProductLandingPage', id: 'LIST' }],
        }),
        // 3) Create
        addProductLandingPage: build.mutation({
            query: (body) => ({
                url: `ProductLandingPage`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ProductLandingPage', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getProductLandingPage: build.query({
            query: (id) => `ProductLandingPage/${id}`,
            providesTags: (result, error, id) => [{ type: 'ProductLandingPage', id }],
        }),
        // 5) Update
        updateProductLandingPage: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ProductLandingPage/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ProductLandingPageService.util.updateQueryData('getProductLandingPage', id, (draft) => {
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
                { type: 'ProductLandingPage', id },
                { type: 'ProductLandingPage', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteProductLandingPage: build.mutation({
            query(id) {
                return {
                    url: `ProductLandingPage/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ProductLandingPage', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetProductLandingPagesPagedQuery`
export const { useGetProductLandingPagesPagedQuery, // immediate fetch
useLazyGetProductLandingPagesPagedQuery, // lazy fetch
useGetProductLandingPageQuery, useGetProductLandingPagesQuery, useAddProductLandingPageMutation, useUpdateProductLandingPageMutation, useDeleteProductLandingPageMutation, } = ProductLandingPageService;
//# sourceMappingURL=ProductLandingPageService.js.map