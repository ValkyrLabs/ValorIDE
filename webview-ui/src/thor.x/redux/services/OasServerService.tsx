import { createApi } from '@reduxjs/toolkit/query/react'
import { OasServer } from '@thor/model/OasServer'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type OasServerResponse = OasServer[]

export const OasServerService = createApi({
  reducerPath: 'OasServer', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['OasServer'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getOasServersPaged: build.query<OasServerResponse, { page: number; size?: number; example?: Partial<OasServer> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `OasServer?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasServer' as const, id })),
              { type: 'OasServer', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasServers: build.query<OasServerResponse, { example?: Partial<OasServer> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `OasServer?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `OasServer`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasServer' as const, id })),
              { type: 'OasServer', id: 'LIST' },
            ]
          : [{ type: 'OasServer', id: 'LIST' }],
    }),

    // 3) Create
    addOasServer: build.mutation<OasServer, Partial<OasServer>>({
      query: (body) => ({
        url: `OasServer`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'OasServer', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getOasServer: build.query<OasServer, string>({
      query: (id) => `OasServer/${id}`,
      providesTags: (result, error, id) => [{ type: 'OasServer', id }],
    }),

    // 5) Update
    updateOasServer: build.mutation<void, Pick<OasServer, 'id'> & Partial<OasServer>>({
      query: ({ id, ...patch }) => ({
        url: `OasServer/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasServerService.util.updateQueryData('getOasServer', id, (draft) => {
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
        { type: 'OasServer', id },
        { type: 'OasServer', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteOasServer: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `OasServer/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'OasServer', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetOasServersPagedQuery`
export const {
  useGetOasServersPagedQuery,     // immediate fetch
  useLazyGetOasServersPagedQuery, // lazy fetch
  useGetOasServerQuery,
  useGetOasServersQuery,
  useAddOasServerMutation,
  useUpdateOasServerMutation,
  useDeleteOasServerMutation,
} = OasServerService
