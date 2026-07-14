import { apiClient } from './api';
import type { JobListItem, JobDetail } from '../types/job';

interface ApiEnvelope<T> { data: T; }

export const getJobs = async (params?: Record<string, string>): Promise<JobListItem[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ jobs: JobListItem[] }>>('/api/jobs', { params });
    return data.data.jobs ?? [];
};

export const getJobDetail = async (id: string): Promise<JobDetail> => {
    const { data } = await apiClient.get<ApiEnvelope<{ job: JobDetail }>>(`/api/jobs/${id}`);
    return data.data.job;
};

export interface ApplyToJobRequest {
    job_id: string;
    cover_letter?: string;
    resume_url?: string;
    document_ids?: string[];
}

export const applyToJob = async (req: ApplyToJobRequest): Promise<{ id: string; status: string; stage: string; applied_at: string }> => {
    const { data } = await apiClient.post<ApiEnvelope<{ id: string; status: string; stage: string; applied_at: string }>>('/api/jobs', req);
    return data.data;
};

export const withdrawApplication = async (applicationId: string): Promise<void> => {
    await apiClient.post('/api/jobs?path=withdraw', { application_id: applicationId });
};
