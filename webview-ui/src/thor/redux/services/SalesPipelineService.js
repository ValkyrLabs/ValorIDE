import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SalesPipelineService = createApi({
    reducerPath: 'SalesPipeline', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SalesPipeline'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSalesPipelinesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SalesPipeline?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SalesPipeline', id })),
                    { type: 'SalesPipeline', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSalesPipelines: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SalesPipeline?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SalesPipeline`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SalesPipeline', id })),
                    { type: 'SalesPipeline', id: 'LIST' },
                ]
                : [{ type: 'SalesPipeline', id: 'LIST' }],
        }),
        // 3) Create
        addSalesPipeline: build.mutation({
            query: (body) => ({
                url: `SalesPipeline`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SalesPipeline', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSalesPipeline: build.query({
            query: (id) => `SalesPipeline/${id}`,
            providesTags: (result, error, id) => [{ type: 'SalesPipeline', id }],
        }),
        // 5) Update
        updateSalesPipeline: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SalesPipeline/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SalesPipelineService.util.updateQueryData('getSalesPipeline', id, (draft) => {
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
                { type: 'SalesPipeline', id },
                { type: 'SalesPipeline', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSalesPipeline: build.mutation({
            query(id) {
                return {
                    url: `SalesPipeline/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SalesPipeline', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSalesPipelinesPagedQuery`
export const { useGetSalesPipelinesPagedQuery, // immediate fetch
useLazyGetSalesPipelinesPagedQuery, // lazy fetch
useGetSalesPipelineQuery, useGetSalesPipelinesQuery, useAddSalesPipelineMutation, useUpdateSalesPipelineMutation, useDeleteSalesPipelineMutation, } = SalesPipelineService;
//# sourceMappingURL=SalesPipelineService.js.map