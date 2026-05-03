import { getPortalUrl, SUBDOMAINS } from './subdomain';

export const redirectToPortal = (role: 'student' | 'staff' | 'employer', path: string = '') => {
    const subdomain = role === 'student' ? SUBDOMAINS.STUDENT : role === 'staff' ? SUBDOMAINS.STAFF : SUBDOMAINS.EMPLOYER;
    window.location.href = getPortalUrl(subdomain, path);
};
