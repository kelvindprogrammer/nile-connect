import { aiClient } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface StudentProfile {
    full_name?: string;
    student_id?: string;
    department?: string;
    level?: string;
    cgpa?: number;
    technical_skills?: string[];
    soft_skills?: string[];
    certifications?: string[];
    career_interests?: string[];
    preferred_location?: string[];
    major?: string;
    graduation_year?: number;
}

export interface ChatResponse {
    reply: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface CVReviewResponse {
    review: string;
    pages_parsed?: number;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ---------------------------------------------------------------------------
// AI API calls  (→ Vercel Python serverless functions in /api/ai/)
// ---------------------------------------------------------------------------

/**
 * Send a career chat message to the AI counselor.
 * @param message   The user's message text.
 * @param history   Prior conversation turns for context.
 * @param profile   Student profile data to personalise the AI's responses.
 */
export const sendChatMessage = async (
    message: string,
    history: ChatMessage[],
    profile: StudentProfile = {}
): Promise<ChatResponse> => {
    const { data } = await aiClient.post<ChatResponse>('/ai/chat', {
        message,
        history,
        profile,
    });
    return data;
};

/**
 * Upload a PDF CV and (optionally) a job description for AI review.
 * @param file             The PDF file to analyse.
 * @param jobDescription   Optional job description to compare against.
 * @param profile          Student profile data for personalised feedback.
 */
export const reviewCV = async (
    file: File,
    jobDescription: string = '',
    profile: StudentProfile = {}
): Promise<CVReviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (jobDescription.trim()) {
        formData.append('job_description', jobDescription);
    }
    // Send profile as JSON string so it survives multipart encoding
    formData.append('profile', JSON.stringify(profile));

    const { data } = await aiClient.post<CVReviewResponse>('/ai/review', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};
