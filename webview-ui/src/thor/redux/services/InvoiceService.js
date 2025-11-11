import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const InvoiceService = createApi({
    reducerPath: 'Invoice', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Invoice'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getInvoicesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Invoice?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Invoice', id })),
                    { type: 'Invoice', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getInvoices: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Invoice?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Invoice`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Invoice', id })),
                    { type: 'Invoice', id: 'LIST' },
                ]
                : [{ type: 'Invoice', id: 'LIST' }],
        }),
        // 3) Create
        addInvoice: build.mutation({
            query: (body) => ({
                url: `Invoice`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Invoice', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getInvoice: build.query({
            query: (id) => `Invoice/${id}`,
            providesTags: (result, error, id) => [{ type: 'Invoice', id }],
        }),
        // 5) Update
        updateInvoice: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Invoice/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(InvoiceService.util.updateQueryData('getInvoice', id, (draft) => {
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
                { type: 'Invoice', id },
                { type: 'Invoice', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteInvoice: build.mutation({
            query(id) {
                return {
                    url: `Invoice/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Invoice', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetInvoicesPagedQuery`
export const { useGetInvoicesPagedQuery, // immediate fetch
useLazyGetInvoicesPagedQuery, // lazy fetch
useGetInvoiceQuery, useGetInvoicesQuery, useAddInvoiceMutation, useUpdateInvoiceMutation, useDeleteInvoiceMutation, } = InvoiceService;
//# sourceMappingURL=InvoiceService.js.map