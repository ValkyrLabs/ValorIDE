import { createApi } from '@reduxjs/toolkit/query/react'
import { ContentData } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ContentDataResponse = ContentData[]

export const ContentDataService = createApi({
  reducerPath: 'ContentData', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ContentData'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getContentDatasPaged: build.query<ContentDataResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `ContentData?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ContentData' as const, id })),
              { type: 'ContentData', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getContentDatas: build.query<ContentDataResponse, void>({
      query: () => `ContentData`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ContentData' as const, id })),
              { type: 'ContentData', id: 'LIST' },
            ]
          : [{ type: 'ContentData', id: 'LIST' }],
    }),

    // 3) Create
    addContentData: build.mutation<ContentData, Partial<ContentData>>({
      query: (body) => ({
        url: `ContentData`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ContentData', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getContentData: build.query<ContentData, string>({
      query: (id) => `ContentData/${id}`,
      providesTags: (result, error, id) => [{ type: 'ContentData', id }],
    }),

    // 5) Update
    updateContentData: build.mutation<void, Pick<ContentData, 'id'> & Partial<ContentData>>({
      query: ({ id, ...patch }) => ({
        url: `ContentData/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ContentDataService.util.updateQueryData('getContentData', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'ContentData', id }],
    }),

    // 6) Delete
    deleteContentData: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ContentData/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ContentData', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetContentDatasPagedQuery`
export const {
  useGetContentDatasPagedQuery,     // immediate fetch
  useLazyGetContentDatasPagedQuery, // lazy fetch
  useGetContentDataQuery,
  useGetContentDatasQuery,
  useAddContentDataMutation,
  useUpdateContentDataMutation,
  useDeleteContentDataMutation,
} = ContentDataService