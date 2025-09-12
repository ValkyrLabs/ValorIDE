import { createApi } from '@reduxjs/toolkit/query/react'
import { OasInfo } from '@thor/model/OasInfo'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type OasInfoResponse = OasInfo[]

export const OasInfoService = createApi({
  reducerPath: 'OasInfo', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['OasInfo'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getOasInfosPaged: build.query<OasInfoResponse, { page: number; size?: number; example?: Partial<OasInfo> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `OasInfo?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasInfo' as const, id })),
              { type: 'OasInfo', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasInfos: build.query<OasInfoResponse, { example?: Partial<OasInfo> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `OasInfo?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `OasInfo`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasInfo' as const, id })),
              { type: 'OasInfo', id: 'LIST' },
            ]
          : [{ type: 'OasInfo', id: 'LIST' }],
    }),

    // 3) Create
    addOasInfo: build.mutation<OasInfo, Partial<OasInfo>>({
      query: (body) => ({
        url: `OasInfo`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'OasInfo', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getOasInfo: build.query<OasInfo, string>({
      query: (id) => `OasInfo/${id}`,
      providesTags: (result, error, id) => [{ type: 'OasInfo', id }],
    }),

    // 5) Update
    updateOasInfo: build.mutation<void, Pick<OasInfo, 'id'> & Partial<OasInfo>>({
      query: ({ id, ...patch }) => ({
        url: `OasInfo/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasInfoService.util.updateQueryData('getOasInfo', id, (draft) => {
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
        { type: 'OasInfo', id },
        { type: 'OasInfo', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteOasInfo: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `OasInfo/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'OasInfo', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetOasInfosPagedQuery`
export const {
  useGetOasInfosPagedQuery,     // immediate fetch
  useLazyGetOasInfosPagedQuery, // lazy fetch
  useGetOasInfoQuery,
  useGetOasInfosQuery,
  useAddOasInfoMutation,
  useUpdateOasInfoMutation,
  useDeleteOasInfoMutation,
} = OasInfoService
