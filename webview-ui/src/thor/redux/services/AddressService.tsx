import { createApi } from '@reduxjs/toolkit/query/react'
import { Address } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type AddressResponse = Address[]

export const AddressService = createApi({
  reducerPath: 'Address', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Address'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getAddresssPaged: build.query<AddressResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `Address?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Address' as const, id })),
              { type: 'Address', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAddresss: build.query<AddressResponse, void>({
      query: () => `Address`,
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
      invalidatesTags: (result, error, { id }) => [{ type: 'Address', id }],
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