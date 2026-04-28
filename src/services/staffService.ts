import { apiClient } from './api';

interface ApiEnvelope<T> {
    data: T;
}

export interface DashboardStats {
    total_students: number;
    total_employers: number;
    pending_employers: number;
    active_jobs: number;
    pending_jobs: number;
    total_applications: number;
    upcoming_events: number;
}

export interface StaffApplication {
    id: string;
    student_id: string;
    student_name: string;
    job_id: string;
    job_title: string;
    company: string;
    status: string;
    applied_at: string | null;
}

export interface StaffJob {
    id: string;
    title: string;
    company: string;
    employer_id: string;
    type: string;
    location: string;
    status: string;
    posted_at: string;
}

export interface StaffEmployer {
    id: string;
    company_name: string;
    industry: string;
    location: string;
    contact_email: string;
    status: string;
    created_at: string;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<ApiEnvelope<DashboardStats>>('/staff/dashboard');
    return data.data;
};

export const getStaffApplications = async (): Promise<StaffApplication[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ applications: StaffApplication[] }>>('/staff/applications');
    return data.data.applications;
};

export const getStaffJobs = async (): Promise<StaffJob[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ jobs: StaffJob[] }>>('/staff/jobs');
    return data.data.jobs;
};

export const updateJobStatus = async (jobId: string, status: string): Promise<void> => {
    await apiClient.put(`/staff/jobs?id=${jobId}`, { status });
};

export const getStaffEmployers = async (): Promise<StaffEmployer[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ employers: StaffEmployer[] }>>('/staff/employers');
    return data.data.employers;
};

export const updateEmployerStatus = async (profileId: string, status: string): Promise<void> => {
    await apiClient.put(`/staff/employers?id=${profileId}`, { status });
};
