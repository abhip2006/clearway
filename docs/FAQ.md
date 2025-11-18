# Frequently Asked Questions (FAQ)

Common questions about Clearway's features, pricing, integrations, and more.

## Table of Contents

- [General Questions](#general-questions)
- [AI Accuracy](#ai-accuracy)
- [Data Security](#data-security)
- [Integrations](#integrations)
- [Pricing](#pricing)
- [Team Management](#team-management)
- [Troubleshooting](#troubleshooting)

---

## General Questions

### What is Clearway?

Clearway is the data infrastructure for alternative investments. We automate capital call processing using AI, eliminating manual data entry for RIAs, family offices, and investors.

### Who is Clearway for?

- **RIAs**: Manage capital calls for multiple clients
- **Family Offices**: Track investments across multiple funds
- **Fund Administrators**: Deliver digital capital calls to investors
- **Investors**: Track capital call commitments and payments

### How does Clearway work?

1. Upload capital call PDF
2. AI extracts key data (fund name, amount, due date, wire instructions)
3. Review and approve extracted data
4. Sync to accounting systems (QuickBooks, etc.)
5. Track payments and reconcile automatically

### What file formats are supported?

Currently, we support **PDF files only**. Support for Excel, Word, and scanned images is on our roadmap.

---

## AI Accuracy

### How accurate is the AI extraction?

Our AI achieves **95%+ accuracy** on standard capital call documents. Accuracy varies based on:
- Document quality (300+ DPI recommended)
- Format consistency
- Handwritten vs. typed content

### What if the AI makes a mistake?

You always review and approve extractions before they're finalized. You can correct any errors during the review process.

### How does Clearway handle low-confidence extractions?

Fields with low confidence (<85%) are flagged for your attention. We show confidence scores so you know which fields to review carefully.

### Can Clearway learn from corrections?

Yes! Every correction you make helps improve our AI models. We continuously retrain models based on user feedback.

### What happens if the AI can't extract certain fields?

- **Low confidence**: Field is flagged for manual review
- **Missing data**: You can manually enter the information
- **Complex formats**: Contact support for assistance

---

## Data Security

### Is my data secure?

Yes. We take security seriously:
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Compliance**: GDPR compliant, SOC 2 Type II controls
- **Access Control**: Role-based permissions, MFA
- **Audit Logs**: Complete audit trail of all actions

See [Security Documentation](security/SECURITY.md) for details.

### Where is my data stored?

- **Documents**: Cloudflare R2 (encrypted)
- **Database**: Neon PostgreSQL (encrypted)
- **Hosting**: Vercel (multi-region)

All data is stored in secure, SOC 2 certified facilities.

### Is Clearway GDPR compliant?

Yes. We support all GDPR data subject rights:
- Right to access (export your data)
- Right to rectification (correct errors)
- Right to erasure (delete your data)
- Right to data portability (export in JSON)

### Can I delete my data?

Yes. You can request data deletion at any time. We retain data for 30 days for legal holds, then permanently delete.

### Who has access to my documents?

Only users in your organization. We enforce strict data isolation:
- Multi-tenant architecture
- Organization-based filtering
- No cross-organization access

Clearway employees cannot access your data without explicit permission.

---

## Integrations

### What integrations does Clearway support?

**Fund Administrators**:
- SS&C Geneva
- Carta
- Juniper Square
- Altvia

**Accounting**:
- QuickBooks Online
- Xero (roadmap)
- NetSuite (enterprise)

**E-Signature**:
- DocuSign
- HelloSign
- Adobe Sign

**Payment**:
- Plaid (bank connections)
- Stripe (ACH payments)

### How do I set up an integration?

See our integration guides:
- [Fund Admin Setup](integrations/FUND_ADMIN_SETUP.md)
- [QuickBooks Setup](integrations/QUICKBOOKS_SETUP.md)
- [DocuSign Setup](integrations/DOCUSIGN_SETUP.md)

### Can I request a new integration?

Yes! Email integrations@clearway.com with:
- Integration name
- Use case
- Documentation links

Enterprise customers get priority for custom integrations.

### Do integrations cost extra?

- **Starter**: No integrations included
- **Professional**: Unlimited integrations
- **Enterprise**: Unlimited + custom integrations

---

## Pricing

### How much does Clearway cost?

See our pricing page: https://clearway.com/pricing

**Starter**: $49/month
- 5 users
- 100 documents/month
- Basic support

**Professional**: $299/month
- 25 users
- 1,000 documents/month
- Integrations
- Priority support

**Enterprise**: Custom pricing
- Unlimited users
- Unlimited documents
- Custom integrations
- Dedicated support

### Is there a free trial?

Yes! 14-day free trial, no credit card required. Try all features.

### Can I upgrade/downgrade anytime?

Yes. Upgrades take effect immediately. Downgrades take effect at the end of your billing period.

### What payment methods do you accept?

- Credit card (Visa, Mastercard, Amex)
- ACH bank transfer (Enterprise)
- Invoice (Enterprise, annual plans)

### Are there any hidden fees?

No hidden fees. However, overages apply:
- Additional users: $15/user/month
- Additional documents: $0.10/document
- Additional storage: $0.10/GB/month

---

## Team Management

### How do I invite team members?

Navigate to **Settings** > **Team** > **Invite Member**. Enter their email and select their role (Admin, Editor, or Viewer).

### What roles are available?

- **Admin**: Full access, can manage users and billing
- **Editor**: Can upload, review, and approve capital calls
- **Viewer**: Read-only access

Enterprise customers can create custom roles.

### Can I limit permissions for specific users?

Yes (Enterprise only). Create custom roles with granular permissions like:
- `capital_calls:read`
- `capital_calls:approve`
- `documents:upload`

### How do I remove a team member?

Navigate to **Settings** > **Team**, find the user, and click **Remove**. Their access is revoked immediately.

---

## Troubleshooting

### Upload is failing

**Possible causes**:
- File too large (max 50MB)
- Invalid file format (PDF only)
- Network connection issue

**Solutions**:
- Compress PDF if >50MB
- Verify file is PDF
- Try different browser
- Contact support if issue persists

### Low confidence scores

**Possible causes**:
- Poor scan quality (<300 DPI)
- Unusual formatting
- Handwritten notes
- Complex tables

**Solutions**:
- Re-scan at higher resolution
- Use original PDF if available
- Manually enter data for low-confidence fields

### Integration sync failing

**Possible causes**:
- OAuth token expired
- API credentials incorrect
- Rate limit exceeded

**Solutions**:
- Reconnect integration
- Verify credentials
- Check integration logs
- Contact integration partner

### Payments not matching

**Possible causes**:
- Missing wire reference
- Amount mismatch
- Investor not mapped

**Solutions**:
- Verify wire reference in payment
- Check amounts match exactly
- Map investor in integration settings
- Manually match if needed

### Can't log in

**Possible causes**:
- Incorrect password
- Account locked (too many failed attempts)
- MFA issue

**Solutions**:
- Reset password
- Wait 15 minutes if locked
- Contact support to disable MFA

---

## Getting Help

### How do I contact support?

- **Email**: support@clearway.com
- **In-app chat**: Click chat icon in bottom right
- **Phone**: 1-800-CLEARWAY (Enterprise only)

### Response times

- **Starter**: 48 hours
- **Professional**: 24 hours
- **Enterprise**: 4 hours (24/7 for critical issues)

### Where can I find documentation?

- **User guides**: https://docs.clearway.com/user-guide
- **API docs**: https://docs.clearway.com/api
- **Integrations**: https://docs.clearway.com/integrations
- **Developer docs**: https://docs.clearway.com/development

### Is there a community?

Join our community:
- **Slack**: https://clearway-community.slack.com
- **Office Hours**: Fridays 2-3pm EST
- **Webinars**: Monthly best practices sessions

---

## Still have questions?

**Contact us**: support@clearway.com
**Schedule a demo**: https://clearway.com/demo
**Status page**: https://status.clearway.com
