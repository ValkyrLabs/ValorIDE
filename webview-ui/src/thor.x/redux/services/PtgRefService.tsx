import { createApi } from '@reduxjs/toolkit/query/react'
import { PtgRef } from '@thor/model/PtgRef'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type PtgRefResponse = PtgRef[]

export const PtgRefService = createApi({
  reducerPath: 'PtgRef', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['PtgRef'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPtgRefsPaged: build.query<PtgRefResponse, { page: number; size?: number; example?: Partial<PtgRef> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `PtgRef?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PtgRef' as const, id })),
              { type: 'PtgRef', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPtgRefs: build.query<PtgRefResponse, { example?: Partial<PtgRef> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `PtgRef?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `PtgRef`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PtgRef' as const, id })),
              { type: 'PtgRef', id: 'LIST' },
            ]
          : [{ type: 'PtgRef', id: 'LIST' }],
    }),

    // 3) Create
    addPtgRef: build.mutation<PtgRef, Partial<PtgRef>>({
      query: (body) => ({
        url: `PtgRef`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'PtgRef', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getPtgRef: build.query<PtgRef, string>({
      query: (id) => `PtgRef/${id}`,
      providesTags: (result, error, id) => [{ type: 'PtgRef', id }],
    }),

    // 5) Update
    updatePtgRef: build.mutation<void, Pick<PtgRef, 'id'> & Partial<PtgRef>>({
      query: ({ id, ...patch }) => ({
        url: `PtgRef/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PtgRefService.util.updateQueryData('getPtgRef', id, (draft) => {
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
        { type: 'PtgRef', id },
        { type: 'PtgRef', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deletePtgRef: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `PtgRef/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'PtgRef', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetPtgRefsPagedQuery`
export const {
  useGetPtgRefsPagedQuery,     // immediate fetch
  useLazyGetPtgRefsPagedQuery, // lazy fetch
  useGetPtgRefQuery,
  useGetPtgRefsQuery,
  useAddPtgRefMutation,
  useUpdatePtgRefMutation,
  useDeletePtgRefMutation,
} = PtgRefService
