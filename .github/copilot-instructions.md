# Copilot Instructions for Gateway Repository

## Project Overview

This is the Gateway repository for InfinityXOneSystems. The gateway serves as a central entry point for routing and managing requests across various services and systems.

## Repository Structure

This repository is currently in its initial setup phase. As the project evolves, the following conventions should be maintained:

- **Configuration files**: Keep configuration files at the repository root
- **Documentation**: Store documentation in a `docs/` directory
- **Source code**: Organize source code in a `src/` directory
- **Tests**: Place tests alongside source code or in a dedicated `tests/` directory
- **Build artifacts**: Exclude from version control using `.gitignore`

## Development Guidelines

### Code Quality Standards

- Write clear, self-documenting code with meaningful variable and function names
- Follow the principle of least privilege and secure by default
- Implement proper error handling and logging
- Keep functions small and focused on a single responsibility
- Add comments only when necessary to explain "why" not "what"

### Testing Requirements

- Write unit tests for all new functionality
- Ensure tests are isolated and can run independently
- Aim for meaningful test coverage rather than just high percentages
- Test edge cases and error conditions
- Use descriptive test names that explain what is being tested

### Security Best Practices

- Never commit secrets, API keys, or credentials to the repository
- Validate and sanitize all user inputs
- Use parameterized queries to prevent injection attacks
- Keep dependencies up to date and scan for vulnerabilities
- Follow the principle of least privilege for permissions and access
- Implement proper authentication and authorization

### Documentation Standards

- Update the README.md for any significant changes
- Document public APIs and interfaces
- Include setup and installation instructions
- Provide examples for common use cases
- Keep documentation in sync with code changes

## Git and Version Control

### Branch Strategy

- Use feature branches for new development
- Branch names should be descriptive (e.g., `feature/add-authentication`, `bugfix/fix-routing-issue`)
- Keep commits atomic and focused on a single change
- Write clear, descriptive commit messages

### Pull Request Guidelines

- Provide a clear description of changes and why they were made
- Reference related issues using `#issue-number`
- Ensure all tests pass before requesting review
- Address review comments promptly
- Keep PRs focused and reasonably sized

## Code Review Expectations

When reviewing or creating code:

- Ensure code follows established patterns and conventions
- Verify that security best practices are followed
- Check that tests are comprehensive and meaningful
- Confirm documentation is updated as needed
- Look for potential edge cases or error conditions
- Consider performance implications of changes

## Building and Testing

As the project structure evolves:

- Always run the full test suite before committing
- Verify that builds complete successfully
- Test changes in isolation before integration
- Document any new build or test requirements

## Dependencies Management

- Use standard package managers for the chosen technology stack
- Keep dependencies minimal and well-justified
- Regularly update dependencies for security patches
- Document any specific version requirements

## Communication

- Be clear and concise in commit messages and PR descriptions
- Ask questions when requirements are unclear
- Provide context for architectural decisions
- Document any assumptions made

## Task Assignment Guidelines

When assigned tasks:

- Read the full issue description and acceptance criteria carefully
- Ask for clarification if requirements are ambiguous
- Make minimal, focused changes that address the specific issue
- Consider backwards compatibility and existing functionality
- Test thoroughly before marking as complete

## Continuous Improvement

This instruction file should be updated as the project evolves to reflect:

- New architectural patterns
- Technology stack choices
- Team conventions and preferences
- Lessons learned from previous changes
- New tools or workflows adopted

---

*Note: These instructions are meant to guide the GitHub Copilot coding agent in making high-quality contributions to this repository. They should be updated regularly to reflect the current state and needs of the project.*
