import { aiClient } from './api';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface StudentProfile {
    full_name?: string; student_id?: string; department?: string;
    level?: string; cgpa?: number; technical_skills?: string[];
    soft_skills?: string[]; certifications?: string[];
    career_interests?: string[]; preferred_location?: string[];
    major?: string; graduation_year?: number;
}

export interface ChatResponse {
    reply: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface CVReviewResponse {
    review: string; pages_parsed?: number;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export const sendChatMessage = async (
    message: string,
    history: ChatMessage[],
    profile: StudentProfile = {}
): Promise<ChatResponse> => {
    const { data } = await aiClient.post<ChatResponse>('/api/ai/chat', { message, history, profile });
    return data;
};

export const reviewCV = async (
    file: File,
    jobDescription: string = '',
    profile: StudentProfile = {}
): Promise<CVReviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (jobDescription.trim()) formData.append('job_description', jobDescription);
    formData.append('profile', JSON.stringify(profile));

    const { data } = await aiClient.post<CVReviewResponse>('/api/ai/review', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};
