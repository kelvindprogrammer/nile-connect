import { apiClient } from './api';
import type { ApplicationStage, ApplicationStageHistoryEntry } from '../types/application';

interface ApiEnvelope<T> { data: T; }

export interface JobListing {
    id: string; employer_id: string; title: string; type: string;
    location: string; salary: string; description: string;
    requirements: string; skills: string; deadline: string;
    status: string; applicant_count: number; posted_at: string;
    employment_category?: string;
    is_remote?: boolean;
    required_docs?: string[];
    optional_docs?: string[];
    rejection_reason?: string;
}

export interface CreateJobRequest {
    title: string; type: string; location: string; salary?: string;
    description: string; requirements: string; skills?: string; deadline?: string;
    employment_category?: string;
    is_remote?: boolean;
    required_docs?: string[];
    optional_docs?: string[];
}

export interface EmployerProfile {
    id: string; user_id: string; company_name: string; industry: string;
    location: string; about: string; contact_email: string;
    website: string; linkedin: string; status: string;
    logo_url?: string;
    company_size?: string;
    headquarters?: string;
    is_verified?: boolean;
    founded_year?: number;
}

export interface EmployerApplication {
    id: string;
    student_id: string;
    student_name: string;
    student_email: string;
    major: string;
    graduation_year: number;
    is_verified: boolean;
    job_id: string;
    job_title: string;
    status: string;
    applied_at: string | null;
    stage: ApplicationStage | string;
    stage_order: number;
    gpa: number;
    rating: number;
}

export interface EmployerApplicationDetail {
    id: string;
    job_id: string;
    job_title: string;
    student_id: string;
    student_name: string;
    student_email: string;
    major: string;
    graduation_year: number;
    gpa: number;
    status: string;
    stage: ApplicationStage | string;
    applied_at: string | null;
    cover_letter: string;
    resume_url: string;
    documents: { id: string; type: string; title: string; file_url: string; file_name: string }[];
    history: ApplicationStageHistoryEntry[];
    note: { body: string; rating: number } | null;
}

export interface GetEmployerApplicationsParams {
    job_id?: string;
    stage?: string;
    q?: string;
    sort?: 'gpa' | 'graduation_year' | 'name';
}

export const getEmployerProfile = async (): Promise<EmployerProfile> => {
    const { data } = await apiClient.get<ApiEnvelope<EmployerProfile>>('/api/employer/profile');
    return data.data;
};

export const updateEmployerProfile = async (payload: Partial<EmployerProfile>): Promise<EmployerProfile> => {
    const { data } = await apiClient.put<ApiEnvelope<EmployerProfile>>('/api/employer/profile', payload);
    return data.data;
};

export const getEmployerJobs = async (): Promise<JobListing[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ jobs: JobListing[] }>>('/api/employer/jobs');
    return data.data.jobs ?? [];
};

export const getEmployerJobDetail = async (id: string): Promise<JobListing> => {
    const { data } = await apiClient.get<ApiEnvelope<JobListing>>(`/api/employer/jobs/${id}`);
    return data.data;
};

export const postJob = async (req: CreateJobRequest): Promise<JobListing> => {
    const { data } = await apiClient.post<ApiEnvelope<JobListing>>('/api/employer/jobs', req);
    return data.data;
};

export const updateJob = async (id: string, payload: Partial<CreateJobRequest>): Promise<JobListing> => {
    const { data } = await apiClient.put<ApiEnvelope<JobListing>>(`/api/employer/jobs?id=${id}`, payload);
    return data.data;
};

export const deleteJob = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/employer/jobs?id=${id}`);
};

export const getEmployerApplications = async (params?: GetEmployerApplicationsParams): Promise<EmployerApplication[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ applications: EmployerApplication[] }>>('/api/employer/applications', { params });
    return data.data.applications ?? [];
};

export const getEmployerApplicationDetail = async (id: string): Promise<EmployerApplicationDetail> => {
    const { data } = await apiClient.get<ApiEnvelope<EmployerApplicationDetail>>('/api/employer/applications', {
        params: { path: 'application-detail', id },
    });
    return data.data;
};

export const updateApplicationStage = async (
    appId: string,
    payload: { stage: string; note?: string; stage_order?: number }
): Promise<{ id: string; stage: string; status: string }> => {
    const { data } = await apiClient.put<ApiEnvelope<{ id: string; stage: string; status: string }>>(
        `/api/employer/application-stage?id=${appId}`,
        payload
    );
    return data.data;
};

export const upsertApplicationNote = async (
    appId: string,
    payload: { body: string; rating: number }
): Promise<{ body: string; rating: number }> => {
    const { data } = await apiClient.post<ApiEnvelope<{ body: string; rating: number }>>(
        `/api/employer/application-notes?id=${appId}`,
        payload
    );
    return data.data;
};
