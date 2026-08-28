// Backend-controlled pricing configuration.
// The frontend must NEVER be trusted to supply the payment amount.
// These values are the single source of truth for calculating Stripe charges.
// Packages are now stored in the database and managed via the admin panel.

const db = require("../config/database");

// In-memory cache of packages, refreshed every 60 seconds
let cachedPackages = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

async function loadPackages() {
  const now = Date.now();
  if (cachedPackages && now - cacheTime < CACHE_TTL) {
    return cachedPackages;
  }

  try {
    const result = await db.query(
      `SELECT key, label, fee, processing_fee, processing_time, badge, sort_order
       FROM packages
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, id ASC`
    );

    const packages = {};
    for (const row of result.rows) {
      packages[row.key] = {
        fee: parseFloat(row.fee),
        processing: parseFloat(row.processing_fee),
        label: row.label,
        processingTime: row.processing_time,
        badge: row.badge,
      };
    }

    cachedPackages = packages;
    cacheTime = now;
    return packages;
  } catch (err) {
    console.error("Failed to load packages from DB:", err.message);
    if (cachedPackages) return cachedPackages;
    throw { status: 500, message: "Failed to load pricing packages" };
  }
}

// Invalidate cache (called when admin updates packages)
function invalidateCache() {
  cachedPackages = null;
  cacheTime = 0;
}

async function getPackage(processingType) {
  const packages = await loadPackages();
  const pkg = packages[processingType];
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
async function calculateAmount(processingType, applicantCount) {
  const count = parseInt(applicantCount, 10);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw { status: 400, message: "Invalid applicant count" };
  }

  const pkg = await getPackage(processingType);
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

module.exports = { getPackage, calculateAmount, loadPackages, invalidateCache };
