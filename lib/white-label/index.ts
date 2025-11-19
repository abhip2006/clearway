// White-Label Agent - Main exports
// Centralized exports for all white-label functionality

// Tenant Context & Isolation
export {
  getTenantContext,
  getTenantContextOptional,
  validateTenant,
  type TenantContext,
} from './tenant-context';

export {
  withTenantIsolation,
  requireTenant,
  verifyTenantOwnership,
  verifyTenantRole,
  hasScope,
  getTenantDb,
} from './isolation';

// Domain Routing
export {
  resolveTenantFromHost,
  validateCustomDomain,
  generateSubdomain,
  isSubdomainAvailable,
  isCustomDomainAvailable,
  validateSubdomainFormat,
  getTenantUrl,
  normalizeDomain,
} from './domain-routing';

// Branding
export {
  BrandingService,
  brandingService,
  type BrandingConfigInput,
} from './branding';

// Email Templates
export {
  EmailTemplateService,
  emailTemplateService,
  DEFAULT_EMAIL_TEMPLATES,
  type EmailTemplateType,
  type EmailTemplateData,
  type SendEmailParams,
} from './email-templates';

// Authentication
export {
  WhiteLabelAuthService,
  whiteLabelAuthService,
  type SSOProvider,
  type SSOConfigParams,
  type UserProfile,
} from './auth';

// API Keys
export {
  APIKeyService,
  apiKeyService,
  validateAPIKeyMiddleware,
  hasRequiredScope,
  type GenerateAPIKeyParams,
  type APIKeyValidation,
} from './api-keys';
