# Contributing to PolyVOX

Thank you for your interest in contributing to PolyVOX! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Questions](#questions)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/polyvox.git
   cd polyvox
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/jbb-kryo/polyvox.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up environment variables**:
   - Copy `.env.example` to `.env` (if available)
   - Add your Supabase credentials
6. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Fix issues reported in GitHub Issues
- **New features**: Add new trading modules or functionality
- **Documentation**: Improve README, add examples, write guides
- **Tests**: Add unit tests, integration tests, or improve coverage
- **Performance**: Optimize algorithms or reduce resource usage
- **UI/UX**: Improve the user interface and experience
- **Code quality**: Refactoring, code cleanup, type safety improvements

### What We're Looking For

Priority areas for contributions:

- Advanced backtesting capabilities
- Additional trading strategies and modules
- Real-time WebSocket integration for market data
- Mobile responsiveness improvements
- Comprehensive test coverage
- Performance optimizations
- Security enhancements
- Documentation and examples

## Development Workflow

### 1. Sync with Upstream

Before starting work, sync your fork:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create a Feature Branch

Create a descriptive branch name:

```bash
git checkout -b feature/add-backtesting
git checkout -b fix/arbitrage-calculation
git checkout -b docs/update-readme
```

### 3. Make Your Changes

- Write clean, readable code
- Follow existing code style and conventions
- Add comments for complex logic
- Update documentation as needed
- Test your changes thoroughly

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: Add backtesting engine for strategies"
```

Use conventional commit prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode and avoid `any` types
- Define proper interfaces and types
- Use type inference where appropriate
- Document complex types with comments

### Code Style

- Follow the existing code style
- Use ESLint and fix all linting errors
- Format code consistently (2 spaces, no trailing spaces)
- Use meaningful variable and function names
- Keep functions focused and small
- Avoid deep nesting (max 3-4 levels)

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper prop types
- Handle loading and error states
- Implement proper cleanup in useEffect

### File Organization

- Group related files in directories
- Follow the existing project structure
- Keep files focused (single responsibility)
- Use index files for clean imports
- Separate concerns (UI, logic, data)

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Components**: PascalCase (e.g., `ArbitrageHunter.tsx`)
- **Functions**: camelCase (e.g., `calculateEdge()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_POSITION_SIZE`)
- **Interfaces/Types**: PascalCase (e.g., `ArbitrageOpportunity`)

## Testing Guidelines

### Writing Tests

- Write tests for new features and bug fixes
- Test edge cases and error conditions
- Use descriptive test names
- Keep tests focused and isolated
- Mock external dependencies

### Running Tests

```bash
npm run test           # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

### Type Checking

```bash
npm run typecheck      # Run TypeScript type checking
```

## Pull Request Process

### Before Submitting

Checklist before creating a PR:

- [ ] Code follows the project's coding standards
- [ ] All tests pass (`npm run test`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] ESLint shows no errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Changes are documented (README, comments, etc.)
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with main

### PR Description

Include in your PR description:

1. **What**: Brief description of changes
2. **Why**: Motivation and context
3. **How**: Implementation approach
4. **Testing**: How you tested the changes
5. **Screenshots**: For UI changes
6. **Breaking Changes**: If applicable
7. **Related Issues**: Link to relevant issues

### PR Template Example

```markdown
## Description
Add backtesting engine to test strategies against historical data.

## Motivation
Users need to validate strategies before risking real capital.

## Changes
- Added BacktestEngine class
- Implemented historical data fetching
- Created backtesting UI component
- Added performance metrics calculation

## Testing
- Manual testing with sample strategies
- Verified metrics calculations
- Tested with 1 year of historical data

## Screenshots
[Include screenshots for UI changes]

## Breaking Changes
None

## Related Issues
Closes #123
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release

### Getting Your PR Merged

Tips for faster PR acceptance:

- Keep PRs focused and reasonably sized
- Respond promptly to feedback
- Be open to suggestions and changes
- Write clear code and documentation
- Ensure all checks pass

## Reporting Bugs

### Before Reporting

- Check if the bug has already been reported
- Verify it's actually a bug and not expected behavior
- Collect information about your environment

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 10, macOS 14]
- Browser: [e.g., Chrome 120, Firefox 121]
- Node version: [e.g., 18.17.0]
- PolyVOX version: [e.g., 1.0.0]

## Screenshots
If applicable, add screenshots

## Additional Context
Any other relevant information
```

## Suggesting Enhancements

### Enhancement Template

```markdown
## Feature Description
Clear description of the proposed feature

## Motivation
Why is this feature needed?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Any other relevant information
```

## Database Changes

When modifying the database:

1. **Create a migration**: Add a new migration file in `supabase/migrations/`
2. **Follow naming convention**: `YYYYMMDDHHMMSS_description.sql`
3. **Include documentation**: Add detailed comments explaining changes
4. **Enable RLS**: Always enable Row Level Security on new tables
5. **Add policies**: Create appropriate RLS policies
6. **Update services**: Update database service files
7. **Test thoroughly**: Verify migrations work correctly
8. **Update docs**: Update DATABASE_SETUP.md if needed

## Security Contributions

For security-related contributions:

1. **DO NOT** open public issues for security vulnerabilities
2. **DO** follow the responsible disclosure process in SECURITY.md
3. **DO** test security fixes thoroughly
4. **DO** document security implications
5. **DO** consider backward compatibility

## Documentation Contributions

Documentation is just as important as code:

- Fix typos and grammatical errors
- Improve clarity and readability
- Add examples and use cases
- Update outdated information
- Add missing documentation
- Translate to other languages

## Questions?

- **General questions**: Use [GitHub Discussions](https://github.com/jbb-kryo/polyvox/discussions)
- **Bug reports**: Use [GitHub Issues](https://github.com/jbb-kryo/polyvox/issues)
- **Security concerns**: Follow [SECURITY.md](SECURITY.md)

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes (for significant contributions)
- README acknowledgments (for major features)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to PolyVOX! Your efforts help make this project better for everyone.
