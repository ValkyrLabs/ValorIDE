import { createApi } from "@reduxjs/toolkit/query/react"
import { Role } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type RoleResponse = Role[]

export const RoleService = createApi({
	reducerPath: "Role", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Role"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getRolesPaged: build.query<RoleResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Role?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result ? [...result.map(({ id }) => ({ type: "Role" as const, id })), { type: "Role", id: `PAGE_${page}` }] : [],
		}),

		// 2) Simple "get all" Query (optional)
		getRoles: build.query<RoleResponse, void>({
			query: () => `Role`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Role" as const, id })), { type: "Role", id: "LIST" }]
					: [{ type: "Role", id: "LIST" }],
		}),

		// 3) Create
		addRole: build.mutation<Role, Partial<Role>>({
			query: (body) => ({
				url: `Role`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Role", id: "LIST" }],
		}),

		// 4) Get single by ID
		getRole: build.query<Role, string>({
			query: (id) => `Role/${id}`,
			providesTags: (result, error, id) => [{ type: "Role", id }],
		}),

		// 5) Update
		updateRole: build.mutation<void, Pick<Role, "id"> & Partial<Role>>({
			query: ({ id, ...patch }) => ({
				url: `Role/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						RoleService.util.updateQueryData("getRole", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "Role", id }],
		}),

		// 6) Delete
		deleteRole: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Role/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Role", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetRolesPagedQuery`
export const {
	useGetRolesPagedQuery, // immediate fetch
	useLazyGetRolesPagedQuery, // lazy fetch
	useGetRoleQuery,
	useGetRolesQuery,
	useAddRoleMutation,
	useUpdateRoleMutation,
	useDeleteRoleMutation,
} = RoleService
