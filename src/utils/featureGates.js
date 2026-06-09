// Feature gating helpers based on subscription plans (starter, business, enterprise)

export const PLANS = {
  STARTER: 'starter',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
};

// Check if tenant has upload SOP video capability
export const canUploadSOP = (plan) => {
  return plan === PLANS.BUSINESS || plan === PLANS.ENTERPRISE;
};

// Check employee count limit
export const getEmployeeLimit = (plan) => {
  if (plan === PLANS.STARTER) return 200;
  if (plan === PLANS.BUSINESS) return 500;
  return Infinity; // Enterprise has unlimited
};

// Check if tenant has full compliance reports
export const hasFullComplianceReports = (plan) => {
  return plan === PLANS.BUSINESS || plan === PLANS.ENTERPRISE;
};

// Check if HeyGen AI Integration is enabled
export const hasHeyGenIntegration = (plan) => {
  return plan === PLANS.ENTERPRISE;
};

// Check if Custom Branding / Avatar is enabled
export const hasCustomBranding = (plan) => {
  return plan === PLANS.ENTERPRISE;
};

// Check if Multi-Branch (Multi-Cabang) is enabled
export const hasMultiBranch = (plan) => {
  return plan === PLANS.ENTERPRISE;
};
