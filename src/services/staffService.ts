import { apiClient } from './api';

interface ApiEnvelope<T> { data: T; }

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
    id: string; student_id: string; student_name: string;
    job_id: string; job_title: string; company: string;
    status: string; applied_at: string | null;
}

export interface StaffJob {
    id: string; title: string; company: string;
    employer_id: string; type: string; location: string;
    status: string; posted_at: string;
}

export interface StaffEmployer {
    id: string; company_name: string; industry: string;
    location: string; contact_email: string;
    status: string; created_at: string;
}

export interface StaffStudent {
    id: string; full_name: string; email: string;
    major: string; graduation_year: number;
    is_verified: boolean; created_at: string;
}

export interface StaffEvent {
    id: string; organiser_id: string; organiser_type: string;
    title: string; category: string; date: string; time: string;
    location: string; description: string; capacity: number;
    registrations_count: number; is_featured: boolean; status: string;
}

export interface CreateEventRequest {
    title: string; category: string; date: string;
    time: string; location: string; description: string; capacity: number;
}

export interface PostJobRequest {
    title: string; type: string; location: string;
    salary: string; description: string; requirements: string; skills: string;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<ApiEnvelope<DashboardStats>>('/api/staff/dashboard');
    return data.data;
};

export const getStaffApplications = async (): Promise<StaffApplication[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ applications: StaffApplication[] }>>('/api/staff/applications');
    return data.data.applications ?? [];
};

export const getStaffJobs = async (): Promise<StaffJob[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ jobs: StaffJob[] }>>('/api/staff/jobs');
    return data.data.jobs ?? [];
};

export const updateJobStatus = async (jobId: string, status: string): Promise<void> => {
    await apiClient.put(`/api/staff/jobs?id=${jobId}`, { status });
};

export const postJob = async (req: PostJobRequest): Promise<void> => {
    await apiClient.post('/api/staff/jobs', req);
};

export const getStaffEmployers = async (): Promise<StaffEmployer[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ employers: StaffEmployer[] }>>('/api/staff/employers');
    return data.data.employers ?? [];
};

export const updateEmployerStatus = async (profileId: string, status: string): Promise<void> => {
    await apiClient.put(`/api/staff/employers?id=${profileId}`, { status });
};

export const getStaffStudents = async (): Promise<StaffStudent[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ students: StaffStudent[] }>>('/api/staff/students');
    return data.data.students ?? [];
};

export const verifyStudent = async (studentId: string, verified: boolean): Promise<void> => {
    await apiClient.put(`/api/staff/students?id=${studentId}`, { verified });
};

export const getEvents = async (): Promise<StaffEvent[]> => {
    const { data } = await apiClient.get<ApiEnvelope<{ events: StaffEvent[] }>>('/api/events');
    return data.data.events ?? [];
};

export const createEvent = async (req: CreateEventRequest): Promise<StaffEvent> => {
    const { data } = await apiClient.post<ApiEnvelope<StaffEvent>>('/api/events', req);
    return data.data;
};

export const updateEvent = async (
    eventId: string,
    payload: { status?: string; is_featured?: boolean }
): Promise<void> => {
    await apiClient.put(`/api/events?id=${eventId}`, payload);
};

export const deleteEvent = async (eventId: string): Promise<void> => {
    await apiClient.delete(`/api/events?id=${eventId}`);
};
