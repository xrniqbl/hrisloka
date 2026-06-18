/**
 * Bank List Service
 * Uses /api/banks Vercel serverless function (API key stays server-side)
 * In dev mode, also routes through /api/banks via Vite proxy (no key exposed to client)
 * Docs: https://docs.api.co.id/products/bank-validation
 */

/**
 * Get list of all available Indonesian banks
 * - Both dev and production: uses /api/banks serverless function
 * Results are cached in memory after first call
 */
let cachedBanks = null;

export async function getAvailableBanks() {
  if (cachedBanks) return { data: cachedBanks, error: null };

  try {
    // Always use the serverless function — API key stays server-side
    const res = await fetch('/api/banks');

    const json = await res.json();

    if (!res.ok || !json.is_success) {
      console.warn('[BankService] API failed, using fallback:', json.message);
      return { data: COMMON_BANKS, error: json.message || `HTTP ${res.status}` };
    }

    cachedBanks = json.data?.banks || json.data || [];
    return { data: cachedBanks, error: null };
  } catch (err) {
    console.warn('[BankService] Network error, using fallback');
    return { data: COMMON_BANKS, error: err.message };
  }
}

/**
 * Fallback bank list (used when API is unavailable)
 */
export const COMMON_BANKS = [
 { bank_code: 'bank_bca', bank_name: 'BCA' },
 { bank_code: 'bank_bri', bank_name: 'BRI' },
 { bank_code: 'bank_bni', bank_name: 'BNI' },
 { bank_code: 'bank_mandiri', bank_name: 'MANDIRI' },
 { bank_code: 'bank_bsm', bank_name: 'BSI (BANK SYARIAH INDONESIA)' },
 { bank_code: 'bank_cimb', bank_name: 'CIMB NIAGA' },
 { bank_code: 'bank_danamon', bank_name: 'DANAMON' },
 { bank_code: 'bank_permata', bank_name: 'PERMATA' },
 { bank_code: 'bank_mega', bank_name: 'MEGA' },
 { bank_code: 'bank_btn', bank_name: 'BTN' },
 { bank_code: 'bank_ocbc', bank_name: 'OCBC NISP' },
 { bank_code: 'bank_panin', bank_name: 'PANIN' },
 { bank_code: 'bank_kesejahteraan_ekonomi', bank_name: 'SEABANK / BANK BKE' },
 { bank_code: 'bank_jago', bank_name: 'BANK JAGO' },
 { bank_code: 'bank_jenius', bank_name: 'JENIUS / BTPN' },
 { bank_code: 'bank_dbs', bank_name: 'DBS INDONESIA' },
 { bank_code: 'bank_muamalat', bank_name: 'MUAMALAT' },
 { bank_code: 'bank_bukopin', bank_name: 'KB BUKOPIN' },
];
