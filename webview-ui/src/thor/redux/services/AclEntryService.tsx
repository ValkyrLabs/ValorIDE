import { createApi } from "@reduxjs/toolkit/query/react"
import { AclEntry } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type AclEntryResponse = AclEntry[]

export const AclEntryService = createApi({
	reducerPath: "AclEntry", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["AclEntry"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getAclEntrysPaged: build.query<AclEntryResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `AclEntry?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [...result.map(({ id }) => ({ type: "AclEntry" as const, id })), { type: "AclEntry", id: `PAGE_${page}` }]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getAclEntrys: build.query<AclEntryResponse, void>({
			query: () => `AclEntry`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "AclEntry" as const, id })), { type: "AclEntry", id: "LIST" }]
					: [{ type: "AclEntry", id: "LIST" }],
		}),

		// 3) Create
		addAclEntry: build.mutation<AclEntry, Partial<AclEntry>>({
			query: (body) => ({
				url: `AclEntry`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "AclEntry", id: "LIST" }],
		}),

		// 4) Get single by ID
		getAclEntry: build.query<AclEntry, string>({
			query: (id) => `AclEntry/${id}`,
			providesTags: (result, error, id) => [{ type: "AclEntry", id }],
		}),

		// 5) Update
		updateAclEntry: build.mutation<void, Pick<AclEntry, "id"> & Partial<AclEntry>>({
			query: ({ id, ...patch }) => ({
				url: `AclEntry/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						AclEntryService.util.updateQueryData("getAclEntry", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "AclEntry", id }],
		}),

		// 6) Delete
		deleteAclEntry: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `AclEntry/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "AclEntry", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetAclEntrysPagedQuery`
export const {
	useGetAclEntrysPagedQuery, // immediate fetch
	useLazyGetAclEntrysPagedQuery, // lazy fetch
	useGetAclEntryQuery,
	useGetAclEntrysQuery,
	useAddAclEntryMutation,
	useUpdateAclEntryMutation,
	useDeleteAclEntryMutation,
} = AclEntryService
