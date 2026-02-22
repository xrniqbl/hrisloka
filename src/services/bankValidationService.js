/**
 * Bank List Service
 * Uses API.co.id Free Bank List API (via Vite proxy to avoid CORS)
 * Docs: https://docs.api.co.id/products/bank-validation
 *
 * Free endpoint: GET /validation/bank/available — returns 130+ Indonesian banks
 * In dev: proxied through /api-bank/* → https://use.api.co.id/validation/*
 */

function getApiKey() {
    return import.meta.env.VITE_BANK_VALIDATION_API_KEY || '';
}

function getBaseUrl() {
    // In development, use Vite proxy to avoid CORS
    if (import.meta.env.DEV) return '/api-bank';
    // In production, call API directly (or use edge function)
    return 'https://use.api.co.id/validation';
}

/**
 * Get list of all available Indonesian banks (FREE endpoint)
 * Returns array of { bank_name, bank_code }
 * Results are cached in memory after first call
 */
let cachedBanks = null;

export async function getAvailableBanks() {
    if (cachedBanks) return { data: cachedBanks, error: null };

    try {
        const res = await fetch(`${getBaseUrl()}/bank/available`, {
            method: 'GET',
            headers: { 'x-api-co-id': getApiKey() },
        });

        const json = await res.json();

        if (!res.ok || !json.is_success) {
            console.warn('[BankService] API failed, using fallback:', json.message);
            return { data: COMMON_BANKS, error: json.message || `HTTP ${res.status}` };
        }

        cachedBanks = json.data.banks || [];
        console.log(`[BankService] Loaded ${cachedBanks.length} banks from API.co.id`);
        return { data: cachedBanks, error: null };
    } catch (err) {
        console.warn('[BankService] Network error, using fallback:', err.message);
        // Fallback to local list on network error
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
