import { createApi } from '@reduxjs/toolkit/query/react'
import { Address } from '@thor/model/Address'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type AddressResponse = Address[]

export const AddressService = createApi({
  reducerPath: 'Address', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Address'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getAddresssPaged: build.query<AddressResponse, { page: number; size?: number; example?: Partial<Address> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Address?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Address' as const, id })),
              { type: 'Address', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAddresss: build.query<AddressResponse, { example?: Partial<Address> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Address?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Address`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Address' as const, id })),
              { type: 'Address', id: 'LIST' },
            ]
          : [{ type: 'Address', id: 'LIST' }],
    }),

    // 3) Create
    addAddress: build.mutation<Address, Partial<Address>>({
      query: (body) => ({
        url: `Address`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Address', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getAddress: build.query<Address, string>({
      query: (id) => `Address/${id}`,
      providesTags: (result, error, id) => [{ type: 'Address', id }],
    }),

    // 5) Update
    updateAddress: build.mutation<void, Pick<Address, 'id'> & Partial<Address>>({
      query: ({ id, ...patch }) => ({
        url: `Address/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            AddressService.util.updateQueryData('getAddress', id, (draft) => {
              Object.assign(draft, patch)
            })
          )
          try {
            await queryFulfilled
          } catch {
            patchResult.undo()
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Address', id },
        { type: 'Address', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteAddress: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Address/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Address', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetAddresssPagedQuery`
export const {
  useGetAddresssPagedQuery,     // immediate fetch
  useLazyGetAddresssPagedQuery, // lazy fetch
  useGetAddressQuery,
  useGetAddresssQuery,
  useAddAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} = AddressService
