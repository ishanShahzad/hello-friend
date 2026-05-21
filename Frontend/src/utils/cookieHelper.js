// Cookie helper functions for cross-subdomain data storage

const AUTH_TOKEN_COOKIE = 'rozare_jwt_token';
const CURRENT_USER_KEY = 'currentUser';
const AUTH_LOGOUT_COOKIE = 'rozare_auth_logged_out_at';

const getCookieDomain = () => {
    const host = window.location.hostname;

    if (host.includes('rozare.com')) {
        return '.rozare.com';
    }

    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        return '';
    }

    const parts = host.split('.');
    if (parts.length >= 2) {
        return `.${parts.slice(-2).join('.')}`;
    }

    return '';
};

const buildCookieAttributes = (days, includeDomain = true) => {
    const domainValue = includeDomain ? getCookieDomain() : '';
    const domain = domainValue ? `; domain=${domainValue}` : '';
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    return `${domain}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;
};

/**
 * Set a cookie that works across all subdomains
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days (default: 30)
 */
export const setCrossDomainCookie = (name, value, days = 30) => {
    try {
        if (name === AUTH_TOKEN_COOKIE && value) {
            clearAuthLogoutMarker();
        }

        document.cookie = `${name}=${encodeURIComponent(value)}${buildCookieAttributes(days)}`;
    } catch (error) {
        console.error('Error setting cookie:', error);
    }
};

/**
 * Get a cookie value
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
export const getCookie = (name) => {
    try {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting cookie:', error);
        return null;
    }
};

/**
 * Delete a cookie
 * @param {string} name - Cookie name
 */
export const deleteCookie = (name) => {
    try {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        const domainValue = getCookieDomain();
        const domain = domainValue ? `; domain=${domainValue}` : '';

        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${secure}`;
        if (domain) {
            document.cookie = `${name}=;${domain}; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${secure}`;
        }
    } catch (error) {
        console.error('Error deleting cookie:', error);
    }
};

export const markAuthLoggedOut = () => {
    setCrossDomainCookie(AUTH_LOGOUT_COOKIE, String(Date.now()), 30);
};

export const clearAuthLogoutMarker = () => {
    deleteCookie(AUTH_LOGOUT_COOKIE);
};

export const hasAuthLogoutMarker = () => {
    return Boolean(getCookie(AUTH_LOGOUT_COOKIE));
};

/**
 * Migrate data from localStorage to cookies (for backward compatibility)
 * @param {string} localStorageKey - localStorage key
 * @param {string} cookieName - Cookie name
 */
export const migrateLocalStorageToCookie = (localStorageKey, cookieName) => {
    try {
        const data = localStorage.getItem(localStorageKey);
        if (data) {
            setCrossDomainCookie(cookieName, data);
            // Keep in localStorage as backup
        }
    } catch (error) {
        console.error('Error migrating to cookie:', error);
    }
};

/**
 * Get JWT auth token from cookie or localStorage
 * This function provides backward compatibility and cross-subdomain support
 * @returns {string|null} - JWT token or null if not found
 */
export const getAuthToken = () => {
    const JWT_TOKEN_KEY = 'jwtToken';
    
    // Try cookie first (new method - works across subdomains)
    const cookieToken = getCookie(AUTH_TOKEN_COOKIE);
    if (cookieToken) {
        return cookieToken;
    }

    // If the shared logout marker exists, never revive a stale per-subdomain localStorage token.
    if (hasAuthLogoutMarker()) {
        localStorage.removeItem(JWT_TOKEN_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        return null;
    }
    
    // Fallback to localStorage (old method) and migrate
    const localToken = localStorage.getItem(JWT_TOKEN_KEY);
    if (localToken) {
        // Migrate to cookie for future use
        setCrossDomainCookie(AUTH_TOKEN_COOKIE, localToken, 30);
        return localToken;
    }
    
    return null;
};
