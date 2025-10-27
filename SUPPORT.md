# Support

## Getting Help

If you need help with PayForMyMembership, here are your options:

### Documentation

- Read the [README.md](README.md) for basic usage instructions
- Check the code comments for technical details

### Issues

For bug reports, feature requests, or general questions:

1. Check existing [GitHub Issues](https://github.com/Laserwolve/PayForMyMembership/issues) first
2. If your issue isn't already reported, [create a new issue](https://github.com/Laserwolve/PayForMyMembership/issues/new)

When reporting issues, please include:

- Operating system and Node.js version
- Exact error messages
- Steps to reproduce the problem
- Expected vs actual behavior

### Contact

For direct support or questions:
- **Email**: laserwolve@gmail.com
- **EVE Online**: Foggle Lopperbottom

## Common Issues

### API Rate Limiting

If you encounter rate limiting errors:
- The application already includes built-in delays (1 second between requests)
- Try reducing the number of items to analyze
- Wait a few minutes before retrying

### Network Errors

If you get connection errors:
- Check your internet connection
- Verify the game servers are online
- Some corporate networks may block game-related domains

### Invalid Budget Format

Budget input supports these formats:
- `1000000` (raw number)
- `1m` (1 million)
- `500k` (500 thousand)
- `2.5b` (2.5 billion)

## Technical Requirements

- Node.js 18.0 or higher
- Internet connection for API access
- No additional dependencies required (uses built-in modules)

## Supported Games

- **OSRS**: Fully functional
- **EVE Online**: Fully functional

Both analyzers respect the respective API rate limits and terms of service.