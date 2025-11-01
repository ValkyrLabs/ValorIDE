import { createApi } from '@reduxjs/toolkit/query/react'
import { GeneralLedgerEntry } from '@thor/model/GeneralLedgerEntry'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type GeneralLedgerEntryResponse = GeneralLedgerEntry[]

export const GeneralLedgerEntryService = createApi({
  reducerPath: 'GeneralLedgerEntry', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['GeneralLedgerEntry'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getGeneralLedgerEntrysPaged: build.query<GeneralLedgerEntryResponse, { page: number; size?: number; example?: Partial<GeneralLedgerEntry> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `GeneralLedgerEntry?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'GeneralLedgerEntry' as const, id })),
              { type: 'GeneralLedgerEntry', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getGeneralLedgerEntrys: build.query<GeneralLedgerEntryResponse, { example?: Partial<GeneralLedgerEntry> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `GeneralLedgerEntry?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `GeneralLedgerEntry`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'GeneralLedgerEntry' as const, id })),
              { type: 'GeneralLedgerEntry', id: 'LIST' },
            ]
          : [{ type: 'GeneralLedgerEntry', id: 'LIST' }],
    }),

    // 3) Create
    addGeneralLedgerEntry: build.mutation<GeneralLedgerEntry, Partial<GeneralLedgerEntry>>({
      query: (body) => ({
        url: `GeneralLedgerEntry`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'GeneralLedgerEntry', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getGeneralLedgerEntry: build.query<GeneralLedgerEntry, string>({
      query: (id) => `GeneralLedgerEntry/${id}`,
      providesTags: (result, error, id) => [{ type: 'GeneralLedgerEntry', id }],
    }),

    // 5) Update
    updateGeneralLedgerEntry: build.mutation<void, Pick<GeneralLedgerEntry, 'id'> & Partial<GeneralLedgerEntry>>({
      query: ({ id, ...patch }) => ({
        url: `GeneralLedgerEntry/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            GeneralLedgerEntryService.util.updateQueryData('getGeneralLedgerEntry', id, (draft) => {
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
        { type: 'GeneralLedgerEntry', id },
        { type: 'GeneralLedgerEntry', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteGeneralLedgerEntry: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `GeneralLedgerEntry/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'GeneralLedgerEntry', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetGeneralLedgerEntrysPagedQuery`
export const {
  useGetGeneralLedgerEntrysPagedQuery,     // immediate fetch
  useLazyGetGeneralLedgerEntrysPagedQuery, // lazy fetch
  useGetGeneralLedgerEntryQuery,
  useGetGeneralLedgerEntrysQuery,
  useAddGeneralLedgerEntryMutation,
  useUpdateGeneralLedgerEntryMutation,
  useDeleteGeneralLedgerEntryMutation,
} = GeneralLedgerEntryService
