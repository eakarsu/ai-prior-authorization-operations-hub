'use strict';
const crypto = require('node:crypto');
const REQUIRED = Object.freeze(['Patient', 'Coverage', 'Claim']);
function canonical(value) { if (Array.isArray(value)) return value.map(canonical); if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])); return value; }
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex'); }
function buildPasSubmissionManifest(input = {}) {
  const bundle = input.bundle;
  if (!bundle || bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) throw new Error('FHIR Bundle with entries is required');
  if (!/^https:\/\//.test(String(input.payerEndpoint || ''))) throw new Error('payerEndpoint must use HTTPS');
  if (!String(input.policyVersion || '').trim()) throw new Error('policyVersion is required');
  const resources = bundle.entry.map(entry => entry && entry.resource).filter(Boolean);
  const resourceTypes = [...new Set(resources.map(resource => String(resource.resourceType || '')))].sort();
  const missingResourceTypes = REQUIRED.filter(type => !resourceTypes.includes(type));
  return { schemaVersion:1, profile:'DaVinci-PAS-submission-manifest', payerEndpoint:input.payerEndpoint, policyVersion:String(input.policyVersion), bundleDigest:digest(bundle), resourceCount:resources.length, resourceTypes, resourceIdentifiers:resources.map(resource => ({resourceType:resource.resourceType,id:String(resource.id||'')})).filter(item => item.id), missingResourceTypes, readyForHumanApproval:missingResourceTypes.length===0, automaticSubmission:false };
}
module.exports = { buildPasSubmissionManifest, digest };
