// Helper functions for subdomain detection and handling

export const getSubdomain = () => {
    const host = window.location.hostname;
    const parts = host.split('.');
    
    // If localhost or IP, no subdomain
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        return null;
    }
    
    // Skip preview/deployment platforms
    const skipDomains = ['lovableproject.com', 'lovable.app', 'vercel.app', 'netlify.app', 'pages.dev'];
    if (skipDomains.some(domain => host.endsWith(domain))) {
        return null;
    }
    
    // If more than 2 parts (e.g., storename.tortrose.com)
    if (parts.length > 2) {
        const subdomain = parts[0];
        
        // Skip common subdomains
        if (['www', 'api', 'admin', 'app'].includes(subdomain.toLowerCase())) {
            return null;
        }
        
        return subdomain;
    }
    
    return null;
};

export const isSubdomain = () => {
    return getSubdomain() !== null;
};

export const getMainDomain = () => {
    const host = window.location.hostname;
    
    if (host === 'localhost') {
        return 'localhost:5173'; // or your dev port
    }
    
    const parts = host.split('.');
    
    // Return last two parts (e.g., tortrose.com)
    if (parts.length >= 2) {
        return parts.slice(-2).join('.');
    }
    
    return host;
};

export const redirectToMainDomain = (path = '/') => {
    const mainDomain = getMainDomain();
    const protocol = window.location.protocol;
    window.location.href = `${protocol}//${mainDomain}${path}`;
};

export const getStoreSubdomainUrl = (storeSlug) => {
    const protocol = window.location.protocol;
    const mainDomain = getMainDomain();
    
    if (mainDomain.includes('localhost')) {
        // For local development, use path-based routing
        return `/store/${storeSlug}`;
    }
    
    return `${protocol}//${storeSlug}.${mainDomain}`;
};
