# Contributing to HireFlow

Thank you for your interest in contributing to HireFlow! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Submit a pull request

## Development Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run development server
npm run dev
```

## Code Standards

### TypeScript
- Strict TypeScript mode
- No `any` types unless absolutely necessary
- Proper interfaces and types
- Zod for runtime validation

### React
- Functional components only
- Hooks for state management
- Server Components where possible
- Client Components only for interactivity

### Styling
- Tailwind CSS classes
- shadcn/ui components
- Responsive design
- Dark mode support

### Testing
- Write tests for new features
- Maintain test coverage
- Test edge cases

## Pull Request Process

1. Update documentation
2. Add tests if applicable
3. Ensure build passes
4. Request review
5. Address feedback

## Commit Messages

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `test:` — Tests
- `refactor:` — Code refactor
- `chore:` — Maintenance

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Include environment info
- Include screenshots if UI-related

## Security Issues

Report security vulnerabilities to security@hireflow.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
