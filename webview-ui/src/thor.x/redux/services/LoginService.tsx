import { createApi } from '@reduxjs/toolkit/query/react'
import { Login } from '@thor/model/Login'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type LoginResponse = Login[]

export const LoginService = createApi({
  reducerPath: 'Login', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Login'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getLoginsPaged: build.query<LoginResponse, { page: number; size?: number; example?: Partial<Login> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Login?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Login' as const, id })),
              { type: 'Login', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getLogins: build.query<LoginResponse, { example?: Partial<Login> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Login?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Login`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Login' as const, id })),
              { type: 'Login', id: 'LIST' },
            ]
          : [{ type: 'Login', id: 'LIST' }],
    }),

    // 3) Create
    addLogin: build.mutation<Login, Partial<Login>>({
      query: (body) => ({
        url: `Login`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Login', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getLogin: build.query<Login, string>({
      query: (id) => `Login/${id}`,
      providesTags: (result, error, id) => [{ type: 'Login', id }],
    }),

    // 5) Update
    updateLogin: build.mutation<void, Pick<Login, 'id'> & Partial<Login>>({
      query: ({ id, ...patch }) => ({
        url: `Login/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            LoginService.util.updateQueryData('getLogin', id, (draft) => {
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
        { type: 'Login', id },
        { type: 'Login', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteLogin: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Login/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Login', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetLoginsPagedQuery`
export const {
  useGetLoginsPagedQuery,     // immediate fetch
  useLazyGetLoginsPagedQuery, // lazy fetch
  useGetLoginQuery,
  useGetLoginsQuery,
  useAddLoginMutation,
  useUpdateLoginMutation,
  useDeleteLoginMutation,
} = LoginService
