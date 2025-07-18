# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` - Starts the Next.js development server on port 3000
- **Build**: `npm run build` - Runs Prisma migrations, generates client, and builds the Next.js application
- **Production start**: `npm start` - Starts the production server
- **Linting**: `npm run lint` - Runs Next.js ESLint checks

## Architecture Overview

This is a German cycling-focused web application (Custom Cycling Tracks) built with Next.js 13, featuring bike touring tools, GPX track management, and cycling calculators.

### Core Technologies
- **Frontend**: Next.js 13 with React 18, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Maps**: Leaflet with multiple providers (OpenStreetMap, Overpass API)
- **Payment**: Stripe integration
- **Analytics**: Google Analytics integration

### Database Schema
The application uses three main models:
- **Packliste**: Packing list items with categorization (category, duration, transport, location, size, accommodation)
- **Addonstrava**: Strava-related add-ons with ratings and categories
- **Bikeflix**: Video content with ratings and featured status

### Key Application Areas

1. **GPX Tools**: Located in `/pages/GPX_*` and `/pages/api/gpx-files.js`
   - GPX file manipulation and analysis
   - Route falsification detection
   - File upload and processing

2. **Cycling Calculators**: Multiple calculator tools in `/pages/`
   - Ritzelrechner (gear calculator) with chart visualization
   - Kettenlaenge (chain length calculator)
   - Speichenlaenge (spoke length calculator)
   - Wattrechner (power calculator)
   - Reifendruck/Reifengroesse (tire pressure/size calculators)

3. **Interactive Maps**: Multiple map implementations
   - `MapOSM*` components for OpenStreetMap integration
   - `MapOverpass*` components for Overpass API queries
   - Location-specific maps (Mallorca, drinking water dispensers)
   - Real-time location features via `useGeoLocation.js`

4. **Content Management**: Blog-style content system
   - Markdown posts in `/_posts/` directory
   - Post rendering via `gray-matter` and `remark`
   - Dynamic routing through `/pages/posts/[slug].js`

5. **Strava Integration**: API endpoints in `/pages/api/Strava/`
   - Segment fetching and KOM hunting features
   - Elapsed time tracking

### Layout Structure
- **Main layout**: `components/lay.js` (wraps all pages in `_app.js`)
- **Blog layout**: `components/layout.js` (for post content)
- **Session management**: Integrated with NextAuth.js at the app level

### Data Files
The `/lib/` directory contains JSON data files for various cycling-related calculations:
- Tire data, gear ratios, resistance values
- Geographic data for Mallorca (cafes, bike rental locations)

### Environment Requirements
- Database connection via `DATABASE_URL` environment variable
- Google Analytics tracking ID
- Stripe API keys for payment processing
- NextAuth configuration for authentication

### File Organization
- **Pages**: File-based routing with German naming convention
- **Components**: Mix of UI components and specialized map/calculation components
- **API Routes**: RESTful endpoints for data fetching and external API integration
- **Static Assets**: Tour GPX files organized by location in `/public/touren/`