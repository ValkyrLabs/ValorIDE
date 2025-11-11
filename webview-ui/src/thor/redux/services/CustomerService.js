import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const CustomerService = createApi({
    reducerPath: 'Customer', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Customer'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getCustomersPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Customer?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Customer', id })),
                    { type: 'Customer', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getCustomers: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Customer?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Customer`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Customer', id })),
                    { type: 'Customer', id: 'LIST' },
                ]
                : [{ type: 'Customer', id: 'LIST' }],
        }),
        // 3) Create
        addCustomer: build.mutation({
            query: (body) => ({
                url: `Customer`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getCustomer: build.query({
            query: (id) => `Customer/${id}`,
            providesTags: (result, error, id) => [{ type: 'Customer', id }],
        }),
        // 5) Update
        updateCustomer: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Customer/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(CustomerService.util.updateQueryData('getCustomer', id, (draft) => {
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
                { type: 'Customer', id },
                { type: 'Customer', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteCustomer: build.mutation({
            query(id) {
                return {
                    url: `Customer/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Customer', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetCustomersPagedQuery`
export const { useGetCustomersPagedQuery, // immediate fetch
useLazyGetCustomersPagedQuery, // lazy fetch
useGetCustomerQuery, useGetCustomersQuery, useAddCustomerMutation, useUpdateCustomerMutation, useDeleteCustomerMutation, } = CustomerService;
//# sourceMappingURL=CustomerService.js.map