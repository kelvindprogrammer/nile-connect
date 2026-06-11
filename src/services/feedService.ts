import { apiClient } from './api';

export interface Post {
    id: string;
    author_id: string;
    author_type: string;
    author_name?: string;
    content: string;
    media_url?: string;
    likes_count: number;
    comments_count: number;
    liked: boolean;
    created_at: string;
}

export interface PostComment {
    id: string;
    post_id: string;
    author_id: string;
    author_type: string;
    author_name: string;
    content: string;
    created_at: string;
}

interface Envelope<T> { data: T; }

export const getPosts = async (): Promise<Post[]> => {
    const { data } = await apiClient.get<Envelope<{ posts: Post[] }>>('/api/feed');
    return data.data.posts ?? [];
};

export const createPost = async (content: string, mediaUrl?: string): Promise<Post> => {
    const { data } = await apiClient.post<Envelope<Post>>('/api/feed', { content, media_url: mediaUrl });
    return data.data;
};

export const toggleLike = async (postId: string): Promise<{ liked: boolean; likes_count: number }> => {
    const { data } = await apiClient.post<Envelope<{ liked: boolean; likes_count: number }>>(`/api/feed/${postId}/like`);
    return data.data;
};

export const getComments = async (postId: string): Promise<PostComment[]> => {
    const { data } = await apiClient.get<Envelope<{ comments: PostComment[] }>>(`/api/feed/${postId}/comments`);
    return data.data.comments ?? [];
};

export const addComment = async (postId: string, content: string): Promise<PostComment> => {
    const { data } = await apiClient.post<Envelope<PostComment>>(`/api/feed/${postId}/comments`, { content });
    return data.data;
};
