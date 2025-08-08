import { createApi } from "@reduxjs/toolkit/query/react"
import { Organization } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type OrganizationResponse = Organization[]

export const OrganizationService = createApi({
	reducerPath: "Organization", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Organization"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getOrganizationsPaged: build.query<OrganizationResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Organization?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "Organization" as const, id })),
							{ type: "Organization", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getOrganizations: build.query<OrganizationResponse, void>({
			query: () => `Organization`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Organization" as const, id })), { type: "Organization", id: "LIST" }]
					: [{ type: "Organization", id: "LIST" }],
		}),

		// 3) Create
		addOrganization: build.mutation<Organization, Partial<Organization>>({
			query: (body) => ({
				url: `Organization`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Organization", id: "LIST" }],
		}),

		// 4) Get single by ID
		getOrganization: build.query<Organization, string>({
			query: (id) => `Organization/${id}`,
			providesTags: (result, error, id) => [{ type: "Organization", id }],
		}),

		// 5) Update
		updateOrganization: build.mutation<void, Pick<Organization, "id"> & Partial<Organization>>({
			query: ({ id, ...patch }) => ({
				url: `Organization/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						OrganizationService.util.updateQueryData("getOrganization", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "Organization", id }],
		}),

		// 6) Delete
		deleteOrganization: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Organization/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Organization", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetOrganizationsPagedQuery`
export const {
	useGetOrganizationsPagedQuery, // immediate fetch
	useLazyGetOrganizationsPagedQuery, // lazy fetch
	useGetOrganizationQuery,
	useGetOrganizationsQuery,
	useAddOrganizationMutation,
	useUpdateOrganizationMutation,
	useDeleteOrganizationMutation,
} = OrganizationService
