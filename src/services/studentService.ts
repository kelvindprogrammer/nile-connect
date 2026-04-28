import { apiClient } from './api';

interface ApiEnvelope<T> { data: T; }

export interface Job {
    id: string; title: string; company: string; location: string;
    type: string; description: string; requirements: string[];
    salary_range?: string; tags: string[]; status: string; created_at: string;
}

export interface Application {
    id: string; job_id: string; student_id: string;
    status: string; created_at: string; job?: Job;
}

export interface StudentProfile {
    id: string; full_name: string; username: string; email: string;
    major?: string; graduation_year?: number; bio?: string;
    skills?: string[]; certifications?: string[]; cgpa?: number;
}

export const getJobs = async (params?: Record<string, string>) => {
    const { data } = await apiClient.get<ApiEnvelope<Job[]>>('/api/jobs', { params });
    return data.data;
};

export const searchJobs = async (query: string) => {
    const { data } = await apiClient.get<ApiEnvelope<Job[]>>('/api/jobs/search', { params: { q: query } });
    return data.data;
};

export const getJobDetails = async (id: string) => {
    const { data } = await apiClient.get<ApiEnvelope<Job>>(`/api/jobs/${id}`);
    return data.data;
};

export const getMyApplications = async () => {
    const { data } = await apiClient.get<ApiEnvelope<Application[]>>('/api/student/applications');
    return data.data;
};

export const applyToJob = async (jobId: string) => {
    const { data } = await apiClient.post<ApiEnvelope<Application>>(`/api/student/jobs/${jobId}/apply`);
    return data.data;
};

export const saveJob = async (jobId: string) => {
    await apiClient.post(`/api/student/jobs/${jobId}/save`);
};

export const unsaveJob = async (jobId: string) => {
    await apiClient.delete(`/api/student/jobs/${jobId}/save`);
};

export const getSavedJobs = async () => {
    const { data } = await apiClient.get<ApiEnvelope<Job[]>>('/api/student/saved-jobs');
    return data.data;
};
