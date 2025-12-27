# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of PolyVOX seriously. If you have discovered a security vulnerability, please report it to us responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security issues via one of the following methods:

1. **Email**: Send details to the project maintainers via GitHub
2. **GitHub Security Advisory**: Use the "Report a vulnerability" feature on our GitHub repository

### What to Include

When reporting a vulnerability, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: What an attacker could achieve by exploiting this vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Proof of Concept**: If possible, provide a PoC or example exploit
- **Affected Versions**: Which versions are impacted
- **Suggested Fix**: If you have ideas on how to address the issue

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: Within 7 days with our assessment and planned action
- **Fix Timeline**: We aim to release security patches within 30 days for critical issues
- **Public Disclosure**: We will coordinate with you on public disclosure timing

### What to Expect

1. We will acknowledge receipt of your vulnerability report
2. We will investigate and validate the issue
3. We will develop and test a fix
4. We will release a security patch
5. We will publicly disclose the vulnerability (with credit to you if desired)

## Security Best Practices

### For Users

#### Private Key Management

**CRITICAL**: Your private key is the most sensitive piece of information in the application.

- **Never share your private key** with anyone
- **Never commit private keys** to version control
- **Store private keys securely** using a password manager or hardware wallet
- **Use demo mode** for testing before risking real funds
- **Create a separate wallet** specifically for trading with limited funds

#### Browser Security

- **Keep your browser updated** with the latest security patches
- **Use HTTPS only** - never enter sensitive data over HTTP
- **Clear browser data** regularly, especially on shared computers
- **Use incognito/private mode** when on public computers
- **Disable browser extensions** that might intercept or log data
- **Lock your computer** when stepping away

#### Application Security

- **Start with demo mode** to familiarize yourself with the platform
- **Test strategies** with small amounts before scaling up
- **Monitor positions regularly** - never leave them unattended for long periods
- **Set stop losses** on all positions to limit downside risk
- **Review settings carefully** before enabling auto-trading
- **Keep software updated** by pulling the latest changes from GitHub
- **Use strong passwords** for your Supabase account

#### Network Security

- **Avoid public WiFi** when trading or entering sensitive information
- **Use a VPN** for additional privacy protection
- **Enable CORS proxy** only if necessary and understand the implications
- **Verify SSL certificates** when connecting to APIs

### For Developers

#### Code Security

- **Input Validation**: Always validate and sanitize user inputs
- **SQL Injection**: Use parameterized queries (Supabase client handles this)
- **XSS Prevention**: Sanitize any user-generated content before rendering
- **CSRF Protection**: Implement proper CSRF tokens for state-changing operations
- **Secrets Management**: Never hardcode API keys or secrets in code
- **Environment Variables**: Use `.env` files (not committed) for sensitive config
- **Dependencies**: Regularly update dependencies to patch vulnerabilities
- **Code Review**: All PRs should be reviewed for security implications

#### Database Security

- **Row Level Security**: Always enable RLS on all tables
- **Principle of Least Privilege**: Grant minimum necessary permissions
- **Audit Logs**: Log security-relevant actions
- **Backup Data**: Regular backups of critical data
- **Secure Connections**: Use SSL/TLS for all database connections
- **API Keys**: Rotate Supabase keys periodically

#### API Security

- **Rate Limiting**: Implement rate limits to prevent abuse
- **Authentication**: Require authentication for sensitive operations
- **Authorization**: Verify user permissions before data access
- **HTTPS Only**: Never transmit sensitive data over HTTP
- **API Key Protection**: Never expose API keys in client-side code
- **Request Validation**: Validate all incoming API requests

#### Smart Contract Interactions

- **Gas Limits**: Set appropriate gas limits to prevent runaway transactions
- **Nonce Management**: Handle transaction nonces properly
- **Signature Verification**: Verify all transaction signatures
- **Replay Protection**: Prevent transaction replay attacks
- **Amount Verification**: Double-check transaction amounts before signing
- **Test Networks**: Test on testnets before mainnet deployment

## Known Security Considerations

### Client-Side Key Storage

Private keys are currently stored in browser local storage for convenience. This is **NOT** the most secure approach.

**Risks**:
- Keys accessible via JavaScript running in the browser
- Vulnerable to XSS attacks
- Not encrypted at rest
- Lost if browser data is cleared

**Mitigations**:
- Use demo mode whenever possible
- Only store keys for wallets with limited funds
- Clear browser data after each session
- Consider using hardware wallets (roadmap feature)

### CORS Proxy

Enabling CORS proxy routes requests through a third-party service.

**Risks**:
- Man-in-the-middle attack potential
- Data exposure to proxy service
- Service availability dependency

**Mitigations**:
- Only enable if necessary
- Understand the proxy service you're using
- Avoid sending sensitive data through proxy
- Consider running your own proxy server

### Demo Mode

Demo mode uses simulated data and doesn't execute real trades.

**Note**: Demo mode does not fully replicate live trading conditions:
- No slippage simulation
- Instant fills (unrealistic)
- No market impact
- Historical data only

## Vulnerability Disclosure Policy

### Our Commitment

- We will respond to security reports within 48 hours
- We will keep you informed throughout the investigation
- We will credit researchers who report valid vulnerabilities (if desired)
- We will not pursue legal action against researchers who follow this policy

### Responsible Disclosure

We kindly request that security researchers:

- Give us reasonable time to fix vulnerabilities before public disclosure
- Make a good faith effort to avoid privacy violations and data destruction
- Do not exploit vulnerabilities beyond proof of concept
- Do not perform attacks that could harm users or degrade service

## Security Updates

Security updates will be announced via:

- GitHub Security Advisories
- Release notes with `[SECURITY]` tag
- README updates with security notices

Subscribe to GitHub notifications to stay informed about security updates.

## Third-Party Security

### Supabase

We rely on Supabase for database and authentication services. Review their security policies:
- [Supabase Security](https://supabase.com/security)

### Polymarket

Trading is executed on Polymarket's infrastructure. Review their policies:
- [Polymarket Terms of Service](https://polymarket.com/terms)

### Dependencies

We regularly audit our npm dependencies using:
- `npm audit` for vulnerability scanning
- Dependabot for automated security updates
- Manual review of critical dependencies

## Compliance

### Data Privacy

- We do not collect or store personal information on external servers
- Private keys remain in your browser only
- No analytics or tracking by default
- Supabase data is governed by their privacy policy

### Legal

- This is open-source software provided "as is"
- No warranty or guarantee of security
- Users are responsible for their own security practices
- Not financial advice - trade at your own risk

## Contact

For security concerns, please contact the maintainers through:
- GitHub Security Advisories (preferred)
- GitHub Issues (for non-sensitive security questions)

## Acknowledgments

We would like to thank security researchers who have responsibly disclosed vulnerabilities:

- *No vulnerabilities reported yet*

---

**Last Updated**: December 2024

Thank you for helping keep PolyVOX and its users safe!
