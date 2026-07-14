export type ApplicationStage =
    | 'submitted'
    | 'under_review'
    | 'shortlisted'
    | 'interview_scheduled'
    | 'assessment_sent'
    | 'offer_extended'
    | 'accepted'
    | 'rejected'
    | 'withdrawn';

export const APPLICATION_STAGES: { value: ApplicationStage; label: string }[] = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'assessment_sent', label: 'Assessment Sent' },
    { value: 'offer_extended', label: 'Offer Extended' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'withdrawn', label: 'Withdrawn' },
];

export type DocumentType =
    | 'resume'
    | 'cover_letter'
    | 'reference_letter'
    | 'transcript'
    | 'siwes_letter'
    | 'certification'
    | 'portfolio';

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
    { value: 'resume', label: 'Resume / CV' },
    { value: 'cover_letter', label: 'Cover Letter' },
    { value: 'reference_letter', label: 'Reference Letter' },
    { value: 'transcript', label: 'Transcript' },
    { value: 'siwes_letter', label: 'SIWES Letter' },
    { value: 'certification', label: 'Certification' },
    { value: 'portfolio', label: 'Portfolio' },
];

export type RefereeType = 'academic' | 'professional';

export interface Document {
    id: string;
    type: DocumentType | string;
    title: string;
    file_url: string;
    file_name: string;
    referee_type?: RefereeType | string;
    expires_at?: string;
    is_default: boolean;
    created_at: string;
}

export interface ApplicationStageHistoryEntry {
    from_stage: string;
    to_stage: string;
    note?: string;
    changed_by?: string;
    created_at: string;
}

export interface ApplicationNote {
    body: string;
    rating: number;
}

export interface Application {
    id: string;
    job_id: string;
    job_title: string;
    company_name: string;
    status: string;
    stage: ApplicationStage | string;
    stage_order: number;
    applied_at: string | null;
    withdrawn_at?: string | null;
}

export interface ApplicationDetail {
    id: string;
    job_id: string;
    job_title: string;
    company_name: string;
    status: string;
    stage: ApplicationStage | string;
    applied_at: string | null;
    withdrawn_at?: string | null;
    cover_letter: string;
    documents: Document[];
    history: ApplicationStageHistoryEntry[];
}

export interface ApplicationPackage {
    job_id: string;
    required_docs: string[];
    optional_docs: string[];
    documents_by_type: Record<string, Document[]>;
}
