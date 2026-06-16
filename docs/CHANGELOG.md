# Changelog

All notable changes to Github-devy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation suite
- API reference guide
- Development guide
- Deployment guide
- Troubleshooting guide
- Contributing guide
- Advanced AI integration features
- Multi-agent system with tool calling
- Ollama local model integration
- Git operations interface
- Package management system
- Database management interface
- Debugger panel
- AI-powered UI builder
- Project planning features
- Port management system
- Advanced terminal with dual-fallback
- Browser preview with Service Worker proxy

### Changed
- Improved workspace management
- Enhanced security features
- Optimized performance
- Updated dependencies
- Improved error handling
- Better logging system

### Fixed
- Terminal connection issues
- WebSocket fallback problems
- File system permission errors
- API rate limiting
- Memory leaks in long-running processes

### Security
- Added input validation
- Implemented rate limiting
- Enhanced API key protection
- Added security headers
- Improved XSS prevention
## [1.1.0] - 2026-06-16

### Added
- **Codebase RAG Operations:** Added AST compiler symbol indexing (JavaScript/TypeScript Compiler APIs, Python syntax blocks) and dense Gemini vector similarity hybrid search.
- **Asynchronous Background Orchestration:** Configured sub-agents and parallel agents to optionally run concurrently in the background (`background: true`).
- **Iteration & Timeout Limits:** Added parameters (`maxIterations` and `timeoutSeconds`) to give main agents exact budget control over sub-agent engagement depth.
- **Task Query & Listing:** Added `get_subagent_status` and `list_subagents` tools to track and poll background agent runs.

### Fixed
- **Circular Module Load Crash (White Screen):** Extracted `TOOLS_SCHEMA` from `ollama.ts` into a dedicated decoupled file `src/agent/tools/toolsSchema.ts`, preventing runtime map compilation crashes on initial asset load.
- **LLM Context Window Bloat:** Configured automated base64 screenshot data URL stripping inside `runAgentLoop.ts` and `SubAgentRunner.ts` before dispatching message histories to LLMs.
- **File Read Safety:** Capped read size (32,000 characters truncation) on file read endpoints to prevent context window explosion on large cache/npm lock files.

## [1.0.0] - 2026-06-16


### Added
- Initial release of Github-devy
- Cloud-based development environment
- AI-powered code assistance
- Multi-workspace support
- File system explorer
- Interactive terminal
- Browser preview
- Monaco code editor
- React-based UI
- TypeScript implementation
- Express backend
- WebSocket support
- Docker deployment support

### Features
- **Workspace Management**
  - Create and manage multiple workspaces
  - Isolated development environments
  - Workspace templates
  - Import/export functionality

- **AI Integration**
  - Google Gemini API support
  - Ollama local model support
  - Context-aware code generation
  - Tool calling capabilities
  - Chat interface with streaming

- **Development Tools**
  - Monaco code editor
  - Interactive terminal with xterm.js
  - File tree explorer
  - Global search functionality
  - Git integration

- **Browser Preview**
  - Live preview in iframe
  - Service Worker proxy
  - Responsive viewport simulation
  - Network request monitoring

- **Terminal System**
  - WebSocket primary connection
  - HTTP fallback tunnel
  - Multi-tab support
  - Process management
  - Command history

- **File Operations**
  - Create, read, write, delete files
  - Directory management
  - File search with regex
  - Import from Git/ZIP
  - Export workspace

- **Git Integration**
  - Repository initialization
  - Clone repositories
  - Commit and push changes
  - Branch management
  - Merge conflict resolution

- **Package Management**
  - NPM package installation
  - Registry search
  - Dependency analysis
  - Script execution
  - Vulnerability scanning

- **Database Management**
  - SQLite support
  - Query editor
  - Table management
  - Data browsing
  - Import/export functionality

- **Security**
  - Workspace isolation
  - API key protection
  - Input validation
  - Rate limiting
  - HTTPS support

### Technology Stack
- **Frontend**: React 19, TypeScript 5.8, Tailwind CSS 4, Vite 6
- **Backend**: Node.js 18, Express, WebSocket
- **AI**: Google Gemini API, Ollama
- **Editor**: Monaco Editor
- **Terminal**: xterm.js
- **Styling**: Tailwind CSS, Framer Motion
- **Icons**: Lucide React

### Documentation
- README.md with bilingual support (English/Arabic)
- API documentation
- Component documentation
- Deployment guides
- Troubleshooting guide

### Deployment
- Docker support
- Docker Compose configuration
- Kubernetes manifests
- Helm charts
- Cloud deployment guides (Vercel, AWS, GCP, Azure)

## [0.9.0] - 2026-05-01

### Added
- Beta release
- Core functionality
- Basic AI integration
- Workspace management
- File operations
- Terminal support

### Known Issues
- Limited WebSocket support in some environments
- Performance issues with large workspaces
- Memory usage optimization needed

## [0.1.0] - 2026-01-01

### Added
- Initial development version
- Basic project structure
- Core components
- Initial API endpoints

---

## Version History

### Version 1.0.0 (2026-06-16)
- First stable release
- Full feature set
- Comprehensive documentation
- Production-ready deployment

### Version 0.9.0 (2026-05-01)
- Beta release
- Feature complete
- Public testing

### Version 0.1.0 (2026-01-01)
- Initial development
- Core architecture
- Basic functionality

---

## Breaking Changes

### Version 1.0.0
- Changed API endpoint structure
- Updated workspace configuration format
- Modified environment variable names
- Updated TypeScript types

### Migration Guide

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed migration instructions.

---

## Deprecations

### Deprecated in 1.0.0
- Old API endpoints (use new v2 endpoints)
- Legacy workspace format (migrate to new format)
- Old environment variables (update to new names)

### To Be Removed in 2.0.0
- Legacy terminal implementation
- Old file system API
- Deprecated AI integration methods

---

## Security Updates

### Version 1.0.0
- Enhanced input validation
- Improved rate limiting
- Better API key protection
- Added security headers
- XSS prevention improvements

### Version 0.9.0
- Initial security implementation
- Basic input validation
- API key protection

---

## Performance Improvements

### Version 1.0.0
- Optimized file operations
- Improved terminal performance
- Enhanced WebSocket handling
- Better memory management
- Optimized AI response streaming

### Version 0.9.0
- Initial performance optimizations
- Basic caching implementation

---

## Bug Fixes

### Version 1.0.0
- Fixed terminal connection issues
- Resolved WebSocket fallback problems
- Fixed file system permission errors
- Resolved API rate limiting issues
- Fixed memory leaks in long processes

### Version 0.9.0
- Fixed workspace creation bugs
- Resolved file operation errors
- Fixed terminal display issues

---

## Contributors

Thank you to all contributors who have helped with Github-devy:

- **Core Team**
  - Lead Developer
  - AI Integration Specialist
  - Frontend Developer
  - Backend Developer
  - DevOps Engineer

- **Contributors**
  - Community contributors
  - Beta testers
  - Documentation contributors
  - Bug reporters

---

## Support

For support, please use:
- **Documentation**: See [DOCUMENTATION.md](DOCUMENTATION.md)
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Discord**: Community Discord server
- **Email**: support@github-devy.com

---

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

*Last updated: June 2026*