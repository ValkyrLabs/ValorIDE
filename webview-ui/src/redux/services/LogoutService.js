import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";
export const LogoutService = createApi({
    reducerPath: "LogoutCustom", // make unique to avoid collisions with generated slice
    baseQuery: customBaseQuery,
    tagTypes: ["Logout"],
    endpoints: (build) => ({
        getLogouts: build.query({
            query: () => "Logout",
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: "Logout", id })),
                    { type: "Logout", id: "LIST" },
                ]
                : [{ type: "Logout", id: "LIST" }],
        }),
        addLogout: build.mutation({
            query: (body) => ({
                url: `Logout`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Logout", id: "LIST" }],
        }),
        getLogout: build.query({
            query: (id) => `Logout/${id}`,
            providesTags: (result, error, id) => [{ type: "Logout", id }],
        }),
        updateLogout: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Logout/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(LogoutService.util.updateQueryData("getLogout", id, (draft) => {
                    Object.assign(draft, patch);
                }));
                try {
                    await queryFulfilled;
                }
                catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: (result, error, { id }) => [{ type: "Logout", id }],
        }),
        deleteLogout: build.mutation({
            query(id) {
                return {
                    url: `Logout/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [{ type: "Logout", id }],
        }),
    }),
});
export const { useGetLogoutQuery, useGetLogoutsQuery, useAddLogoutMutation, useUpdateLogoutMutation, useDeleteLogoutMutation, } = LogoutService;
//# sourceMappingURL=LogoutService.js.map