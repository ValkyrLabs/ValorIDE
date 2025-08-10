import { createApi } from "@reduxjs/toolkit/query/react";
import { Goal } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type GoalResponse = Goal[];

export const GoalService = createApi({
  reducerPath: "Goal", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["Goal"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getGoalsPaged: build.query<GoalResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `Goal?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Goal" as const, id })),
              { type: "Goal", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getGoals: build.query<GoalResponse, void>({
      query: () => `Goal`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Goal" as const, id })),
              { type: "Goal", id: "LIST" },
            ]
          : [{ type: "Goal", id: "LIST" }],
    }),

    // 3) Create
    addGoal: build.mutation<Goal, Partial<Goal>>({
      query: (body) => ({
        url: `Goal`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Goal", id: "LIST" }],
    }),

    // 4) Get single by ID
    getGoal: build.query<Goal, string>({
      query: (id) => `Goal/${id}`,
      providesTags: (result, error, id) => [{ type: "Goal", id }],
    }),

    // 5) Update
    updateGoal: build.mutation<void, Pick<Goal, "id"> & Partial<Goal>>({
      query: ({ id, ...patch }) => ({
        url: `Goal/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            GoalService.util.updateQueryData("getGoal", id, (draft) => {
              Object.assign(draft, patch);
            }),
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Goal", id }],
    }),

    // 6) Delete
    deleteGoal: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Goal/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Goal", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetGoalsPagedQuery`
export const {
  useGetGoalsPagedQuery, // immediate fetch
  useLazyGetGoalsPagedQuery, // lazy fetch
  useGetGoalQuery,
  useGetGoalsQuery,
  useAddGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
} = GoalService;
