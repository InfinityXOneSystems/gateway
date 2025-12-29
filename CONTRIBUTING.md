# Contributing to Infinity X One Gateway

Thank you for your interest in contributing to the Infinity X One Gateway project! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Process](#development-process)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Submitting Changes](#submitting-changes)
7. [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js >= 16.x
- npm or yarn
- Git

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/gateway.git
   cd gateway
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/InfinityXOneSystems/gateway.git
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Process

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes

### Commit Messages

Follow the conventional commits specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:
```
feat: add WebSocket support to gateway
fix: resolve rate limiter memory leak
docs: update API documentation for JWT auth
```

## Coding Standards

### JavaScript Style Guide

- Use ES6+ features where appropriate
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Code Organization

```
src/
├── gateway/       # Core gateway functionality
├── auth/          # Authentication modules
├── middleware/    # Middleware components
├── routing/       # Routing and load balancing
├── config/        # Configuration files
└── utils/         # Utility functions
```

### Best Practices

1. **Error Handling**: Always handle errors appropriately
2. **Logging**: Use appropriate log levels
3. **Security**: Never commit secrets or sensitive data
4. **Performance**: Consider performance implications
5. **Documentation**: Update docs when adding features

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests
npm run test:integration # Run integration tests
npm run test:coverage # Generate coverage report
```

### Writing Tests

- Write tests for new features
- Update tests when modifying existing code
- Aim for high test coverage
- Use descriptive test names

Example test:
```javascript
describe('RateLimiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = new RateLimiter({ max: 100 });
    // Test implementation
  });
});
```

## Submitting Changes

### Pull Request Process

1. Update your branch with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Ensure all tests pass:
   ```bash
   npm test
   ```

3. Push your changes:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

### Pull Request Guidelines

- Provide a clear description of changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure CI checks pass
- Request review from maintainers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] All tests passing
```

## Reporting Issues

### Bug Reports

Include:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (Node version, OS, etc.)
- Relevant logs or error messages

### Feature Requests

Include:
- Description of the feature
- Use case and motivation
- Proposed implementation (optional)
- Examples of similar features in other projects

### Security Issues

**Do not** open public issues for security vulnerabilities. Instead, email security concerns to the maintainers privately.

## Development Guidelines

### Adding New Middleware

1. Create file in `src/middleware/`
2. Implement middleware class
3. Export factory function
4. Add documentation
5. Add tests
6. Update README

### Adding New Features

1. Discuss in an issue first
2. Create feature branch
3. Implement feature
4. Add tests and documentation
5. Submit pull request

### Code Review

All submissions require review. We use GitHub pull requests for this purpose. Reviewers will:

- Check code quality
- Verify tests
- Review documentation
- Ensure backward compatibility
- Provide constructive feedback

## Questions?

If you have questions:
- Open a discussion on GitHub
- Join our community chat
- Contact maintainers

Thank you for contributing to Infinity X One Gateway! 🚀
