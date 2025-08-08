import { createApi } from "@reduxjs/toolkit/query/react"
import { Login } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type LoginResponse = Login[]

export const LoginService = createApi({
	reducerPath: "Login", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Login"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getLoginsPaged: build.query<LoginResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Login?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [...result.map(({ id }) => ({ type: "Login" as const, id })), { type: "Login", id: `PAGE_${page}` }]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getLogins: build.query<LoginResponse, void>({
			query: () => `Login`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Login" as const, id })), { type: "Login", id: "LIST" }]
					: [{ type: "Login", id: "LIST" }],
		}),

		// 3) Create
		addLogin: build.mutation<Login, Partial<Login>>({
			query: (body) => ({
				url: `Login`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Login", id: "LIST" }],
		}),

		// 4) Get single by ID
		getLogin: build.query<Login, string>({
			query: (id) => `Login/${id}`,
			providesTags: (result, error, id) => [{ type: "Login", id }],
		}),

		// 5) Update
		updateLogin: build.mutation<void, Pick<Login, "id"> & Partial<Login>>({
			query: ({ id, ...patch }) => ({
				url: `Login/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						LoginService.util.updateQueryData("getLogin", id, (draft) => {
							Object.assign(draft, patch)
						}),
					)
					try {
						await queryFulfilled
					} catch {
						patchResult.undo()
					}
				}
			},
			invalidatesTags: (result, error, { id }) => [{ type: "Login", id }],
		}),

		// 6) Delete
		deleteLogin: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Login/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Login", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetLoginsPagedQuery`
export const {
	useGetLoginsPagedQuery, // immediate fetch
	useLazyGetLoginsPagedQuery, // lazy fetch
	useGetLoginQuery,
	useGetLoginsQuery,
	useAddLoginMutation,
	useUpdateLoginMutation,
	useDeleteLoginMutation,
} = LoginService
