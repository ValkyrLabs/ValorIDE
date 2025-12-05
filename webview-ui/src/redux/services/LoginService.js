import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery"; // Use Thor base query
export const LoginService = createApi({
    reducerPath: "LoginCustom", // make unique to avoid collisions with generated slice
    baseQuery: customBaseQuery,
    tagTypes: ["Login"],
    endpoints: (build) => ({
        getLogins: build.query({
            query: () => "Login",
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: "Login", id })),
                    { type: "Login", id: "LIST" },
                ]
                : [{ type: "Login", id: "LIST" }],
        }),
        addLogin: build.mutation({
            query: (body) => ({
                url: `Login`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Login", id: "LIST" }],
        }),
        loginUser: build.mutation({
            query: (body) => ({
                url: `/auth/login`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Login", id: "LIST" }],
        }),
        getLogin: build.query({
            query: (id) => `Login/${id}`,
            providesTags: (result, error, id) => [{ type: "Login", id }],
        }),
        updateLogin: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Login/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(LoginService.util.updateQueryData("getLogin", id, (draft) => {
                    Object.assign(draft, patch);
                }));
                try {
                    await queryFulfilled;
                }
                catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: (result, error, { id }) => [{ type: "Login", id }],
        }),
        deleteLogin: build.mutation({
            query(id) {
                return {
                    url: `Login/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [{ type: "Login", id }],
        }),
        // Initiate password reset via email or phone
        passwordResetRequest: build.mutation({
            query: (body) => ({
                url: `/auth/password-reset`,
                method: "POST",
                body,
            }),
        }),
        // Confirm password reset with token and new password
        passwordResetConfirm: build.mutation({
            query: (body) => ({
                url: `/auth/password-reset-confirm`,
                method: "POST",
                body,
            }),
        }),
        // Optional helper: lookup username by email or phone
        lookupUsername: build.mutation({
            query: (body) => ({
                url: `/auth/lookup-username`,
                method: "POST",
                body,
            }),
        }),
    }),
});
export const { useGetLoginQuery, useGetLoginsQuery, useLoginUserMutation, useAddLoginMutation, useUpdateLoginMutation, useDeleteLoginMutation, usePasswordResetRequestMutation, usePasswordResetConfirmMutation, useLookupUsernameMutation, } = LoginService;
//# sourceMappingURL=LoginService.js.map