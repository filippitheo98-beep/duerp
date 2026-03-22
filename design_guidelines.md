# DUERP Professional Risk Assessment Tool - Design Guidelines

## Design Approach
**Selected Framework**: Design System Approach inspired by Linear's clean interface, Notion's data-entry excellence, and Stripe's professional restraint. This utility-focused productivity tool prioritizes clarity, efficiency, and professional credibility over visual flair.

## Typography
- **Primary Font**: Inter (Google Fonts) - crisp, professional readability
- **Hierarchy**: 
  - Page Titles: text-3xl font-semibold
  - Section Headers: text-xl font-medium
  - Form Labels: text-sm font-medium
  - Body/Input Text: text-base
  - Helper Text: text-sm text-gray-600

## Layout System
**Spacing Primitives**: Use Tailwind units of 3, 4, 6, 8, 12 (e.g., p-4, gap-6, mt-8)
- **Container**: max-w-7xl mx-auto px-6
- **Forms**: max-w-3xl for optimal reading/input width
- **Cards/Sections**: p-6 rounded-lg with subtle borders

## Application Structure

### Header Navigation
Fixed top navigation with:
- Company logo (left)
- Main navigation: Dashboard, New Assessment, Documents, Settings
- User profile menu with company name (right)
- Progress indicator bar for active assessments (appears when in multi-step flow)

### Hero Section (Dashboard View)
**Background Image**: Subtle abstract representation of workplace safety - blurred modern office environment or risk management iconography (20% opacity overlay, gradient from dark blue to light gray)

**Content Over Image**:
- Welcome heading with company name
- Quick action cards with blurred glass-morphism backgrounds (backdrop-blur-lg bg-white/10)
- Primary CTA: "Create New Risk Assessment" (large button with backdrop-blur)
- Secondary stats: Total Assessments, Pending Reviews, Last Update

## Core Components

### Multi-Step Form Wizard
**Step Indicators**: Horizontal progress bar with numbered circles
1. Company Information
2. Risk Identification  
3. AI Analysis Review
4. Mitigation Measures
5. Document Generation

**Form Sections**: White cards (bg-white border shadow-sm) with:
- Section title and description
- Input groups with consistent spacing (gap-6)
- Field labels above inputs with required asterisks
- Helper text below inputs when needed
- Navigation: "Previous" (ghost button) and "Continue" (primary button) at bottom

### Document Upload Zone
Drag-and-drop area with:
- Dashed border (border-2 border-dashed)
- Upload icon (Font Awesome: fa-cloud-upload-alt)
- Instructions: "Drag files here or click to browse"
- Accepted formats list (text-sm)
- Uploaded files list with preview thumbnails and remove buttons

### AI Analysis Cards
Display risk assessment results:
- Risk severity indicator (color-coded badge: High/Medium/Low)
- AI-generated description in readable paragraphs
- Confidence score percentage
- Suggested mitigation actions (bulleted list)
- "Accept" or "Modify" action buttons

### Data Tables
For document management and assessment lists:
- Striped rows (alternating bg-gray-50)
- Column headers with sort indicators
- Action column (right-aligned) with icon buttons
- Hover states on rows
- Pagination at bottom

### Company Information Form
Comprehensive input fields:
- Text inputs: Company Name, SIRET, Address
- Select dropdowns: Industry Sector, Employee Count Range
- Textarea: Activity Description
- Checkbox groups: Applicable regulations
- Grid layout (grid-cols-2 gap-6) for efficient space use

## Component Library

**Buttons**:
- Primary: Solid fill, medium weight
- Secondary: Border with transparent bg
- Ghost: Text only for tertiary actions
- Sizes: text-sm px-4 py-2 (default), text-base px-6 py-3 (large)

**Form Inputs**:
- Consistent height: h-10
- Border: border border-gray-300 rounded-md
- Focus: ring-2 ring-blue-500
- Disabled: bg-gray-100 cursor-not-allowed

**Cards**: Consistent white bg-white rounded-lg shadow-sm border border-gray-200 p-6

**Icons**: Font Awesome (CDN) - use solid style for primary actions, regular for secondary

**Status Badges**: 
- Rounded-full px-3 py-1 text-xs font-medium
- Risk levels: Red (high), Yellow (medium), Green (low)

## Animations
Minimal, purposeful only:
- Page transitions: Subtle fade-in
- Form validation: Shake on error
- Upload progress: Linear progress bar
- NO scroll animations, parallax, or decorative motion

## Images Section

**Hero Image**: Professional workspace safety concept - modern office with safety elements subtly visible (fire extinguisher, ergonomic setup, clean environment). Blurred with dark overlay to ensure text readability. Positioned as full-width background in dashboard hero section.

**Empty States**: Illustrations for "No documents yet" and "No assessments created" - simple line drawings of documents/checklists in muted colors, centered in empty table/grid areas.