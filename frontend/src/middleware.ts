export { } from "next/server";

// Auth is handled client-side via Bearer token to the separate backend.
// Each page redirects to /login if the API returns 401.
export const config = {
  matcher: [],
};
