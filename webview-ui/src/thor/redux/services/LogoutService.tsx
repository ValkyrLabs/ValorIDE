import { createApi } from '@reduxjs/toolkit/query/react'
import { Logout } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type LogoutResponse = Logout[]

export const LogoutService = createApi({
  reducerPath: 'Logout', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Logout'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getLogoutsPaged: build.query<LogoutResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `Logout?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Logout' as const, id })),
              { type: 'Logout', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getLogouts: build.query<LogoutResponse, void>({
      query: () => `Logout`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Logout' as const, id })),
              { type: 'Logout', id: 'LIST' },
            ]
          : [{ type: 'Logout', id: 'LIST' }],
    }),

    // 3) Create
    addLogout: build.mutation<Logout, Partial<Logout>>({
      query: (body) => ({
        url: `Logout`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Logout', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getLogout: build.query<Logout, string>({
      query: (id) => `Logout/${id}`,
      providesTags: (result, error, id) => [{ type: 'Logout', id }],
    }),

    // 5) Update
    updateLogout: build.mutation<void, Pick<Logout, 'id'> & Partial<Logout>>({
      query: ({ id, ...patch }) => ({
        url: `Logout/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            LogoutService.util.updateQueryData('getLogout', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'Logout', id }],
    }),

    // 6) Delete
    deleteLogout: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Logout/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Logout', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetLogoutsPagedQuery`
export const {
  useGetLogoutsPagedQuery,     // immediate fetch
  useLazyGetLogoutsPagedQuery, // lazy fetch
  useGetLogoutQuery,
  useGetLogoutsQuery,
  useAddLogoutMutation,
  useUpdateLogoutMutation,
  useDeleteLogoutMutation,
} = LogoutService