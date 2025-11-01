import { createApi } from '@reduxjs/toolkit/query/react'
import { McpServer } from '@thor/model/McpServer'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type McpServerResponse = McpServer[]

export const McpServerService = createApi({
  reducerPath: 'McpServer', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['McpServer'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getMcpServersPaged: build.query<McpServerResponse, { page: number; size?: number; example?: Partial<McpServer> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `McpServer?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpServer' as const, id })),
              { type: 'McpServer', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpServers: build.query<McpServerResponse, { example?: Partial<McpServer> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `McpServer?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `McpServer`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpServer' as const, id })),
              { type: 'McpServer', id: 'LIST' },
            ]
          : [{ type: 'McpServer', id: 'LIST' }],
    }),

    // 3) Create
    addMcpServer: build.mutation<McpServer, Partial<McpServer>>({
      query: (body) => ({
        url: `McpServer`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'McpServer', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMcpServer: build.query<McpServer, string>({
      query: (id) => `McpServer/${id}`,
      providesTags: (result, error, id) => [{ type: 'McpServer', id }],
    }),

    // 5) Update
    updateMcpServer: build.mutation<void, Pick<McpServer, 'id'> & Partial<McpServer>>({
      query: ({ id, ...patch }) => ({
        url: `McpServer/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpServerService.util.updateQueryData('getMcpServer', id, (draft) => {
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
        { type: 'McpServer', id },
        { type: 'McpServer', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteMcpServer: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `McpServer/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'McpServer', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMcpServersPagedQuery`
export const {
  useGetMcpServersPagedQuery,     // immediate fetch
  useLazyGetMcpServersPagedQuery, // lazy fetch
  useGetMcpServerQuery,
  useGetMcpServersQuery,
  useAddMcpServerMutation,
  useUpdateMcpServerMutation,
  useDeleteMcpServerMutation,
} = McpServerService
