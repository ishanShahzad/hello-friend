// Auth utility functions
import { getAuthToken as getAuthTokenFromCookie } from './cookieHelper';

/**
 * Get JWT auth token - works across subdomains
 * Use this instead of getAuthToken()
 */
export const getAuthToken = () => {
    return getAuthTokenFromCookie();
};

// For backward compatibility, also support direct localStorage access
// This will automatically migrate to cookies
export { getAuthToken as default };
