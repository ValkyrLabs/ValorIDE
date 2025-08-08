import { createApi } from "@reduxjs/toolkit/query/react"
import { OasEnum } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type OasEnumResponse = OasEnum[]

export const OasEnumService = createApi({
	reducerPath: "OasEnum", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["OasEnum"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getOasEnumsPaged: build.query<OasEnumResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `OasEnum?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [...result.map(({ id }) => ({ type: "OasEnum" as const, id })), { type: "OasEnum", id: `PAGE_${page}` }]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getOasEnums: build.query<OasEnumResponse, void>({
			query: () => `OasEnum`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "OasEnum" as const, id })), { type: "OasEnum", id: "LIST" }]
					: [{ type: "OasEnum", id: "LIST" }],
		}),

		// 3) Create
		addOasEnum: build.mutation<OasEnum, Partial<OasEnum>>({
			query: (body) => ({
				url: `OasEnum`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "OasEnum", id: "LIST" }],
		}),

		// 4) Get single by ID
		getOasEnum: build.query<OasEnum, string>({
			query: (id) => `OasEnum/${id}`,
			providesTags: (result, error, id) => [{ type: "OasEnum", id }],
		}),

		// 5) Update
		updateOasEnum: build.mutation<void, Pick<OasEnum, "id"> & Partial<OasEnum>>({
			query: ({ id, ...patch }) => ({
				url: `OasEnum/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						OasEnumService.util.updateQueryData("getOasEnum", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "OasEnum", id }],
		}),

		// 6) Delete
		deleteOasEnum: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `OasEnum/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "OasEnum", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetOasEnumsPagedQuery`
export const {
	useGetOasEnumsPagedQuery, // immediate fetch
	useLazyGetOasEnumsPagedQuery, // lazy fetch
	useGetOasEnumQuery,
	useGetOasEnumsQuery,
	useAddOasEnumMutation,
	useUpdateOasEnumMutation,
	useDeleteOasEnumMutation,
} = OasEnumService
