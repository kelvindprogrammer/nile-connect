import { apiClient } from './api';

export interface LoginRequest { email: string; password: string; }

export interface StudentRegisterRequest {
    full_name: string; username: string; email: string; password: string;
}

export interface EmployerRegisterRequest {
    full_name: string; username: string; email: string; password: string;
    company_name: string; industry: string; location: string;
    about: string; contact_email: string; website?: string;
}

export interface ProfileCompletionRequest {
    user_id: string; major: string; graduation_year: number;
}

export interface BackendUser {
    id: string; full_name: string; username: string; email: string;
    role: 'student' | 'staff' | 'employer'; student_subtype?: string | null;
    major?: string | null; graduation_year?: number | null; is_verified: boolean;
}

export interface AuthResponse { user: BackendUser; token: string; }

interface ApiEnvelope<T> { data: T; }

export const login = async (req: LoginRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiEnvelope<AuthResponse>>('/api/auth/login', req);
    return data.data;
};

export const registerStudent = async (req: StudentRegisterRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiEnvelope<AuthResponse>>('/api/auth/register/student', req);
    return data.data;
};

export const registerEmployer = async (req: EmployerRegisterRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiEnvelope<AuthResponse>>('/api/auth/register/employer', req);
    return data.data;
};

export const completeStudentProfile = async (req: ProfileCompletionRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiEnvelope<AuthResponse>>('/api/auth/profile/complete', req);
    return data.data;
};
