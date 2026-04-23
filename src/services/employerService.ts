import { apiClient } from './api';

interface ApiEnvelope<T> {
    data: T;
}

export interface JobListing {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    location: string;
    type: string;
    salary_range?: string;
    tags: string[];
    status: string;
    created_at: string;
}

export interface CreateJobRequest {
    title: string;
    description: string;
    requirements: string[];
    location: string;
    type: string;
    salary_range?: string;
    tags?: string[];
}

export interface ApplicationSummary {
    id: string;
    student_id: string;
    student_name: string;
    status: string;
    created_at: string;
}

// ---------------------------------------------------------------------------
// Employer Profile
// ---------------------------------------------------------------------------

export const getEmployerProfile = async () => {
    const { data } = await apiClient.get<ApiEnvelope<any>>('/api/v1/employer/profile');
    return data.data;
};

export const updateEmployerProfile = async (payload: Record<string, any>) => {
    const { data } = await apiClient.put<ApiEnvelope<any>>(
        '/api/v1/employer/profile',
        payload
    );
    return data.data;
};

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const postJob = async (req: CreateJobRequest) => {
    const { data } = await apiClient.post<ApiEnvelope<JobListing>>(
        '/api/v1/employer/jobs',
        req
    );
    return data.data;
};

export const getEmployerJobs = async () => {
    const { data } =
        await apiClient.get<ApiEnvelope<JobListing[]>>('/api/v1/employer/jobs');
    return data.data;
};

export const updateJob = async (id: string, payload: Partial<CreateJobRequest>) => {
    const { data } = await apiClient.put<ApiEnvelope<JobListing>>(
        `/api/v1/employer/jobs/${id}`,
        payload
    );
    return data.data;
};

export const deleteJob = async (id: string) => {
    await apiClient.delete(`/api/v1/employer/jobs/${id}`);
};

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export const getJobApplications = async (jobId: string) => {
    const { data } = await apiClient.get<ApiEnvelope<ApplicationSummary[]>>(
        `/api/v1/employer/jobs/${jobId}/applications`
    );
    return data.data;
};

export const updateApplicationStatus = async (
    applicationId: string,
    status: string
) => {
    const { data } = await apiClient.put<ApiEnvelope<ApplicationSummary>>(
        `/api/v1/employer/applications/${applicationId}/status`,
        { status }
    );
    return data.data;
};
