import { createApi } from "@reduxjs/toolkit/query/react"
import { Sheet } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type SheetResponse = Sheet[]

export const SheetService = createApi({
	reducerPath: "Sheet", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Sheet"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getSheetsPaged: build.query<SheetResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Sheet?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [...result.map(({ id }) => ({ type: "Sheet" as const, id })), { type: "Sheet", id: `PAGE_${page}` }]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getSheets: build.query<SheetResponse, void>({
			query: () => `Sheet`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Sheet" as const, id })), { type: "Sheet", id: "LIST" }]
					: [{ type: "Sheet", id: "LIST" }],
		}),

		// 3) Create
		addSheet: build.mutation<Sheet, Partial<Sheet>>({
			query: (body) => ({
				url: `Sheet`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Sheet", id: "LIST" }],
		}),

		// 4) Get single by ID
		getSheet: build.query<Sheet, string>({
			query: (id) => `Sheet/${id}`,
			providesTags: (result, error, id) => [{ type: "Sheet", id }],
		}),

		// 5) Update
		updateSheet: build.mutation<void, Pick<Sheet, "id"> & Partial<Sheet>>({
			query: ({ id, ...patch }) => ({
				url: `Sheet/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						SheetService.util.updateQueryData("getSheet", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "Sheet", id }],
		}),

		// 6) Delete
		deleteSheet: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Sheet/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Sheet", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetSheetsPagedQuery`
export const {
	useGetSheetsPagedQuery, // immediate fetch
	useLazyGetSheetsPagedQuery, // lazy fetch
	useGetSheetQuery,
	useGetSheetsQuery,
	useAddSheetMutation,
	useUpdateSheetMutation,
	useDeleteSheetMutation,
} = SheetService
