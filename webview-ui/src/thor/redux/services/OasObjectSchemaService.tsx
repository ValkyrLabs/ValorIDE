import { createApi } from "@reduxjs/toolkit/query/react"
import { OasObjectSchema } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type OasObjectSchemaResponse = OasObjectSchema[]

export const OasObjectSchemaService = createApi({
	reducerPath: "OasObjectSchema", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["OasObjectSchema"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getOasObjectSchemasPaged: build.query<OasObjectSchemaResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `OasObjectSchema?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result
					? [
							...result.map(({ id }) => ({ type: "OasObjectSchema" as const, id })),
							{ type: "OasObjectSchema", id: `PAGE_${page}` },
						]
					: [],
		}),

		// 2) Simple "get all" Query (optional)
		getOasObjectSchemas: build.query<OasObjectSchemaResponse, void>({
			query: () => `OasObjectSchema`,
			providesTags: (result) =>
				result
					? [
							...result.map(({ id }) => ({ type: "OasObjectSchema" as const, id })),
							{ type: "OasObjectSchema", id: "LIST" },
						]
					: [{ type: "OasObjectSchema", id: "LIST" }],
		}),

		// 3) Create
		addOasObjectSchema: build.mutation<OasObjectSchema, Partial<OasObjectSchema>>({
			query: (body) => ({
				url: `OasObjectSchema`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "OasObjectSchema", id: "LIST" }],
		}),

		// 4) Get single by ID
		getOasObjectSchema: build.query<OasObjectSchema, string>({
			query: (id) => `OasObjectSchema/${id}`,
			providesTags: (result, error, id) => [{ type: "OasObjectSchema", id }],
		}),

		// 5) Update
		updateOasObjectSchema: build.mutation<void, Pick<OasObjectSchema, "id"> & Partial<OasObjectSchema>>({
			query: ({ id, ...patch }) => ({
				url: `OasObjectSchema/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						OasObjectSchemaService.util.updateQueryData("getOasObjectSchema", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "OasObjectSchema", id }],
		}),

		// 6) Delete
		deleteOasObjectSchema: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `OasObjectSchema/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "OasObjectSchema", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetOasObjectSchemasPagedQuery`
export const {
	useGetOasObjectSchemasPagedQuery, // immediate fetch
	useLazyGetOasObjectSchemasPagedQuery, // lazy fetch
	useGetOasObjectSchemaQuery,
	useGetOasObjectSchemasQuery,
	useAddOasObjectSchemaMutation,
	useUpdateOasObjectSchemaMutation,
	useDeleteOasObjectSchemaMutation,
} = OasObjectSchemaService
