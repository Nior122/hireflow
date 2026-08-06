# Contributing to HireFlow

We love your input! We want to make contributing to this project as easy and transparent as possible.

## Development Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes (`npm run build`).
5. Make sure your code lints (`npm run lint`).
6. Issue a pull request.

## Styleguide
- Use TypeScript for all new files.
- Follow the existing Tailwind CSS `oklch` color token conventions in `globals.css`.
- Server Actions should be placed in `src/actions/`.
- Reusable UI components go in `src/components/ui/` via `shadcn/ui`.
- Use Server Components by default; add `'use client'` only when React hooks or interactivity are strictly required.

## Any contributions you make will be under the MIT Software License
In short, when you submit code changes, your submissions are understood to be under the same MIT License that covers the project.
