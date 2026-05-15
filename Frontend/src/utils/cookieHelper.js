// Cookie helper functions for cross-subdomain data storage

/**
 * Set a cookie that works across all subdomains
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days (default: 30)
 */
export const setCrossDomainCookie = (name, value, days = 30) => {
    try {
        const host = window.location.hostname;
        let domain = '';
        
        // For production (rozare.com and subdomains)
        if (host.includes('rozare.com')) {
            domain = '; domain=.rozare.com';
        }
        // For localhost, don't set domain (cookies work on localhost without domain)
        else if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
            domain = '';
        }
        // For other domains (vercel, etc.), use the root domain
        else {
            const parts = host.split('.');
            if (parts.length >= 2) {
                domain = `; domain=.${parts.slice(-2).join('.')}`;
            }
        }
        
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        
        document.cookie = `${name}=${encodeURIComponent(value)}${domain}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
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
        const host = window.location.hostname;
        let domain = '';
        
        if (host.includes('rozare.com')) {
            domain = '; domain=.rozare.com';
        } else if (host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
            const parts = host.split('.');
            if (parts.length >= 2) {
                domain = `; domain=.${parts.slice(-2).join('.')}`;
            }
        }
        
        document.cookie = `${name}=''${domain}; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch (error) {
        console.error('Error deleting cookie:', error);
    }
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
    const JWT_TOKEN_COOKIE = 'rozare_jwt_token';
    const JWT_TOKEN_KEY = 'jwtToken';
    
    // Try cookie first (new method - works across subdomains)
    const cookieToken = getCookie(JWT_TOKEN_COOKIE);
    if (cookieToken) {
        return cookieToken;
    }
    
    // Fallback to localStorage (old method) and migrate
    const localToken = localStorage.getItem(JWT_TOKEN_KEY);
    if (localToken) {
        // Migrate to cookie for future use
        setCrossDomainCookie(JWT_TOKEN_COOKIE, localToken, 30);
        return localToken;
    }
    
    return null;
};
