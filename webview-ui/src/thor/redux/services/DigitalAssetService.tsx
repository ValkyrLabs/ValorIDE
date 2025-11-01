import { createApi } from '@reduxjs/toolkit/query/react'
import { DigitalAsset } from '@thor/model/DigitalAsset'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type DigitalAssetResponse = DigitalAsset[]

export const DigitalAssetService = createApi({
  reducerPath: 'DigitalAsset', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['DigitalAsset'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getDigitalAssetsPaged: build.query<DigitalAssetResponse, { page: number; size?: number; example?: Partial<DigitalAsset> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `DigitalAsset?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DigitalAsset' as const, id })),
              { type: 'DigitalAsset', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getDigitalAssets: build.query<DigitalAssetResponse, { example?: Partial<DigitalAsset> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `DigitalAsset?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `DigitalAsset`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DigitalAsset' as const, id })),
              { type: 'DigitalAsset', id: 'LIST' },
            ]
          : [{ type: 'DigitalAsset', id: 'LIST' }],
    }),

    // 3) Create
    addDigitalAsset: build.mutation<DigitalAsset, Partial<DigitalAsset>>({
      query: (body) => ({
        url: `DigitalAsset`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DigitalAsset', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getDigitalAsset: build.query<DigitalAsset, string>({
      query: (id) => `DigitalAsset/${id}`,
      providesTags: (result, error, id) => [{ type: 'DigitalAsset', id }],
    }),

    // 5) Update
    updateDigitalAsset: build.mutation<void, Pick<DigitalAsset, 'id'> & Partial<DigitalAsset>>({
      query: ({ id, ...patch }) => ({
        url: `DigitalAsset/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            DigitalAssetService.util.updateQueryData('getDigitalAsset', id, (draft) => {
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
        { type: 'DigitalAsset', id },
        { type: 'DigitalAsset', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteDigitalAsset: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `DigitalAsset/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'DigitalAsset', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetDigitalAssetsPagedQuery`
export const {
  useGetDigitalAssetsPagedQuery,     // immediate fetch
  useLazyGetDigitalAssetsPagedQuery, // lazy fetch
  useGetDigitalAssetQuery,
  useGetDigitalAssetsQuery,
  useAddDigitalAssetMutation,
  useUpdateDigitalAssetMutation,
  useDeleteDigitalAssetMutation,
} = DigitalAssetService
