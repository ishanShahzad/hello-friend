/**
 * PhoneField — friendly country-flag phone input.
 *
 * Single source of truth for every phone input across Rozare (checkout,
 * profile, seller sign-up, store settings, admin WhatsApp link, etc.)
 * so we always end up with a valid E.164 number ("+923028588506") that
 * the backend can pass straight to Evolution without guessing a country
 * code.
 *
 * Auto-detection strategy (best → worst):
 *   1. Explicit `defaultCountry` prop  (caller-forced)
 *   2. The current `value` already contains a country code
 *   3. Saved profile country (via `profileCountry` prop)
 *   4. `navigator.language` locale   (e.g. "en-PK" → "PK", instant, zero-network)
 *   5. Free IP geolocation           (ipapi.co, cached in localStorage for 24h)
 *   6. Final fallback: 'PK'          (Rozare's home market)
 *
 * Works with:
 *   - Plain controlled inputs:   <PhoneField value={v} onChange={setV} />
 *   - react-hook-form:           <Controller name="phone" control={control}
 *                                  render={({ field }) => <PhoneField {...field} />} />
 */

import { useEffect, useRef, useState, forwardRef } from 'react';
import PhoneInput, {
    isValidPhoneNumber,
    getCountries,
} from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// ─── Country detection ────────────────────────────────────────────────────────

const GEO_CACHE_KEY = 'rozare:geo-country';
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const validCountries = new Set(getCountries());

/** Return the 2-letter ISO country or null if unrecognised. */
const normaliseCountryCode = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const cc = raw.trim().toUpperCase();
    if (cc.length !== 2) return null;
    return validCountries.has(cc) ? cc : null;
};

/** Map a country NAME (e.g. "Pakistan") to ISO-2 for profileCountry support. */
const countryNameToIso = (name) => {
    if (!name) return null;
    const n = name.trim().toLowerCase();
    // Small curated map — keep it tiny; DisplayNames handles the rest below.
    const manual = {
        pakistan: 'PK', usa: 'US', 'united states': 'US', 'u.s.': 'US',
        uk: 'GB', 'united kingdom': 'GB', uae: 'AE',
        india: 'IN', bangladesh: 'BD', canada: 'CA', australia: 'AU',
        'saudi arabia': 'SA', germany: 'DE', france: 'FR',
    };
    if (manual[n]) return manual[n];

    // Best-effort: use Intl.DisplayNames reverse lookup
    try {
        const dn = new Intl.DisplayNames(['en'], { type: 'region' });
        for (const code of validCountries) {
            if ((dn.of(code) || '').toLowerCase() === n) return code;
        }
    } catch { /* old browsers */ }
    return null;
};

const readCachedGeo = () => {
    try {
        const raw = localStorage.getItem(GEO_CACHE_KEY);
        if (!raw) return null;
        const { cc, at } = JSON.parse(raw);
        if (!cc || !at) return null;
        if (Date.now() - at > GEO_CACHE_TTL_MS) return null;
        return normaliseCountryCode(cc);
    } catch { return null; }
};

const writeCachedGeo = (cc) => {
    try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ cc, at: Date.now() })); }
    catch { /* quota / private mode — ignore */ }
};

/** Fast, synchronous guess from browser locale (e.g. "en-PK" → "PK"). */
const countryFromLocale = () => {
    try {
        const langs = [...(navigator.languages || []), navigator.language].filter(Boolean);
        for (const l of langs) {
            const match = String(l).match(/[-_]([A-Za-z]{2})(?:$|[-_])/);
            const cc = normaliseCountryCode(match?.[1]);
            if (cc) return cc;
        }
    } catch { /* noop */ }
    return null;
};

/** Async IP-based lookup — only runs if locale failed. 2-second timeout. */
const countryFromIp = async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    try {
        // ipapi.co has a generous free tier, returns { country_code: "PK", ... }
        const r = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
        if (!r.ok) return null;
        const data = await r.json();
        return normaliseCountryCode(data?.country_code || data?.country);
    } catch { return null; }
    finally { clearTimeout(t); }
};

// ─── Component ────────────────────────────────────────────────────────────────

const PhoneField = forwardRef(function PhoneField(
    {
        value,
        onChange,
        onBlur,
        error,          // { message } | string — optional, for RHF
        name,
        placeholder = 'Phone number',
        disabled = false,
        required = false,
        defaultCountry,  // override auto-detect
        profileCountry,  // user's saved shipping country (free-form name)
        className = '',
        id,
    },
    ref
) {
    // Stable initial country — set exactly once from the first successful source.
    const [country, setCountry] = useState(() => {
        if (normaliseCountryCode(defaultCountry)) return normaliseCountryCode(defaultCountry);
        const fromProfile = countryNameToIso(profileCountry);
        if (fromProfile) return fromProfile;
        return readCachedGeo() || countryFromLocale() || 'PK';
    });

    // If profileCountry becomes available later (e.g. on profile load), update once.
    const seededFromProfile = useRef(false);
    useEffect(() => {
        if (seededFromProfile.current) return;
        const cc = countryNameToIso(profileCountry);
        if (cc) {
            setCountry(cc);
            seededFromProfile.current = true;
        }
    }, [profileCountry]);

    // Kick off IP geolocation in the background if we don't already have a cached hit.
    useEffect(() => {
        let cancelled = false;
        // Don't overwrite an explicit/profile/value-driven choice.
        if (defaultCountry || countryNameToIso(profileCountry) || readCachedGeo()) return;
        (async () => {
            const cc = await countryFromIp();
            if (cancelled || !cc) return;
            writeCachedGeo(cc);
            // Only update if the user hasn't interacted yet (still empty).
            if (!value) setCountry(cc);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasError = Boolean(error?.message || (typeof error === 'string' && error));
    const errorMsg = error?.message || (typeof error === 'string' ? error : '');

    return (
        <div className={`rozare-phone-field ${hasError ? 'has-error' : ''} ${className}`}>
            <PhoneInput
                ref={ref}
                id={id}
                name={name}
                international
                countryCallingCodeEditable={false}
                defaultCountry={country}
                value={value || ''}
                onChange={(v) => onChange?.(v || '')}
                onBlur={onBlur}
                disabled={disabled}
                placeholder={placeholder}
                aria-required={required || undefined}
                aria-invalid={hasError || undefined}
                numberInputProps={{
                    className: 'glass-input w-full',
                    autoComplete: 'tel',
                }}
            />
            {hasError && (
                <p className="text-xs mt-1" style={{ color: 'hsl(0, 72%, 55%)' }}>
                    {String(errorMsg)}
                </p>
            )}
        </div>
    );
});

/** Returns `true` if the number is a valid E.164 phone. Re-exported for form validators. */
export const isValidPhone = (value) => {
    if (!value) return false;
    try { return isValidPhoneNumber(value); } catch { return false; }
};

export default PhoneField;
