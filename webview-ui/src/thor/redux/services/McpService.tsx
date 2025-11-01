import { createApi } from '@reduxjs/toolkit/query/react'
import { Mcp } from '@thor/model/Mcp'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type McpResponse = Mcp[]

export const McpService = createApi({
  reducerPath: 'Mcp', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Mcp'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getMcpsPaged: build.query<McpResponse, { page: number; size?: number; example?: Partial<Mcp> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Mcp?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Mcp' as const, id })),
              { type: 'Mcp', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcps: build.query<McpResponse, { example?: Partial<Mcp> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Mcp?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Mcp`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Mcp' as const, id })),
              { type: 'Mcp', id: 'LIST' },
            ]
          : [{ type: 'Mcp', id: 'LIST' }],
    }),

    // 3) Create
    addMcp: build.mutation<Mcp, Partial<Mcp>>({
      query: (body) => ({
        url: `Mcp`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Mcp', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMcp: build.query<Mcp, string>({
      query: (id) => `Mcp/${id}`,
      providesTags: (result, error, id) => [{ type: 'Mcp', id }],
    }),

    // 5) Update
    updateMcp: build.mutation<void, Pick<Mcp, 'id'> & Partial<Mcp>>({
      query: ({ id, ...patch }) => ({
        url: `Mcp/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpService.util.updateQueryData('getMcp', id, (draft) => {
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
        { type: 'Mcp', id },
        { type: 'Mcp', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteMcp: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Mcp/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Mcp', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMcpsPagedQuery`
export const {
  useGetMcpsPagedQuery,     // immediate fetch
  useLazyGetMcpsPagedQuery, // lazy fetch
  useGetMcpQuery,
  useGetMcpsQuery,
  useAddMcpMutation,
  useUpdateMcpMutation,
  useDeleteMcpMutation,
} = McpService
