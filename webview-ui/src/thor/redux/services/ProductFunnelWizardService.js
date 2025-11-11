import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ProductFunnelWizardService = createApi({
    reducerPath: 'ProductFunnelWizard', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ProductFunnelWizard'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getProductFunnelWizardsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ProductFunnelWizard?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ProductFunnelWizard', id })),
                    { type: 'ProductFunnelWizard', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getProductFunnelWizards: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ProductFunnelWizard?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ProductFunnelWizard`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ProductFunnelWizard', id })),
                    { type: 'ProductFunnelWizard', id: 'LIST' },
                ]
                : [{ type: 'ProductFunnelWizard', id: 'LIST' }],
        }),
        // 3) Create
        addProductFunnelWizard: build.mutation({
            query: (body) => ({
                url: `ProductFunnelWizard`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ProductFunnelWizard', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getProductFunnelWizard: build.query({
            query: (id) => `ProductFunnelWizard/${id}`,
            providesTags: (result, error, id) => [{ type: 'ProductFunnelWizard', id }],
        }),
        // 5) Update
        updateProductFunnelWizard: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ProductFunnelWizard/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ProductFunnelWizardService.util.updateQueryData('getProductFunnelWizard', id, (draft) => {
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
                { type: 'ProductFunnelWizard', id },
                { type: 'ProductFunnelWizard', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteProductFunnelWizard: build.mutation({
            query(id) {
                return {
                    url: `ProductFunnelWizard/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ProductFunnelWizard', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetProductFunnelWizardsPagedQuery`
export const { useGetProductFunnelWizardsPagedQuery, // immediate fetch
useLazyGetProductFunnelWizardsPagedQuery, // lazy fetch
useGetProductFunnelWizardQuery, useGetProductFunnelWizardsQuery, useAddProductFunnelWizardMutation, useUpdateProductFunnelWizardMutation, useDeleteProductFunnelWizardMutation, } = ProductFunnelWizardService;
//# sourceMappingURL=ProductFunnelWizardService.js.map