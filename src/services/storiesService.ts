import { apiClient } from './api';
import type { Audience, PersonSummary } from './socialService';

interface Envelope<T> { data: T; }

export type StoryKind = 'text' | 'image' | 'video';

export interface Story {
    id: string;
    author_id: string;
    kind: StoryKind;
    media_url?: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
    duration_ms?: number;
    text?: string;
    background_color?: string;
    overlays?: string;
    audience: Audience;
    poll_id?: string;
    created_at: string;
    expires_at: string;
    viewed: boolean;
    /** Author-only. Absent for other viewers rather than zeroed. */
    views_count?: number;
    reactions_count?: number;
    replies_count?: number;
}

export interface StoryTray {
    author_id: string;
    items: Story[];
    has_unseen: boolean;
    latest_at: string;
    is_self: boolean;
}

export interface StoryTrayResponse {
    trays: StoryTray[];
    authors: Record<string, PersonSummary>;
}

export const getStoryTray = async (): Promise<StoryTrayResponse> => {
    const { data } = await apiClient.get<Envelope<StoryTrayResponse>>('/api/social/story-tray');
    return { trays: data.data.trays ?? [], authors: data.data.authors ?? {} };
};

export const getStoriesByAuthor = async (
    authorId: string,
): Promise<{ stories: Story[]; author?: PersonSummary }> => {
    const { data } = await apiClient.get<Envelope<{ stories: Story[]; author: PersonSummary }>>(
        `/api/social/stories?author_id=${encodeURIComponent(authorId)}`,
    );
    return { stories: data.data.stories ?? [], author: data.data.author };
};

export interface CreateStoryInput {
    kind: StoryKind;
    media_url?: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
    duration_ms?: number;
    text?: string;
    background_color?: string;
    overlays?: string;
    audience?: Audience;
    custom_audience?: string[];
    poll?: { question: string; options: string[]; is_anonymous: boolean };
}

export const createStory = async (input: CreateStoryInput): Promise<Story> => {
    const { data } = await apiClient.post<Envelope<{ story: Story }>>('/api/social/stories', input);
    return data.data.story;
};

export const deleteStory = async (storyId: string): Promise<void> => {
    await apiClient.delete(`/api/social/stories?id=${encodeURIComponent(storyId)}`);
};

/**
 * Records a view. `completed` distinguishes a full watch from a skip, which is
 * what makes the author's completion-rate metric meaningful — so the viewer
 * component must only pass true when the progress bar actually finished.
 */
export const markStoryViewed = async (storyId: string, completed: boolean): Promise<void> => {
    await apiClient.post('/api/social/story-view', { story_id: storyId, completed });
};

export interface StoryAnalytics {
    story_id: string;
    views: number;
    unique_viewers: number;
    completions: number;
    completion_rate: number;
    reactions: number;
    replies: number;
}

export const getStoryInsights = async (
    storyId: string,
): Promise<{ analytics: StoryAnalytics; viewers: PersonSummary[] }> => {
    const { data } = await apiClient.get<Envelope<{ analytics: StoryAnalytics; viewers: PersonSummary[] }>>(
        `/api/social/story-insights?id=${encodeURIComponent(storyId)}`,
    );
    return { analytics: data.data.analytics, viewers: data.data.viewers ?? [] };
};

/** A story reply is a direct message, not a public comment — as everywhere else. */
export const replyToStory = async (storyId: string, content: string): Promise<void> => {
    await apiClient.post('/api/social/story-reply', { story_id: storyId, content });
};

/** Background palette for text stories, defined once so the composer and the
 *  viewer cannot disagree about what a stored value means. */
export const STORY_BACKGROUNDS = [
    { value: 'gradient-blue', label: 'Blue', css: 'linear-gradient(135deg,#1E499D,#2E6FD9)' },
    { value: 'gradient-green', label: 'Green', css: 'linear-gradient(135deg,#3F8F2E,#6CBB56)' },
    { value: 'gradient-sunset', label: 'Sunset', css: 'linear-gradient(135deg,#F2545B,#F3A712)' },
    { value: 'gradient-violet', label: 'Violet', css: 'linear-gradient(135deg,#5B2C8D,#A45EE5)' },
    { value: 'gradient-night', label: 'Night', css: 'linear-gradient(135deg,#0F172A,#334155)' },
    { value: 'gradient-rose', label: 'Rose', css: 'linear-gradient(135deg,#BE185D,#F472B6)' },
] as const;

export const backgroundCss = (value?: string): string =>
    STORY_BACKGROUNDS.find(b => b.value === value)?.css ?? STORY_BACKGROUNDS[0].css;
