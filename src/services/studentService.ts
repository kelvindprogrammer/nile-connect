import { apiClient } from './api';
import type { Document, ApplicationPackage, ApplicationDetail, Application } from '../types/application';

interface ApiEnvelope<T> { data: T; }

export interface StudentProfile {
    id: string; full_name: string; username: string; email: string;
    major?: string; graduation_year?: number; bio?: string;
    skills?: string[]; certifications?: string[]; cgpa?: number;
    gpa?: number; resume_url?: string;
}

// Job reads and the apply call live in `jobService.ts`, which is what the
// pages import. The duplicates that used to sit here pointed at routes that
// do not exist — `/api/jobs/search` fell through the `/api/jobs/:id` rewrite
// and was answered as a job lookup for the id "search", and
// `/api/student/jobs/:id/apply` had no rewrite at all. Saved jobs are `job`
// bookmarks; use `saveBookmark`/`listBookmarks` from `socialService.ts`.

export const getMyApplications = async (): Promise<Application[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ applications: Application[] }>>('/api/student/applications');
    return data.data?.applications ?? [];
};

// ---------------------------------------------------------------------------
// Document library
// ---------------------------------------------------------------------------

export const getDocuments = async (): Promise<Document[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ documents: Document[] }>>('/api/student/documents');
    return data.data.documents ?? [];
};

export interface CreateDocumentRequest {
    type: string;
    title: string;
    file_url: string;
    file_name: string;
    referee_type?: string;
    expires_at?: string;
    is_default?: boolean;
}

export const createDocument = async (req: CreateDocumentRequest): Promise<Document> => {
    const { data } = await apiClient.post<ApiEnvelope<Document>>('/api/student/documents', req);
    return data.data;
};

export interface UpdateDocumentRequest {
    title?: string;
    expires_at?: string;
    is_default?: boolean;
    referee_type?: string;
}

export const updateDocument = async (id: string, payload: UpdateDocumentRequest): Promise<Document> => {
    const { data } = await apiClient.put<ApiEnvelope<Document>>(`/api/student/documents?id=${id}`, payload);
    return data.data;
};

export const deleteDocument = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/student/documents?id=${id}`);
};

// ---------------------------------------------------------------------------
// Application package / detail
// ---------------------------------------------------------------------------

export const getApplicationPackage = async (jobId: string): Promise<ApplicationPackage> => {
    const { data } = await apiClient.get<ApiEnvelope<ApplicationPackage>>('/api/student/application-package', {
        params: { job_id: jobId },
    });
    return data.data;
};

export const getApplicationDetail = async (id: string): Promise<ApplicationDetail> => {
    const { data } = await apiClient.get<ApiEnvelope<ApplicationDetail>>('/api/student/application-detail', {
        params: { id },
    });
    return data.data;
};

export const withdrawApplication = async (applicationId: string): Promise<void> => {
    await apiClient.post('/api/jobs?path=withdraw', { application_id: applicationId });
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const getStudentProfile = async (): Promise<StudentProfile> => {
    const { data } = await apiClient.get<ApiEnvelope<StudentProfile>>('/api/student/profile');
    return data.data;
};

export const updateStudentProfile = async (payload: Partial<StudentProfile>): Promise<StudentProfile> => {
    const { data } = await apiClient.put<ApiEnvelope<StudentProfile>>('/api/student/profile', payload);
    return data.data;
};
