# TraceNet Frontend

The React and TypeScript client application for the TraceNet Intelligence and Response System.

## Features

- Role-aware dashboards and navigation
- Secure JWT authentication
- Case and victim management
- Interactive route and hotspot intelligence
- Alert inbox and notification management
- Analytical report generation and download
- Administrative user and audit management
- Responsive user interface

## Technology

React 19, TypeScript 6, Vite, Tailwind CSS, TanStack Query, React Hook Form, Zod, Leaflet, Recharts and Axios.

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Configure the backend API address inside `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint checks |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |

For complete project documentation, see the [root README](../README.md).