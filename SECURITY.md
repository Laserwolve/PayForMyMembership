# Security Policy

## Supported Versions

Only the latest version of Mythic Market Mogul is currently supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an email to laserwolve@gmail.com. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

When reporting a vulnerability, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes or mitigations

## Security Considerations

This application:

- Makes HTTP requests to public game APIs (OSRS and EVE Online)
- Does not store any sensitive user data
- Does not require authentication or personal information
- Operates entirely with publicly available market data

## API Usage

The application uses the following external APIs:

- **OSRS**: `chisel.weirdgloop.org` and `secure.runescape.com` - Public market data
- **EVE Online**: `esi.evetech.net` - Public market data via ESI API

All API calls are made over HTTPS and follow the respective rate limiting guidelines.

## User Agent Policy

This application identifies itself with a proper User-Agent header as required by the EVE Online ESI API terms of service.