import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "../../thor/redux/customBaseQuery";
// This API slice is dedicated to auth to avoid name/reducerPath collisions
export const AuthService = createApi({
    reducerPath: "Auth", // unique reducer path (previously collided with thor Login)
    baseQuery: customBaseQuery,
    tagTypes: ["Auth"],
    endpoints: (build) => ({
        getLogins: build.query({
            query: () => "Login",
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: "Auth", id })),
                    { type: "Auth", id: "LIST" },
                ]
                : [{ type: "Auth", id: "LIST" }],
        }),
        // Generic create login (not used for auth flow but kept for parity)
        addLogin: build.mutation({
            query: (body) => ({
                url: `Login`,
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Auth", id: "LIST" }],
        }),
        // Login call to backend. Normalizes response into { token, user }
        loginUser: build.mutation({
            query: (body) => ({
                url: `${import.meta.env.VITE_basePath || "http://localhost:8080/v1"}/auth/login`,
                method: "POST",
                body,
            }),
            transformResponse: (response) => {
                // Backend returns { token, authenticatedPrincipal } where authenticatedPrincipal can be
                // an object or a JSON string. Normalize to { token, user?: Principal }.
                const token = response?.token;
                let user;
                const ap = response?.authenticatedPrincipal;
                if (ap) {
                    try {
                        user = typeof ap === "string" ? JSON.parse(ap) : ap;
                    }
                    catch {
                        // leave user undefined if parsing fails
                    }
                }
                return { token: token ?? "", user };
            },
            invalidatesTags: [{ type: "Auth", id: "LIST" }],
        }),
        getLogin: build.query({
            query: (id) => `Login/${id}`,
            providesTags: (result, error, id) => [{ type: "Auth", id }],
        }),
        updateLogin: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Login/${id}`,
                method: "PUT",
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (!id)
                    return;
                const patchResult = dispatch(AuthService.util.updateQueryData("getLogin", id, (draft) => {
                    Object.assign(draft, patch);
                }));
                try {
                    await queryFulfilled;
                }
                catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: (result, error, { id }) => [{ type: "Auth", id }],
        }),
        deleteLogin: build.mutation({
            query(id) {
                return {
                    url: `Login/${id}`,
                    method: "DELETE",
                };
            },
            invalidatesTags: (result, error, id) => [{ type: "Auth", id }],
        }),
    }),
});
export const { useGetLoginQuery, useGetLoginsQuery, useLoginUserMutation, useAddLoginMutation, useUpdateLoginMutation, useDeleteLoginMutation, } = AuthService;
//# sourceMappingURL=AuthService.js.map