import { createApi } from "@reduxjs/toolkit/query/react"
import { Solution } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type SolutionResponse = Solution[]

export const SolutionService = createApi({
	reducerPath: "Solution", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Solution"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getSolutionsPaged: build.query<SolutionResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Solution?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [...result.map(({ id }) => ({ type: "Solution" as const, id })), { type: "Solution", id: `PAGE_${page}` }]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getSolutions: build.query<SolutionResponse, void>({
			query: () => `Solution`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Solution" as const, id })), { type: "Solution", id: "LIST" }]
					: [{ type: "Solution", id: "LIST" }],
		}),

		// 3) Create
		addSolution: build.mutation<Solution, Partial<Solution>>({
			query: (body) => ({
				url: `Solution`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Solution", id: "LIST" }],
		}),

		// 4) Get single by ID
		getSolution: build.query<Solution, string>({
			query: (id) => `Solution/${id}`,
			providesTags: (result, error, id) => [{ type: "Solution", id }],
		}),

		// 5) Update
		updateSolution: build.mutation<void, Pick<Solution, "id"> & Partial<Solution>>({
			query: ({ id, ...patch }) => ({
				url: `Solution/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						SolutionService.util.updateQueryData("getSolution", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "Solution", id }],
		}),

		// 6) Delete
		deleteSolution: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Solution/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Solution", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetSolutionsPagedQuery`
export const {
	useGetSolutionsPagedQuery, // immediate fetch
	useLazyGetSolutionsPagedQuery, // lazy fetch
	useGetSolutionQuery,
	useGetSolutionsQuery,
	useAddSolutionMutation,
	useUpdateSolutionMutation,
	useDeleteSolutionMutation,
} = SolutionService
