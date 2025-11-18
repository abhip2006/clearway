# Release Notes

## Version 2.0.0 - Phase 2 Complete (January 2025)

### 🎉 Major Features

**Fund Administrator Integrations**
- ✅ SS&C Geneva integration with real-time sync
- ✅ Carta webhook integration for automatic capital call delivery
- ✅ Investor mapping and automated data sync
- ✅ Support for multiple fund administrators per organization

**Payment Reconciliation**
- ✅ Automatic payment matching (90%+ accuracy)
- ✅ SWIFT message parsing (MT103 format)
- ✅ ACH transaction processing via Plaid
- ✅ Bank statement upload (PDF, CSV, OFX)
- ✅ Manual matching interface for unmatched payments

**Accounting Integrations**
- ✅ QuickBooks Online integration
- ✅ Automatic journal entry creation
- ✅ Deposit sync for payments
- ✅ Two-way sync between systems

**E-Signature Integration**
- ✅ DocuSign integration with JWT authentication
- ✅ Template management
- ✅ Envelope tracking
- ✅ Webhook events for signing status

**Enterprise Features**
- ✅ Multi-tenant organization support
- ✅ Custom roles and permissions (RBAC)
- ✅ SSO via SAML/OIDC
- ✅ Advanced audit logging
- ✅ GDPR compliance tools (DSAR, data export, deletion)

**Analytics & Reporting**
- ✅ Dashboard with key metrics
- ✅ AI-powered forecasting
- ✅ Pattern detection
- ✅ Scheduled reports
- ✅ Custom export formats (CSV, Excel, JSON)

**Performance & Scaling**
- ✅ Database query optimization
- ✅ Materialized views for analytics
- ✅ Caching layer implementation
- ✅ Load testing suite

**Advanced AI**
- ✅ Improved extraction accuracy (now 95%+)
- ✅ Email parsing for capital calls
- ✅ Anomaly detection
- ✅ Document classification and routing

**Security & Compliance**
- ✅ Enhanced audit logging
- ✅ Legal hold functionality
- ✅ Data processing agreements (DPA) management
- ✅ Advanced encryption (AWS KMS)

### 🚀 Improvements

- Faster document processing (50% reduction in processing time)
- Improved UI/UX with better loading states
- Enhanced error messages and troubleshooting
- Better mobile responsiveness
- Comprehensive API documentation
- Developer-friendly webhook marketplace

### 🐛 Bug Fixes

- Fixed issue with large PDF uploads (>25MB)
- Resolved timezone issues in calendar view
- Fixed SWIFT message parsing for non-standard formats
- Corrected QuickBooks sync for partial payments
- Fixed SSO redirect loop in certain configurations

### 📚 Documentation

- Complete user onboarding guide
- Admin guide for organization management
- Developer setup guide
- API reference with examples
- Webhook developer guide
- Integration guides (Fund Admin, QuickBooks, DocuSign)
- Architecture documentation
- Security documentation
- FAQ

### 🔧 Technical Changes

- Upgraded to Next.js 15
- Migrated to React 19
- Database schema updates (see `SCHEMA_MIGRATION.md`)
- New Prisma migrations
- Enhanced TypeScript types
- Improved test coverage (now 95%+)

---

## Version 1.0.0 - MVP Launch (September 2024)

### 🎉 Initial Release

**Core Features**
- ✅ User authentication via Clerk
- ✅ Document upload (PDF)
- ✅ AI extraction using Azure Document Intelligence + GPT-4
- ✅ Review interface with confidence scores
- ✅ Capital call management
- ✅ Calendar view
- ✅ Email notifications
- ✅ Export to CSV/Excel
- ✅ Basic API

**Infrastructure**
- ✅ Next.js 15 + React 19
- ✅ PostgreSQL database (Neon)
- ✅ Cloudflare R2 storage
- ✅ Vercel deployment
- ✅ Sentry error tracking

---

## Roadmap

### Version 2.1.0 (Q2 2025)

**Planned Features**
- 📋 Xero accounting integration
- 📋 Juniper Square fund admin integration
- 📋 Mobile app (iOS/Android)
- 📋 Advanced reporting dashboard
- 📋 Multi-currency support
- 📋 Document templates
- 📋 Bulk upload

### Version 3.0.0 (Q3 2025)

**Investor Portal**
- 📋 Investor-facing portal
- 📋 Self-service document access
- 📋 Payment initiation
- 📋 Portfolio tracking
- 📋 K-1 aggregation

**Advanced AI**
- 📋 Custom model training
- 📋 Multi-language support
- 📋 Handwriting recognition
- 📋 Predictive analytics

**Enterprise**
- 📋 White-label solution
- 📋 On-premise deployment
- 📋 Advanced SSO (Azure AD, Okta)
- 📋 Custom reporting

---

## Known Issues

### Current Known Issues

1. **PDF Processing**: Very large PDFs (>50MB) may timeout during processing
   - **Workaround**: Compress PDFs before upload
   - **Fix planned**: Q2 2025

2. **QuickBooks Sync**: Occasional sync delays during high traffic
   - **Workaround**: Manual sync option available
   - **Fix planned**: Q1 2025

3. **Mobile UI**: Some tables not fully responsive on mobile
   - **Workaround**: Use desktop for best experience
   - **Fix planned**: Q1 2025

### Resolved Issues

- ~~Document upload fails for certain PDF formats~~ (Fixed in v1.5.0)
- ~~Clerk authentication redirect loop~~ (Fixed in v1.3.0)
- ~~Calendar view showing incorrect timezones~~ (Fixed in v2.0.0)

---

## Upgrade Instructions

### Upgrading from v1.x to v2.0

**Prerequisites**
- Node.js 20.x or higher
- PostgreSQL 15.x or higher

**Steps**

1. **Backup Database**:
   ```bash
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Pull Latest Code**:
   ```bash
   git pull origin main
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Update Environment Variables**:
   - Add new variables from `.env.example`
   - Update existing variables if changed

6. **Test Locally**:
   ```bash
   npm run dev
   ```

7. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

**Breaking Changes**

- Database schema changes (migrations required)
- New environment variables required (see `.env.example`)
- API endpoint changes (see `API_REFERENCE.md`)
- tRPC router changes (regenerate types)

**Migration Guide**: See `docs/deployment/DEPLOYMENT.md` for detailed migration steps.

---

## Contributors

Special thanks to all contributors who made this release possible!

### Phase 2 Development Team

- **AI/ML**: Advanced extraction models, anomaly detection
- **Backend**: Payment reconciliation, integrations
- **Frontend**: New UI components, dashboard
- **DevOps**: Performance optimization, monitoring
- **QA**: Comprehensive testing, bug fixes
- **Documentation**: Complete docs overhaul

---

## Support

**Need help upgrading?**
- Email: support@clearway.com
- Documentation: https://docs.clearway.com
- Community Slack: https://clearway-community.slack.com

**Report Issues**:
- GitHub: https://github.com/clearway/clearway/issues
- Email: bugs@clearway.com

---

**Stay updated**: Subscribe to our changelog at https://clearway.com/changelog
