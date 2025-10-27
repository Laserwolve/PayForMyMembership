# Contributing to PayForMyMembership

Thank you for considering contributing to PayForMyMembership! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Make your changes
5. Test your changes: `npm start`
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18.0 or higher
- Git

### Project Structure

```
├── index.js        # Main entry point and game selection
├── osrs.js         # OSRS market analyzer
├── eve.js          # EVE Online market analyzer
├── package.json    # Project configuration
└── README.md       # Project documentation
```

## Contribution Guidelines

### Code Style

- Use modern JavaScript (ES6+)
- Follow existing code formatting
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Keep functions focused and single-purpose

### Adding New Games

To add support for a new game:

1. Create a new file (e.g., `gw2.js` for Guild Wars 2)
2. Export a `runGAME()` function that follows the same pattern
3. Add the game option to `index.js`
4. Update the README with game-specific information
5. Ensure API calls respect rate limits
6. Include proper error handling

### API Integration

When working with game APIs:

- Always include appropriate User-Agent headers
- Implement rate limiting (minimum 1 second between requests)
- Handle errors gracefully
- Use HTTPS endpoints only
- Respect terms of service

### Testing

Before submitting changes:

1. Test with multiple budget amounts
2. Test with different numbers of items
3. Verify error handling works
4. Check rate limiting is respected
5. Ensure output formatting is consistent

## Types of Contributions

### Bug Reports

When reporting bugs:
- Use a clear, descriptive title
- Describe the exact steps to reproduce
- Include error messages and stack traces
- Specify your operating system and Node.js version

### Feature Requests

When requesting features:
- Explain the use case and benefit
- Consider how it fits with the existing codebase
- Be open to discussion about implementation

### Code Contributions

Good first contributions:
- Fix typos or improve documentation
- Add support for additional currency formats
- Improve error messages
- Add new game support
- Enhance the investment scoring algorithm

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Update documentation if needed
4. Test your changes thoroughly
5. Submit a pull request with:
   - Clear description of changes
   - Reference to any related issues
   - Screenshots if applicable

## API Rate Limiting Guidelines

All game APIs must be treated respectfully:

- **OSRS**: 1 request per second maximum
- **EVE Online**: 150 requests per second (but we use conservative 1/second)
- **Future games**: Research and implement appropriate limits

## Investment Algorithm Guidelines

When modifying scoring algorithms:

- Focus on volatility and momentum indicators
- Consider market liquidity (volume requirements)
- Maintain risk awareness in scoring
- Document scoring methodology
- Test with historical data when possible

## Questions?

If you have questions about contributing:
- Open a GitHub issue with the "question" label
- Email laserwolve@gmail.com
- Review existing issues and pull requests

We appreciate all contributions, from bug reports to new features!