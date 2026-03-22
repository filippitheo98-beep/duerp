# DUERP Generator - Professional Risk Assessment Application

## Overview
The DUERP Generator is a full-stack web application designed to create comprehensive workplace risk assessments. It allows users to manage company information, locations, and work units, and generates AI-powered risk analysis. The application aims to streamline the process of creating "Document Unique d'Évaluation des Risques Professionnels" (Professional Risk Assessment Documents) with features like smart suggestions, photo analysis for risk detection, and comprehensive reporting.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript, using Vite for building.
- **UI/UX**: Modern design system with Shadcn/UI (built on Radix UI) and Tailwind CSS for styling, supporting dark/light themes.
- **State Management**: React Query for server state.
- **Routing**: Wouter for client-side routing.
- **Form Handling**: React Hook Form with Zod validation.

### Backend Architecture
- **Runtime**: Node.js with Express.js, written in TypeScript (ESM modules).
- **Database**: PostgreSQL with Drizzle ORM and Neon Database for serverless operations.
- **Schema Management**: Drizzle Kit for migrations.
- **Session Management**: PostgreSQL-based sessions (connect-pg-simple).

### Core Features
- **Company Management**: Creation and updates of company details, including descriptions for AI context.
- **Hierarchical Data Management**: Restructured to Company → WorkUnits → (Postes + Sites) for managing locations and work units.
- **AI-Powered Risk Assessment**: Context-aware risk generation based on work unit type, location, and company activity, with a comprehensive risk library.
- **Prevention Measures**: Management of custom and suggested safety measures.
- **Smart Suggestions**: AI-powered recommendations for prevention measures based on detected risks.
- **Photo Analysis**: Multi-photo upload with captions and location descriptions for AI-driven risk detection.
- **Document Versioning**: Track and restore previous document versions.
- **Reporting**: Comprehensive PDF/Word export functionality including company information, risk statistics, and formatted risk tables, with chart inclusion. Excel export for specific data.
- **Revision Tracking**: Automated notifications for 1-year revision cycles (30-day advance warnings).
- **Selective Updates**: Incremental document modifications without full regeneration.

### Data Flow
- **Client-Server Communication**: RESTful API endpoints for company creation, updates, and AI risk generation.
- **Data Storage**: PostgreSQL with JSON fields for nested data; Drizzle migrations for schema changes.
- **Risk Assessment Algorithm**: Calculates risk levels (Gravity × Frequency × Control) using industry-specific risk databases.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection.
- **drizzle-orm**: Type-safe database operations.
- **@tanstack/react-query**: Server state management.
- **wouter**: Lightweight routing.
- **react-hook-form**: Form state management.
- **zod**: Schema validation.
- **connect-pg-simple**: PostgreSQL-based session storage.

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **lucide-react**: Icon library.
- **class-variance-authority**: Type-safe CSS class variants.
- **html2canvas**: For capturing charts for PDF export.

### Development Dependencies
- **vite**: Build tool and dev server.
- **typescript**: Type checking.
- **eslint**: Code linting.
- **drizzle-kit**: Database schema management.
- **tsx**: For running TypeScript files directly.
- **esbuild**: For bundling the Express server.
- **docx**: For Word export functionality.