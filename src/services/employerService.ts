import { apiClient } from './api';

interface ApiEnvelope<T> { data: T; }

export interface JobListing {
    id: string; employer_id: string; title: string; type: string;
    location: string; salary: string; description: string;
    requirements: string; skills: string; deadline: string;
    status: string; applicant_count: number; posted_at: string;
}

export interface CreateJobRequest {
    title: string; type: string; location: string; salary?: string;
    description: string; requirements: string; skills?: string; deadline?: string;
}

export interface EmployerProfile {
    id: string; user_id: string; company_name: string; industry: string;
    location: string; about: string; contact_email: string;
    website: string; linkedin: string; status: string;
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

export const getEmployerApplications = async (): Promise<EmployerApplication[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ applications: EmployerApplication[] }>>('/api/employer/applications');
    return data.data.applications ?? [];
};

export const updateApplicationStatus = async (appId: string, status: string): Promise<void> => {
    await apiClient.put(`/api/employer/applications?id=${appId}`, { status });
};
