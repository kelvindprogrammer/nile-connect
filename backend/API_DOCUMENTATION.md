# Nile Connect API Documentation

## Overview

Nile Connect is a student career platform with AI-powered job matching capabilities. This API handles authentication, job discovery, applications, and career tracking.

**Base URL:** `http://localhost:8080`

## Authentication

All endpoints except `/auth/login` require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### Authentication

#### POST /auth/login

Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "student@demo.edu",
  "password": "demo123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "demo-student-001",
      "full_name": "Demo Student",
      "username": "demo_student", 
      "email": "student@demo.edu",
      "role": "student",
      "student_subtype": "current",
      "major": "Computer Science",
      "graduation_year": 2025,
      "is_verified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Demo Accounts:**
- Student: `student@demo.edu` / `demo123`
- Employer: `employer@demo.com` / `demo123` 
- Staff: `staff@demo.edu` / `demo123`

### Student Job Discovery

#### GET /api/student/jobs

Get job listings with AI-powered match scores.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters (optional):**
- `type` - Job type (full-time, part-time, internship)
- `location` - Job location
- `industry` - Industry filter

**Response (200):**
```json
{
  "jobs": [
    {
      "id": "job-001",
      "title": "Senior Frontend Developer",
      "company_name": "TechCorp Inc.",
      "type": "Full-time",
      "location": "Cairo, Egypt",
      "salary": "$70k - $90k",
      "industry": "Technology",
      "posted_at": "2024-03-15T00:00:00Z",
      "applicant_count": 24,
      "match_score": 92,
      "is_saved": false
    }
  ]
}
```

**Match Score Explanation:**
- **90+**: Excellent match with your profile
- **80-89**: Strong match 
- **70-79**: Good match
- **60-69**: Fair match
- **Below 60**: Limited match

#### POST /api/student/jobs/{job_id}/apply

Apply to a specific job.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
- `job_id` - ID of the job to apply for

**Request Body:**
```json
{
  "cover_letter": "I am excited to apply for this position..."
}
```

**Response (201):**
```json
{
  "message": "Application submitted successfully",
  "application_id": "app-001",
  "status": "Applied",
  "applied_at": "2024-03-15T10:30:00Z"
}
```

### Student Applications Tracking

#### GET /api/student/applications

Get all applications submitted by the student.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "applications": [
    {
      "id": "app-001",
      "job_id": "job-001", 
      "job_title": "Senior Frontend Developer",
      "company_name": "TechCorp Inc.",
      "status": "under_review",
      "applied_at": "2024-03-14T10:30:00Z",
      "cover_letter": "I'm excited to apply for this position..."
    }
  ]
}
```

**Application Statuses:**
- `applied` - Application submitted
- `under_review` - Employer is reviewing application
- `interview_scheduled` - Interview scheduled
- `rejected` - Application rejected
- `accepted` - Job offer received

### CV Management

#### POST /api/student/cv/upload

Upload a CV for AI analysis.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - CV file (PDF, DOC, DOCX)

**Response (200):**
```json
{
  "id": "cv-001",
  "filename": "my_cv.pdf",
  "uploaded_at": "2024-03-15T11:30:00Z",
  "message": "CV uploaded successfully"
}
```

#### GET /api/student/cv/{cv_id}/analyse

Get AI analysis of uploaded CV.

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `cv_id` - ID of the uploaded CV

**Response (200):**
```json
{
  "cv_id": "cv-001",
  "score": 78,
  "strengths": ["Python", "Problem Solving", "Team Collaboration"],
  "weaknesses": ["Limited work experience", "Could add more projects"],
  "suggestions": ["Add more personal projects", "Include GitHub profile"],
  "analysis_date": "2024-03-15T11:35:00Z"
}
```

### Job Search

#### GET /api/student/jobs/search

Search for jobs using keywords.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `q` - Search query (required)
- `type` - Job type filter
- `location` - Location filter
- `industry` - Industry filter

**Response (200):**
```json
{
  "jobs": [
    {
      "id": "job-004",
      "title": "Frontend Developer",
      "company_name": "WebTech Solutions",
      "type": "Full-time",
      "location": "Cairo, Egypt", 
      "salary": "$50k - $70k",
      "industry": "Technology",
      "posted_at": "2024-03-01T00:00:00Z",
      "applicant_count": 31,
      "match_score": 85
    }
  ],
  "query": "frontend developer",
  "results": 1
}
```

### Employer Endpoints

#### POST /api/employer/jobs

Create a new job posting (employer role required).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Software Engineer",
  "type": "Full-time",
  "location": "Cairo, Egypt",
  "salary": "$60k - $80k",
  "description": "Join our innovative team...",
  "requirements": ["3+ years experience", "JavaScript proficiency"],
  "deadline": "2024-04-15T00:00:00Z"
}
```

**Response (201):**
```json
{
  "id": "new-job-001",
  "title": "Software Engineer",
  "company": "Demo Company",
  "message": "Job posted successfully"
}
```

### Admin Endpoints

#### POST /api/admin/jobs/{job_id}/approve

Approve a job posting (admin/staff role required).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "job_id": "job-001",
  "status": "approved",
  "approved_by": "demo-admin",
  "approved_at": "2024-03-15T12:00:00Z"
}
```

## Error Handling

### Common Error Responses

**400 - Bad Request:**
```json
{
  "error": "Validation failed",
  "details": ["Email is required", "Password must be at least 6 characters"]
}
```

**401 - Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 - Forbidden:**
```json
{
  "error": "Insufficient permissions"
}
```

**404 - Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 - Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

- **General endpoints:** 100 requests per minute
- **Authentication endpoints:** 10 requests per minute  
- **File upload endpoints:** 5 requests per minute

## Demo Mode Features

When running in demo mode:
- All data is pre-seeded with realistic mock data
- JWT tokens expire in 24 hours
- File uploads are simulated (no actual file storage)
- AI analysis returns consistent results for demo consistency

## Health Check

#### GET /health

Check API health status.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-15T12:00:00Z",
  "version": "1.0.0"
}
```

## Response Format

All successful responses follow this structure:
```json
{
  "data": {
    // Response data here
  }
}
```

For endpoints that don't return data:
```json
{
  "message": "Operation completed successfully"
}
```

## Data Types

### Job
```typescript
interface Job {
  id: string;
  title: string;
  company_name: string;
  type: 'Full-time' | 'Part-time' | 'Internship';
  location: string;
  salary: string;
  industry: string;
  posted_at: string;
  applicant_count: number;
  match_score: number; // AI-powered matching score (0-100)
  is_saved?: boolean;
}
```

### Application
```typescript
interface Application {
  id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  status: 'applied' | 'under_review' | 'interview_scheduled' | 'rejected' | 'accepted';
  applied_at: string;
  cover_letter: string;
}
```

### CV Analysis
```typescript
interface CVAnalysis {
  cv_id: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  analysis_date: string;
}
```

## Changelog

### v1.0.0 (Current)
- Initial API release
- Authentication system
- Job discovery with AI matching
- Application tracking
- CV analysis features
- Demo mode support

## Support

For API support or issues:
- Check the `/health` endpoint first
- Verify authentication tokens are valid
- Ensure request format matches documentation
- Check rate limiting if receiving 429 errors

---

*Documentation generated for Nile Connect API v1.0.0*