import { createApi } from "@reduxjs/toolkit/query/react"
import { Task } from "../../model"
import customBaseQuery from "../customBaseQuery" // Import the custom base query

type TaskResponse = Task[]

export const TaskService = createApi({
	reducerPath: "Task", // This should remain unique
	baseQuery: customBaseQuery,
	tagTypes: ["Task"],
	endpoints: (build) => ({
		// 1) Paged Query Endpoint
		getTasksPaged: build.query<TaskResponse, { page: number; limit?: number }>({
			query: ({ page, limit = 20 }) => `Task?page=${page}&limit=${limit}`,
			providesTags: (result, error, { page }) =>
				result ? [...result.map(({ id }) => ({ type: "Task" as const, id })), { type: "Task", id: `PAGE_${page}` }] : [],
		}),

		// 2) Simple "get all" Query (optional)
		getTasks: build.query<TaskResponse, void>({
			query: () => `Task`,
			providesTags: (result) =>
				result
					? [...result.map(({ id }) => ({ type: "Task" as const, id })), { type: "Task", id: "LIST" }]
					: [{ type: "Task", id: "LIST" }],
		}),

		// 3) Create
		addTask: build.mutation<Task, Partial<Task>>({
			query: (body) => ({
				url: `Task`,
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Task", id: "LIST" }],
		}),

		// 4) Get single by ID
		getTask: build.query<Task, string>({
			query: (id) => `Task/${id}`,
			providesTags: (result, error, id) => [{ type: "Task", id }],
		}),

		// 5) Update
		updateTask: build.mutation<void, Pick<Task, "id"> & Partial<Task>>({
			query: ({ id, ...patch }) => ({
				url: `Task/${id}`,
				method: "PUT",
				body: patch,
			}),
			async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
				if (id) {
					const patchResult = dispatch(
						TaskService.util.updateQueryData("getTask", id, (draft) => {
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
			invalidatesTags: (result, error, { id }) => [{ type: "Task", id }],
		}),

		// 6) Delete
		deleteTask: build.mutation<{ success: boolean; id: string }, number>({
			query(id) {
				return {
					url: `Task/${id}`,
					method: "DELETE",
				}
			},
			invalidatesTags: (result, error, id) => [{ type: "Task", id }],
		}),
	}),
})

// Notice we now also export `useLazyGetTasksPagedQuery`
export const {
	useGetTasksPagedQuery, // immediate fetch
	useLazyGetTasksPagedQuery, // lazy fetch
	useGetTaskQuery,
	useGetTasksQuery,
	useAddTaskMutation,
	useUpdateTaskMutation,
	useDeleteTaskMutation,
} = TaskService
