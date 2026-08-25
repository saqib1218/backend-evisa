// Backend-controlled pricing configuration.
// The frontend must NEVER be trusted to supply the payment amount.
// These values are the single source of truth for calculating Stripe charges.

const PROCESSING_PACKAGES = {
  standard: { fee: 89.0, processing: 30.9, label: "3-5 days processing" },
  express: { fee: 89.0, processing: 30.9, label: "6-24h processing" },
  fastest: { fee: 109.0, processing: 30.9, label: "1h processing" },
  testing: { fee: 2.0, processing: 0.0, label: "Testing - $2 only" },
};

function getPackage(processingType) {
  const pkg = PROCESSING_PACKAGES[processingType];
  if (!pkg) {
    throw { status: 400, message: `Invalid processing type: ${processingType}` };
  }
  return pkg;
}

/**
 * Calculates the authoritative payment total for a given processing type and
 * applicant count. Returns amounts in normal currency units (e.g. pounds),
 * as well as the exact figure to charge via Stripe in the smallest currency
 * unit (e.g. pence).
 */
function calculateAmount(processingType, applicantCount) {
  const count = parseInt(applicantCount, 10);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw { status: 400, message: "Invalid applicant count" };
  }

  const pkg = getPackage(processingType);
  const feeTotal = Math.round(pkg.fee * count * 100) / 100;
  const processingTotal = Math.round(pkg.processing * count * 100) / 100;
  const grandTotal = Math.round((feeTotal + processingTotal) * 100) / 100;

  // Smallest currency unit (e.g. pence for GBP) — required by Stripe
  const amountInSmallestUnit = Math.round(grandTotal * 100);

  return {
    feePerApplicant: pkg.fee,
    processingFeePerApplicant: pkg.processing,
    feeTotal,
    processingTotal,
    grandTotal,
    amountInSmallestUnit,
    label: pkg.label,
  };
}

module.exports = { PROCESSING_PACKAGES, getPackage, calculateAmount };
