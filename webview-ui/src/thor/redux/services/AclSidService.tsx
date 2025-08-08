import { createApi } from "@reduxjs/toolkit/query/react"
import { AclSid } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type AclSidResponse = AclSid[]

export const AclSidService = createApi({
	reducerPath: "AclSid", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["AclSid"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getAclSidsPaged: build.query<AclSidResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `AclSid?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [...result.map(({ id }) => ({ type: "AclSid" as const, id })), { type: "AclSid", id: `PAGE_${page}` }]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getAclSids: build.query<AclSidResponse, void>({
			query: () => `AclSid`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "AclSid" as const, id })), { type: "AclSid", id: "LIST" }]
					: [{ type: "AclSid", id: "LIST" }],
		}),

		// 3) Create
		addAclSid: build.mutation<AclSid, Partial<AclSid>>({
			query: (body) => ({
				url: `AclSid`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "AclSid", id: "LIST" }],
		}),

		// 4) Get single by ID
		getAclSid: build.query<AclSid, string>({
			query: (id) => `AclSid/${id}`,
			providesTags: (result, error, id) => [{ type: "AclSid", id }],
		}),

		// 5) Update
		updateAclSid: build.mutation<void, Pick<AclSid, "id"> & Partial<AclSid>>({
			query: ({ id, ...patch }) => ({
				url: `AclSid/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						AclSidService.util.updateQueryData("getAclSid", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "AclSid", id }],
		}),

		// 6) Delete
		deleteAclSid: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `AclSid/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "AclSid", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetAclSidsPagedQuery`
export const {
	useGetAclSidsPagedQuery, // immediate fetch
	useLazyGetAclSidsPagedQuery, // lazy fetch
	useGetAclSidQuery,
	useGetAclSidsQuery,
	useAddAclSidMutation,
	useUpdateAclSidMutation,
	useDeleteAclSidMutation,
} = AclSidService
