# Clearway MVP - Multi-Agent Development System

This directory contains specialized agent definitions for building the Clearway MVP using an autonomous multi-agent architecture.

## Agent Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR AGENT                         │
│         (Coordinates all agents, manages dependencies)       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   FRONTEND   │    │   BACKEND    │    │   DATABASE   │
│    AGENT     │◄──►│    AGENT     │◄──►│    AGENT     │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        │                   ▼                   │
        │           ┌──────────────┐            │
        │           │    AI/ML     │            │
        └──────────►│    AGENT     │◄───────────┘
                    └──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ INTEGRATION  │    │   DEVOPS     │    │   TESTING    │
│    AGENT     │    │    AGENT     │    │    AGENT     │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Agents Overview

### Core Development Agents

1. **[Orchestrator Agent](./orchestrator-agent.md)** 🎯
   - Coordinates all agents
   - Manages task dependencies
   - Ensures MVP completion on schedule

2. **[Frontend Agent](./frontend-agent.md)** 🎨
   - Next.js 15 App Router
   - React components with shadcn/ui
   - Responsive UI/UX implementation

3. **[Backend Agent](./backend-agent.md)** ⚙️
   - API routes (REST + tRPC)
   - Business logic
   - Server-side data processing

4. **[Database Agent](./database-agent.md)** 🗄️
   - Prisma schema design
   - Migrations
   - Query optimization

5. **[AI/ML Agent](./ai-ml-agent.md)** 🤖
   - OCR pipeline (Azure DI)
   - GPT-4 extraction
   - Prompt engineering
   - Accuracy optimization

### Infrastructure & Integration Agents

6. **[DevOps Agent](./devops-agent.md)** 🚀
   - Vercel deployment
   - CI/CD pipelines
   - Monitoring (Sentry, Langfuse, PostHog)

7. **[Integration Agent](./integration-agent.md)** 🔌
   - Clerk authentication
   - S3/R2 file storage
   - Inngest background jobs
   - Resend email

8. **[Testing Agent](./testing-agent.md)** ✅
   - Unit tests (Vitest)
   - Integration tests
   - E2E tests (Playwright)
   - AI accuracy validation

## Development Workflow

### Phase 1: Setup (Week 0)
- **DevOps Agent**: Initialize project, setup infrastructure
- **Integration Agent**: Configure third-party services
- **Database Agent**: Design initial schema

### Phase 2: Core Features (Weeks 1-4)
- **Frontend Agent**: Build upload UI, review interface
- **Backend Agent**: API routes, business logic
- **AI/ML Agent**: OCR + extraction pipeline
- **Database Agent**: Migrations, data models

### Phase 3: Advanced Features (Weeks 5-6)
- **Frontend Agent**: Calendar, alerts UI
- **Backend Agent**: Export functionality
- **Integration Agent**: Email notifications

### Phase 4: Testing & Polish (Weeks 7-8)
- **Testing Agent**: Comprehensive test coverage
- **All Agents**: Bug fixes, performance optimization
- **DevOps Agent**: Production deployment

## Communication Protocol

### Inter-Agent Communication

Agents communicate through:
1. **Shared Context Files**: `.agents/shared/`
2. **Status Updates**: `.agents/status/`
3. **Handoff Documents**: `.agents/handoffs/`

### Status Reporting Format

Each agent reports status daily:
```json
{
  "agent": "frontend-agent",
  "date": "2025-11-18",
  "status": "in-progress",
  "completed": ["task-1", "task-2"],
  "in_progress": ["task-3"],
  "blocked": [],
  "next_up": ["task-4"],
  "dependencies": {
    "waiting_for": "backend-agent:api-routes-complete"
  }
}
```

## Success Metrics

### Week 2
- ✅ Project initialized
- ✅ Database schema created
- ✅ Auth working
- ✅ File upload functional

### Week 4
- ✅ AI extraction working (90%+ accuracy)
- ✅ Review UI complete
- ✅ Basic capital call flow end-to-end

### Week 6
- ✅ Calendar view
- ✅ Email alerts
- ✅ Export functionality

### Week 8
- ✅ 95%+ test coverage
- ✅ Production deployment
- ✅ MVP feature-complete

## Getting Started

1. **Orchestrator Agent** reads all agent definitions
2. Creates detailed task breakdown aligned to MVP timeline
3. Assigns tasks to specialized agents
4. Monitors progress and manages dependencies
5. Coordinates handoffs between agents

## Agent Invocation

Each agent can be invoked by Claude Code using:
```bash
# Read agent definition
cat agents/<agent-name>-agent.md

# Agent begins work on assigned tasks
# Updates status in .agents/status/<agent-name>-status.json
```

## Dependencies

- Task Master AI for task tracking
- Claude Code for autonomous execution
- Git for version control
- GitHub for collaboration

---

**Ready to build Clearway MVP with autonomous multi-agent architecture.**
