import { apiClient } from './api';

interface Envelope<T> { data: T; }

/**
 * Canonical event category slugs. This mirrors `lib/eventcat` on the Go side —
 * the two lists are the single vocabulary shared by the student events page,
 * the staff events console and the employer events console. Before this
 * existed each of the three invented its own spelling ("Career Fair" vs
 * "career_fair" vs "FAIR"), so category filtering matched nothing.
 */
export const EVENT_CATEGORIES = [
    { value: 'career_fair', label: 'Career Fair' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'networking', label: 'Networking' },
    { value: 'webinar', label: 'Webinar' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'info_session', label: 'Info Session' },
    { value: 'alumni_meetup', label: 'Alumni Meetup' },
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'tech_talk', label: 'Tech Talk' },
    { value: 'other', label: 'Other' },
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number]['value'];

const LABELS: Record<string, string> = Object.fromEntries(
    EVENT_CATEGORIES.map(c => [c.value, c.label]),
);

/** Human label for a canonical slug, tolerant of unknown/legacy values. */
export const categoryLabel = (slug: string): string =>
    LABELS[slug] ?? (slug ? slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Other');

export type EventStatus = 'pending' | 'published' | 'cancelled';

export interface NileEvent {
    id: string;
    organiser_id: string;
    organiser_type: string;
    title: string;
    /** Canonical slug — always one of EVENT_CATEGORIES. */
    category: string;
    category_label: string;
    date: string;
    time: string;
    location: string;
    description: string;
    capacity: number;
    registrations_count: number;
    is_featured: boolean;
    status: EventStatus;
    suggested_by?: string;
    /** Server-resolved registration state for the calling user. */
    is_registered: boolean;
    is_full: boolean;
    is_past: boolean;
}

export interface CategoryOption {
    value: string;
    label: string;
    count: number;
}

export interface EventsResult {
    events: NileEvent[];
    /** Only the categories that actually have visible events, with counts. */
    categories: CategoryOption[];
}

export interface ListEventsOptions {
    category?: string;
    upcomingOnly?: boolean;
}

export const listEvents = async (opts: ListEventsOptions = {}): Promise<EventsResult> => {
    const params = new URLSearchParams();
    if (opts.category && opts.category !== 'all') params.set('category', opts.category);
    if (opts.upcomingOnly) params.set('upcoming', '1');
    const qs = params.toString();
    const { data } = await apiClient.get<Envelope<EventsResult>>(`/api/events${qs ? `?${qs}` : ''}`);
    return { events: data.data.events ?? [], categories: data.data.categories ?? [] };
};

export interface RegistrationResult {
    registered: boolean;
    /** True when the user was already registered — a repeated click, not a new place. */
    already?: boolean;
    event: NileEvent;
    message: string;
}

export const registerForEvent = async (eventId: string): Promise<RegistrationResult> => {
    const { data } = await apiClient.post<Envelope<RegistrationResult>>(
        `/api/events/register?id=${encodeURIComponent(eventId)}`,
    );
    return data.data;
};

export const cancelRegistration = async (eventId: string): Promise<RegistrationResult> => {
    const { data } = await apiClient.delete<Envelope<RegistrationResult>>(
        `/api/events/register?id=${encodeURIComponent(eventId)}`,
    );
    return data.data;
};

export interface SuggestEventRequest {
    title: string;
    category: string;
    /** "YYYY-MM-DD" from an <input type="date">. */
    date: string;
    time: string;
    location: string;
    description: string;
    capacity?: number;
}

export interface SuggestEventResult {
    event: NileEvent;
    message: string;
}

/**
 * Go unmarshals time.Time from RFC3339 only, so the plain "YYYY-MM-DD" an
 * <input type="date"> produces has to be widened before it goes on the wire.
 * An empty date is sent as null (a "date TBA" suggestion is valid).
 */
const toRFC3339 = (dateOnly: string): string | null => {
    if (!dateOnly) return null;
    const d = new Date(`${dateOnly}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const suggestEvent = async (req: SuggestEventRequest): Promise<SuggestEventResult> => {
    const { data } = await apiClient.post<Envelope<SuggestEventResult>>('/api/events/suggest', {
        ...req,
        date: toRFC3339(req.date),
        capacity: req.capacity ?? 0,
    });
    return data.data;
};

export const createEvent = async (req: SuggestEventRequest): Promise<NileEvent> => {
    const { data } = await apiClient.post<Envelope<NileEvent>>('/api/events', {
        ...req,
        date: toRFC3339(req.date),
        capacity: req.capacity ?? 0,
    });
    return data.data;
};

export const updateEvent = async (
    eventId: string,
    payload: { status?: EventStatus; is_featured?: boolean; category?: string },
): Promise<void> => {
    await apiClient.put(`/api/events?id=${encodeURIComponent(eventId)}`, payload);
};

export const deleteEvent = async (eventId: string): Promise<void> => {
    await apiClient.delete(`/api/events?id=${encodeURIComponent(eventId)}`);
};
