# Contributing to Clearway

Thank you for your interest in contributing to Clearway! This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Style Guidelines](#code-style-guidelines)
5. [Git Workflow](#git-workflow)
6. [Pull Request Process](#pull-request-process)
7. [Testing Requirements](#testing-requirements)
8. [Documentation Requirements](#documentation-requirements)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards

**Positive behaviors**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors**:
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Report violations to: conduct@clearway.com

---

## Getting Started

### Prerequisites

Before contributing:

1. **Read the documentation**: Familiarize yourself with the project
2. **Set up dev environment**: Follow [Developer Setup Guide](development/SETUP.md)
3. **Explore the codebase**: Understand the project structure
4. **Check existing issues**: See if someone is already working on it

### Ways to Contribute

- **Bug Reports**: Found a bug? Open an issue
- **Feature Requests**: Have an idea? Suggest it
- **Code**: Submit pull requests
- **Documentation**: Improve docs
- **Testing**: Write tests, find edge cases
- **Design**: UI/UX improvements

---

## Development Workflow

### 1. Find or Create an Issue

**Before starting work**:
- Check existing issues
- Comment on the issue to claim it
- Get approval from maintainers

**Creating a new issue**:
```markdown
**Description**: Brief description of the issue
**Steps to Reproduce**: How to reproduce (for bugs)
**Expected Behavior**: What should happen
**Actual Behavior**: What actually happens
**Environment**: OS, browser, version
**Screenshots**: If applicable
```

### 2. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/clearway.git
cd clearway

# Add upstream remote
git remote add upstream https://github.com/clearway/clearway.git
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming conventions**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

Examples:
- `feature/quickbooks-integration`
- `fix/pdf-upload-timeout`
- `docs/api-reference-update`

### 4. Make Changes

- Write clean, readable code
- Follow style guidelines (see below)
- Add tests for new features
- Update documentation

### 5. Test Your Changes

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Check coverage
npm run test:coverage

# Lint code
npm run lint
```

### 6. Commit Your Changes

```bash
git add .
git commit -m "feat: Add QuickBooks integration"
```

See [Git Workflow](#git-workflow) for commit message conventions.

---

## Code Style Guidelines

### TypeScript/JavaScript

**Use TypeScript**: All new code should be TypeScript

**Naming Conventions**:
```typescript
// PascalCase for types, interfaces, classes
interface CapitalCall {}
class DocumentProcessor {}

// camelCase for functions, variables
const capitalCallId = '...';
function processDocument() {}

// UPPER_CASE for constants
const MAX_FILE_SIZE = 50 * 1024 * 1024;
```

**File Organization**:
```typescript
// 1. Imports
import { useState } from 'react';
import type { CapitalCall } from '@/types';

// 2. Types/Interfaces
interface Props {
  capitalCall: CapitalCall;
}

// 3. Component/Function
export function CapitalCallCard({ capitalCall }: Props) {
  // Implementation
}
```

**Prefer Functional Components**:
```typescript
// Good
export function CapitalCallList() {
  const [calls, setCalls] = useState([]);
  return <div>...</div>;
}

// Avoid (unless necessary)
export class CapitalCallList extends React.Component {
  // ...
}
```

**Use Modern JavaScript**:
```typescript
// Good - async/await
async function fetchCapitalCalls() {
  const response = await fetch('/api/capital-calls');
  return response.json();
}

// Avoid - promises
function fetchCapitalCalls() {
  return fetch('/api/capital-calls')
    .then(res => res.json());
}
```

### React

**Component Structure**:
```typescript
export function CapitalCallCard({ capitalCall }: Props) {
  // 1. Hooks
  const [isExpanded, setIsExpanded] = useState(false);
  const { mutate } = useMutation(...);

  // 2. Event handlers
  const handleApprove = async () => {
    await mutate({ id: capitalCall.id });
  };

  // 3. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

**Props Destructuring**:
```typescript
// Good
export function CapitalCallCard({ capitalCall, onApprove }: Props) {
  return <div>{capitalCall.fundName}</div>;
}

// Avoid
export function CapitalCallCard(props: Props) {
  return <div>{props.capitalCall.fundName}</div>;
}
```

### CSS (Tailwind)

**Use Tailwind Utilities**:
```tsx
// Good
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Approve
</button>

// Avoid custom CSS unless necessary
<button className="custom-button">Approve</button>
```

**Group Related Classes**:
```tsx
<div className="
  flex items-center justify-between
  bg-white border border-gray-200 rounded-lg
  p-4 shadow-sm
">
  {/* Content */}
</div>
```

### Linting

**ESLint**: Automatically enforced

```bash
# Check for issues
npm run lint

# Fix issues
npm run lint -- --fix
```

**Prettier**: Format code automatically

```bash
# Format all files
npm run format
```

---

## Git Workflow

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no code change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(api): Add QuickBooks integration endpoint

Implements POST /api/integrations/quickbooks for OAuth connection.

Closes #123
```

```
fix(upload): Handle large PDF uploads

Increased timeout and added chunked upload for files >25MB.

Fixes #456
```

```
docs(api): Update API reference for webhooks

Added examples for webhook signature verification.
```

### Keep Your Fork Up to Date

```bash
# Fetch upstream changes
git fetch upstream

# Merge into your branch
git checkout main
git merge upstream/main

# Update your fork on GitHub
git push origin main
```

---

## Pull Request Process

### Before Submitting

**Checklist**:
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added (if applicable)
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commit messages follow convention

### Creating a Pull Request

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open PR on GitHub**: Click "New Pull Request"

3. **Fill out PR template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   How did you test this?

   ## Screenshots
   If applicable

   ## Checklist
   - [ ] Tests pass
   - [ ] Docs updated
   - [ ] No breaking changes (or documented)
   ```

4. **Wait for review**: Maintainers will review within 3-5 business days

### Review Process

**What reviewers look for**:
- Code quality and readability
- Test coverage
- Performance impact
- Security concerns
- Documentation completeness

**Addressing feedback**:
```bash
# Make requested changes
git add .
git commit -m "fix: Address review feedback"
git push origin feature/your-feature-name
```

### Merging

- **Squash and merge**: Multiple commits are squashed into one
- **Delete branch**: After merge, delete your branch
- **Celebrate**: You're now a contributor! 🎉

---

## Testing Requirements

### Unit Tests

**Required for**:
- New features
- Bug fixes
- Utility functions

**Example**:
```typescript
// lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './utils';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1000.50, 'USD')).toBe('$1,000.50');
  });
});
```

### Integration Tests

**Required for**:
- API endpoints
- Database operations
- Third-party integrations

**Example**:
```typescript
// tests/integration/capital-calls.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/capital-calls/route';

describe('POST /api/capital-calls', () => {
  it('creates capital call', async () => {
    const request = new Request('http://localhost/api/capital-calls', {
      method: 'POST',
      body: JSON.stringify({ /* ... */ })
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

### E2E Tests

**Required for**:
- Critical user flows
- Multi-step processes

**Example**:
```typescript
// tests/e2e/capital-call-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete capital call flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Upload Document');
  // ... rest of test
});
```

### Coverage Requirements

- **Minimum**: 80% code coverage
- **Target**: 95% code coverage
- **Critical paths**: 100% coverage

```bash
# Check coverage
npm run test:coverage
```

---

## Documentation Requirements

### Code Documentation

**JSDoc for public APIs**:
```typescript
/**
 * Processes a capital call document
 * @param documentId - The document ID to process
 * @param options - Processing options
 * @returns Extracted capital call data
 * @throws {ProcessingError} If document processing fails
 */
export async function processDocument(
  documentId: string,
  options?: ProcessingOptions
): Promise<CapitalCall> {
  // Implementation
}
```

### README Updates

Update README if you:
- Add new features
- Change installation process
- Modify configuration

### API Documentation

Update `docs/api/API_REFERENCE.md` if you:
- Add new endpoints
- Change existing endpoints
- Modify request/response formats

### User Documentation

Update user guides if you:
- Add user-facing features
- Change UI workflows
- Add integrations

---

## Questions?

**Need help?**
- **Discord**: Join our developer community
- **Email**: dev@clearway.com
- **Office Hours**: Fridays 2-3pm EST

**Report Issues**:
- **GitHub Issues**: https://github.com/clearway/clearway/issues
- **Email**: bugs@clearway.com

---

Thank you for contributing to Clearway! 🙏
