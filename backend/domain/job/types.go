package job

import (
	"time"
)

// SearchJobsRequest represents the filters for job search
type SearchJobsRequest struct {
	Query       string   `json:"query"`
	Location    string   `json:"location"`
	Industry    []string `json:"industry"`
	JobType     []string `json:"jobType"`
	Experience  string   `json:"experience"` // entry, mid, senior
	Remote      *bool    `json:"remote"`
	SalaryMin   *int     `json:"salaryMin"`
	SalaryMax   *int     `json:"salaryMax"`
	Keyword     string   `json:"keyword"`
	CompanyName string   `json:"companyName"`
	Page        int      `json:"page"`
	Limit       int      `json:"limit"`
	SortBy      string   `json:"sortBy"` // relevance, date, salary
}

// JobSearchResult represents a job search result
type JobSearchResult struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	CompanyName     string    `json:"companyName"`
	Location        string    `json:"location"`
	JobType         string    `json:"jobType"`
	Industry        string    `json:"industry"`
	SalaryRangeMin  *int      `json:"salaryRangeMin"`
	SalaryRangeMax  *int      `json:"salaryRangeMax"`
	Remote          bool      `json:"remote"`
	Description     string    `json:"description"`
	Requirements    []string  `json:"requirements"`
	PostedAt        time.Time `json:"postedAt"`
	ApplicationURL  string    `json:"applicationUrl"`
	CompanyLogoURL  string    `json:"companyLogoUrl"`
}

// JobsListResponse represents paginated job search results
type JobsListResponse struct {
	Jobs       []JobSearchResult `json:"jobs"`
	TotalCount int               `json:"totalCount"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	TotalPages int               `json:"totalPages"`
}

// JobStats represents job posting statistics
type JobStats struct {
	TotalJobs       int `json:"totalJobs"`
	ActiveJobs      int `json:"activeJobs"`
	CompaniesCount  int `json:"companiesCount"`
	RemoteJobs      int `json:"remoteJobs"`
}

// PopularSearches represents popular search terms
type PopularSearches struct {
	Locations  []string `json:"locations"`
	Industries []string `json:"industries"`
	Companies  []string `json:"companies"`
	Skills     []string `json:"skills"`
}

