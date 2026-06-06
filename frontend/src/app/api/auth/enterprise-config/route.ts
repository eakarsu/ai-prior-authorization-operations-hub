import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, getProductionReadiness } from '@/lib/productionReadiness';
import { requireSession } from '@/lib/requestAuth';

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  await appendAccessLog(session, 'enterprise-auth-config', 'view_enterprise_auth_config', requestMeta(request));
  const readiness = await getProductionReadiness();
  return NextResponse.json({
    mfaRequired: process.env.REQUIRE_MFA === 'true',
    ssoConfigured: Boolean(process.env.OIDC_ISSUER || process.env.SSO_SSO_URL),
    supportedProviders: ['OIDC', 'SAML 2.0', 'SCIM/manual JSON bridge'],
    authControls: readiness.authControls,
  });
}
