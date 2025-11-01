import { createApi } from '@reduxjs/toolkit/query/react'
import { McpContent } from '@thor/model/McpContent'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type McpContentResponse = McpContent[]

export const McpContentService = createApi({
  reducerPath: 'McpContent', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['McpContent'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getMcpContentsPaged: build.query<McpContentResponse, { page: number; size?: number; example?: Partial<McpContent> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `McpContent?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpContent' as const, id })),
              { type: 'McpContent', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMcpContents: build.query<McpContentResponse, { example?: Partial<McpContent> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `McpContent?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `McpContent`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'McpContent' as const, id })),
              { type: 'McpContent', id: 'LIST' },
            ]
          : [{ type: 'McpContent', id: 'LIST' }],
    }),

    // 3) Create
    addMcpContent: build.mutation<McpContent, Partial<McpContent>>({
      query: (body) => ({
        url: `McpContent`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'McpContent', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMcpContent: build.query<McpContent, string>({
      query: (id) => `McpContent/${id}`,
      providesTags: (result, error, id) => [{ type: 'McpContent', id }],
    }),

    // 5) Update
    updateMcpContent: build.mutation<void, Pick<McpContent, 'id'> & Partial<McpContent>>({
      query: ({ id, ...patch }) => ({
        url: `McpContent/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            McpContentService.util.updateQueryData('getMcpContent', id, (draft) => {
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
        { type: 'McpContent', id },
        { type: 'McpContent', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteMcpContent: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `McpContent/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'McpContent', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMcpContentsPagedQuery`
export const {
  useGetMcpContentsPagedQuery,     // immediate fetch
  useLazyGetMcpContentsPagedQuery, // lazy fetch
  useGetMcpContentQuery,
  useGetMcpContentsQuery,
  useAddMcpContentMutation,
  useUpdateMcpContentMutation,
  useDeleteMcpContentMutation,
} = McpContentService
