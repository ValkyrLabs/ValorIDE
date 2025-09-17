
/**
  JWT Token handling for all API requests
*/
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_PATH } from '../src';

const customBaseQuery = fetchBaseQuery({
  baseUrl: BASE_PATH,
  credentials: 'include',
  prepareHeaders: (headers) => {
    // Retrieve the token from sessionStorage with localStorage fallback
    let token: string | null = null;
    try {
      token = sessionStorage.getItem('jwtToken');
      if (!token) {
        token = localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
        if (token) {
          // Mirror into session for consistency
          sessionStorage.setItem('jwtToken', token);
          try {
            window.dispatchEvent(
              new CustomEvent('jwt-token-updated', {
                detail: { token, timestamp: Date.now(), source: 'api-baseQuery' },
              })
            );
          } catch {}
        }
      }
    } catch {
      // ignore storage access
    }

    // Ensure JSON by default; callers can override
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    // Set Authorization header (both common casings for safety)
    if (token) {
      const bearer = `Bearer ${token}`;
      headers.set('Authorization', bearer);
      headers.set('authorization', bearer);
    }
    return headers;
  },
});

export default customBaseQuery;
