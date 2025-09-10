<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Förderplan Tool - GitHub Copilot Instructions

This is a Progressive Web App (PWA) built with SvelteKit and TypeScript for teachers to create and manage student progress reports (Förderplan).

## Project Structure

- **Framework**: SvelteKit with TypeScript
- **Forms**: JSONForms for dynamic form rendering
- **Database**: PouchDB for offline-first storage with CouchDB sync
- **PDF Export**: jsPDF for generating PDF reports
- **PWA**: @vite-pwa/sveltekit for PWA functionality

## Key Features

- Offline-first data storage using PouchDB
- Sync with CouchDB server
- JSON Schema-based form validation
- PDF export functionality
- Progressive Web App capabilities
- Responsive design

## Development Guidelines

- Use TypeScript for all new code
- Follow SvelteKit conventions for routing and components
- Maintain schema-first approach for forms
- Ensure offline functionality works correctly
- Test PWA features thoroughly
- Follow accessibility best practices

## Important Files

- `/src/lib/schema/` - JSON schemas for form structure
- `/src/lib/utils/database.ts` - PouchDB database operations
- `/src/lib/utils/dataExport.ts` - Export functionality
- `/src/routes/+page.svelte` - Main application page
- `/src/routes/demo/+page.svelte` - Demo page with example data

## Dependencies

- @jsonforms/svelte - Form rendering
- pouchdb - Local database
- jspdf - PDF generation
- @vite-pwa/sveltekit - PWA support

When working on this project, prioritize offline functionality, data integrity, and user experience for teachers working in various environments.
