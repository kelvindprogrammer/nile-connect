export const getSubdomain = () => {
    const hostname = window.location.hostname;
    
    // For local development
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        const parts = hostname.split('.');
        if (parts.length > 1) {
            return parts[0];
        }
        return null;
    }

    // For production: builtbysalih.com
    const parts = hostname.split('.');
    if (parts.length >= 3) {
        // e.g., student.builtbysalih.com -> student
        return parts[0];
    }
    
    return null;
};

export const getPortalUrl = (subdomain: string, path: string = '') => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    // For local development
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        const parts = hostname.split('.');
        const baseHost = parts.length > 1 ? parts.slice(1).join('.') : hostname;
        return `${protocol}//${subdomain}.${baseHost}${port ? `:${port}` : ''}${path}`;
    }

    // For production: builtbysalih.com
    const parts = hostname.split('.');
    let baseDomain = 'builtbysalih.com';
    
    // Attempt to extract base domain if not builtbysalih.com (for flexibility)
    if (parts.length >= 2) {
        baseDomain = parts.slice(-2).join('.');
    }

    return `${protocol}//${subdomain}.${baseDomain}${path}`;
};

export const getRelativePath = (path: string) => {
    const subdomain = getSubdomain();
    if (!subdomain) return path;

    // If path starts with the subdomain prefix, strip it
    // e.g., /student/feed -> /feed
    const prefix = `/${subdomain}`;
    if (path.startsWith(prefix)) {
        const remaining = path.substring(prefix.length);
        return remaining === '' ? '/' : remaining;
    }
    
    return path;
};

export const getHomeUrl = (path: string = '') => {
    const hostname = window.location.hostname;
    const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    const port = window.location.port;
    
    if (isLocal) {
        // Find the base localhost domain (remove any subdomain)
        const parts = hostname.split('.');
        const baseHost = parts.length > 1 ? parts.slice(-1)[0] : hostname;
        return `${window.location.protocol}//${baseHost}${port ? `:${port}` : ''}${path}`;
    }
    
    const baseDomain = 'builtbysalih.com';
    return `${window.location.protocol}//${baseDomain}${path}`;
};

export const SUBDOMAINS = {
    STUDENT: 'student',
    STAFF: 'staff',
    EMPLOYER: 'employer',
} as const;
