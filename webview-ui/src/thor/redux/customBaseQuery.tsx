
/**
  JWT Token handling for all API requests
*/
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_PATH } from '../src';

const customBaseQuery = fetchBaseQuery({
  baseUrl: BASE_PATH, // Replace with your base URL
  prepareHeaders: (headers) => {
    // Retrieve the token from session storage
    const token = sessionStorage.getItem('jwtToken');
    if (token) {
      // Set the Authorization header
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export default customBaseQuery;
