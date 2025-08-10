// customBaseQuery.ts
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BASE_PATH } from "../thor/src";

const customBaseQuery = fetchBaseQuery({
  baseUrl: BASE_PATH, // Replace with your base URL
  prepareHeaders: (headers) => {
    // Retrieve the token from session storage
    const token = sessionStorage.getItem("jwtToken");
    if (token) {
      //alert("toke:" + token)
      // Set the Authorization header
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export default customBaseQuery;
