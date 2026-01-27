# Appendix Generator (Web Version)

A modern web application that generates future-oriented appendices for academic books using AI.

## Features

- **Browser-based PDF processing** - Your book content never leaves your device
- **AI-powered analysis** - Uses Google Gemini to analyze book structure
- **Future-focused appendices** - Generates appendices looking 10-15 years ahead
- **Multiple export formats** - Markdown, Word (.docx), and ZIP

## Tech Stack

- **Next.js 14** - React framework
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **PDF.js** - Client-side PDF extraction
- **Google Gemini API** - AI analysis and generation

## Getting Started

### Prerequisites

- Node.js 18+
- Google AI Studio API key ([get one here](https://aistudio.google.com/apikey))

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Deployment

This app is designed for Vercel deployment:

1. Push to GitHub
2. Import project in Vercel
3. Deploy (no environment variables required - users provide their own API keys)

## Architecture

```
Browser (client-side)
├── PDF extraction (PDF.js)
├── UI and state management (React)
└── Document export (docx, file-saver)

Vercel Serverless Function
└── /api/gemini - Proxies AI requests (protects API keys)
```

## Privacy

- PDF processing happens entirely in your browser
- Book content is never stored on any server
- API keys are only used for the current session
- AI requests go through a serverless proxy to protect your API key
