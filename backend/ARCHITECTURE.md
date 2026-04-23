# Nile Connect Backend - Architectural Plan

## Overview

**Nile Connect Backend** is a Go-based web application built using a **Domain-Driven Design (DDD)** architecture with a **modular, layered structure**. The system connects students, alumni, and employers through a comprehensive career and networking platform.

## Core Architecture Patterns

### Technology Stack
- **Web Framework**: GoFiber v2 (Fast HTTP framework)
- **Database**: PostgreSQL (primary) with SQLite support via GORM
- **ORM**: GORM for database operations
- **Authentication**: JWT-based with bcrypt password hashing
- **Configuration**: Environment-based with dotenv support

### Application Entry Point (`main.go`)
The application follows a clean initialization sequence:
```go
1. Load configuration
2. Initialize database connection  
3. Run database migrations
4. Create AI client
5. Create Fiber application
6. Start HTTP server
```

## Project Structure

```
/Users/mac/Nile-Connect-Backend/
├── domain/           # Business domain modules (DDD)
│   ├── auth/         # Authentication and user management
│   ├── job/          # Job posting and search functionality
│   ├── employer/     # Employer profiles and management
│   ├── application/  # Job application processing
│   ├── student/      # Student profiles and functionality
│   ├── career/       # CV and career development
│   ├── event/        # Event management
│   ├── match/        # Matching algorithms
│   ├── catchup/      # Social/community features
│   └── staff/        # Administrative functions
├── internal/         # Internal packages (not exported)
│   ├── config/       # Environment configuration
│   ├── database/     # Database models and operations
│   ├── server/       # Fiber server setup
│   ├── middleware/   # HTTP middleware
│   ├── response/     # Standardized HTTP responses
│   └── ai/           # AI client integration
├── main.go           # Application entry point
├── go.mod            # Go module definition
└── ARCHITECTURE.md   # This file
```

## Domain-Driven Design Implementation

### Domain Layer Structure
Each domain module follows a consistent pattern:
- `repository.go` - Data access layer (Repository pattern)
- `service.go` - Business logic layer (Service layer pattern)
- `handler.go` - HTTP request handlers (currently in development)
- `routes.go` - Route definitions
- Domain-specific types and interfaces

### Key Business Domains

#### 1. Auth Domain (`/domain/auth/`)
- JWT-based authentication
- Role-based access control (Student, Staff, Employer)
- Email/password authentication with verification workflows

#### 2. Job Domain (`/domain/job/`)
- Job posting and management
- Job search functionality
- Job type categorization and status tracking

#### 3. Application Domain (`/domain/application/`)
- Job application lifecycle management
- Application status workflow (Applied → Under Review → Interview → Offer/Rejected)
- Application validation and duplicate prevention

#### 4. Student Domain (`/domain/student/`)
- Student profile management
- Job application functionality
- Career development tracking

#### 5. Employer Domain (`/domain/employer/`)
- Employer profile management
- Job posting authority
- Application statistics and analytics

## Internal Packages Architecture

### 1. Configuration Management (`/internal/config/`)
- Environment-based configuration with sensible defaults
- Supports JWT secrets, database URLs, AI API keys, CORS origins
```go
type Config struct {
    Port         string `env:"PORT,default=8080"`
    DatabaseURL  string `env:"DATABASE_URL,default=postgres://localhost:5432/nile_connect"`
    JWTSecret    string `env:"JWT_SECRET,required"`
    AIApiKey     string `env:"AI_API_KEY"`
    AIApiURL     string `env:"AI_API_URL"`
    CorsOrigins  string `env:"CORS_ORIGINS,default=*"`
}
```

### 2. Database Layer (`/internal/database/`)
- **Models**: Comprehensive entity definitions with custom types
- **Custom Types**: Enums for roles, statuses, and categories
- **GORM Integration**: Auto-migration and relationship management

**Core Entities:**
- **User**: Central entity with role-based polymorphism
- **EmployerProfile**: Company information with approval workflow
- **Job**: Job postings with type categorization
- **Application**: Job applications with status state machine

### 3. Server Management (`/internal/server/`)
- Centralized Fiber app initialization
- Domain route registration and middleware setup
- Dependency injection for services

### 4. Response Handling (`/internal/response/`)
- Standardized HTTP response patterns
- Consistent error and success response formats

## Database Architecture

### Entity Relationships
```
User (1) ── (1) StudentProfile
     └── (1) EmployerProfile
         └── (N) Job
             └── (N) Application
                     └── (1) StudentProfile
```

### Key Database Features
- UUID primary keys for all entities
- Custom PostgreSQL enum types for status management
- Automatic timestamp tracking (CreatedAt, UpdatedAt)
- GORM auto-migration support
- Foreign key relationships with cascading rules

## Authentication & Security

### JWT-Based Authentication System
- Role-based access control (Student, Staff, Employer)
- Email-based login with password verification using bcrypt
- Employer account verification workflow
- Configurable token expiration
- Secure password hashing and validation

### Security Patterns
- Environment variable protection for secrets
- CORS configuration with configurable origins
- Input validation throughout the service layer
- Database query parameterization via GORM

## API Design

### RESTful API Structure
- Fiber-based HTTP handlers with JSON serialization
- Standardized HTTP status codes and error responses
- Health check endpoint (`GET /health`)
- Domain-based route organization

### Request/Response Patterns
- Consistent DTO (Data Transfer Object) patterns
- Input validation using struct tags
- Standardized error response format
- Pagination support for list endpoints

## AI Integration

### AI Client (`/internal/ai/`)
- Configurable AI API integration
- Support for intelligent matching algorithms
- Content generation and analysis capabilities
- Personalized recommendation engines

## Configuration & Deployment

### Environment Configuration
- `.env` file support with production defaults
- Comprehensive configuration validation
- Fallback to sensible defaults
- Secure secret management

### Production Considerations
- Graceful shutdown handling
- Database connection pooling
- Request/response logging
- Health check endpoints
- Error monitoring and alerting

## Development Patterns

### Code Organization
1. **Domain First**: Business logic drives architecture
2. **Interface Segregation**: Clean abstraction layers
3. **Dependency Injection**: Constructor-based DI
4. **Error Handling**: Consistent error propagation

### Testing Strategy
- Unit tests for service layer logic
- Integration tests for repository layer
- API tests for HTTP handlers
- Mock interfaces for external dependencies

## Key Design Principles

1. **Domain Separation**: Clear boundaries between business domains
2. **Layered Architecture**: Separation of concerns (Data → Business → HTTP)
3. **Interface-based Design**: Loose coupling between components
4. **Configuration-driven**: Flexible deployment across environments
5. **Security-first**: Built-in authentication and authorization patterns

## Future Development Considerations

### Current Development Status
- ✅ Core domain services and repositories implemented
- ✅ Database models and migrations ready
- ✅ Authentication system functional
- 🔄 HTTP handlers in development
- 🔄 Employer dashboard features pending
- 🔄 Advanced matching algorithms pending

### Scalability Features
- Modular domain architecture supports team scaling
- Database connection pooling for concurrent requests
- Stateless service design for horizontal scaling
- Configurable CORS for frontend integration

### Extensibility Points
- Easy to add new domains following existing patterns
- Pluggable AI integration for feature expansion
- Configurable authentication providers
- Modular middleware pipeline

---

*This architectural plan documents the current state of the Nile Connect Backend project. The architecture supports ongoing development with clear patterns for adding new features and maintaining code quality.*