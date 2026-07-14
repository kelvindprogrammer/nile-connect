export type EmploymentCategory =
    | 'internship'
    | 'siwes'
    | 'nyse'
    | 'graduate'
    | 'full-time'
    | 'part-time'
    | 'contract';

export interface EmployerSummary {
    company_name: string;
    logo_url: string;
    industry: string;
    company_size: string;
    headquarters: string;
    website: string;
    about: string;
    is_verified: boolean;
}

export interface JobListItem {
    id: string;
    title: string;
    company_name: string;
    location: string;
    type: string;
    employment_category: EmploymentCategory | string;
    is_remote: boolean;
    salary: string;
    skills: string;
    description: string;
    applicant_count: number;
    posted_at: string;
    deadline: string;
}

export interface JobDetail {
    id: string;
    title: string;
    location: string;
    type: string;
    employment_category: EmploymentCategory | string;
    is_remote: boolean;
    salary: string;
    skills: string;
    description: string;
    requirements: string;
    status: string;
    required_docs: string[];
    optional_docs: string[];
    applicant_count: number;
    posted_at: string;
    deadline: string;
    employer: EmployerSummary;
    other_open_positions: JobListItem[];
}

// Backwards-compatible alias used by a few existing call sites.
export type Job = JobListItem;
