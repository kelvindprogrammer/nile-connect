import { apiClient } from './api';
import type { PersonSummary } from './socialService';

interface Envelope<T> { data: T; }

export interface PollOption {
    id: string;
    text: string;
    position: number;
    /** Absent (not zero) while results are withheld, so the UI cannot leak
     *  standings by rendering a 0. */
    votes?: number;
    percent?: number;
    chosen: boolean;
}

export interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    total_votes: number;
    is_anonymous: boolean;
    multi_choice: boolean;
    expires_at?: string | null;
    closed: boolean;
    has_voted: boolean;
    results_visible: boolean;
    can_vote: boolean;
    is_author: boolean;
}

export const getPoll = async (id: string): Promise<Poll> => {
    const { data } = await apiClient.get<Envelope<{ poll: Poll }>>(
        `/api/social/poll?id=${encodeURIComponent(id)}`,
    );
    return data.data.poll;
};

export interface CreatePollInput {
    question: string;
    options: string[];
    is_anonymous?: boolean;
    multi_choice?: boolean;
    duration_hours?: number;
    hide_results_until_vote?: boolean;
}

export const createPoll = async (input: CreatePollInput): Promise<Poll> => {
    const { data } = await apiClient.post<Envelope<{ poll: Poll }>>('/api/social/poll', input);
    return data.data.poll;
};

export const votePoll = async (pollId: string, optionId: string): Promise<Poll> => {
    const { data } = await apiClient.post<Envelope<{ poll: Poll }>>('/api/social/poll-vote', {
        poll_id: pollId, option_id: optionId,
    });
    return data.data.poll;
};

export const closePoll = async (pollId: string): Promise<void> => {
    await apiClient.delete(`/api/social/poll?id=${encodeURIComponent(pollId)}`);
};

export const getPollVoters = async (
    pollId: string, optionId?: string,
): Promise<{ users: PersonSummary[]; anonymous: boolean }> => {
    const params = new URLSearchParams({ id: pollId });
    if (optionId) params.set('option_id', optionId);
    const { data } = await apiClient.get<Envelope<{ users: PersonSummary[]; anonymous: boolean }>>(
        `/api/social/poll-voters?${params}`,
    );
    return { users: data.data.users ?? [], anonymous: !!data.data.anonymous };
};

/** Human-readable time remaining, or null when the poll never closes. */
export const timeRemaining = (poll: Poll): string | null => {
    if (!poll.expires_at) return null;
    if (poll.closed) return 'Final results';
    const ms = new Date(poll.expires_at).getTime() - Date.now();
    if (ms <= 0) return 'Final results';
    const hours = Math.floor(ms / 3_600_000);
    if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
    if (hours >= 1) return `${hours}h left`;
    return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
};

export const POLL_LIMITS = { minOptions: 2, maxOptions: 6, maxOptionLength: 80, maxQuestionLength: 300 };
