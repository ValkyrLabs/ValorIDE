import { createApi } from '@reduxjs/toolkit/query/react'
import { ContentMediaLink } from '@thor/model/ContentMediaLink'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ContentMediaLinkResponse = ContentMediaLink[]

export const ContentMediaLinkService = createApi({
  reducerPath: 'ContentMediaLink', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ContentMediaLink'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getContentMediaLinksPaged: build.query<ContentMediaLinkResponse, { page: number; size?: number; example?: Partial<ContentMediaLink> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ContentMediaLink?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ContentMediaLink' as const, id })),
              { type: 'ContentMediaLink', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getContentMediaLinks: build.query<ContentMediaLinkResponse, { example?: Partial<ContentMediaLink> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ContentMediaLink?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ContentMediaLink`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ContentMediaLink' as const, id })),
              { type: 'ContentMediaLink', id: 'LIST' },
            ]
          : [{ type: 'ContentMediaLink', id: 'LIST' }],
    }),

    // 3) Create
    addContentMediaLink: build.mutation<ContentMediaLink, Partial<ContentMediaLink>>({
      query: (body) => ({
        url: `ContentMediaLink`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ContentMediaLink', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getContentMediaLink: build.query<ContentMediaLink, string>({
      query: (id) => `ContentMediaLink/${id}`,
      providesTags: (result, error, id) => [{ type: 'ContentMediaLink', id }],
    }),

    // 5) Update
    updateContentMediaLink: build.mutation<void, Pick<ContentMediaLink, 'id'> & Partial<ContentMediaLink>>({
      query: ({ id, ...patch }) => ({
        url: `ContentMediaLink/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ContentMediaLinkService.util.updateQueryData('getContentMediaLink', id, (draft) => {
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
        { type: 'ContentMediaLink', id },
        { type: 'ContentMediaLink', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteContentMediaLink: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ContentMediaLink/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ContentMediaLink', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetContentMediaLinksPagedQuery`
export const {
  useGetContentMediaLinksPagedQuery,     // immediate fetch
  useLazyGetContentMediaLinksPagedQuery, // lazy fetch
  useGetContentMediaLinkQuery,
  useGetContentMediaLinksQuery,
  useAddContentMediaLinkMutation,
  useUpdateContentMediaLinkMutation,
  useDeleteContentMediaLinkMutation,
} = ContentMediaLinkService
