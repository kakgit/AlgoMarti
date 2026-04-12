const axios = require("axios");
const DeltaRestClient = require("delta-rest-client");

const BASE_URL = "https://api.india.delta.exchange";

function toNum(v, fallback = null) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function inferOptionType(row) {
    const vContractType = String(
        row?.contract_type ||
        row?.contractType ||
        row?.option_type ||
        row?.type ||
        ""
    ).toLowerCase();
    if (vContractType.includes("put")) {
        return "put";
    }
    if (vContractType.includes("call")) {
        return "call";
    }

    const vSymbol = String(row?.symbol || row?.product_symbol || "").toUpperCase();
    if (vSymbol.includes("PUT") || vSymbol.includes("-P-")) {
        return "put";
    }
    if (vSymbol.includes("CALL") || vSymbol.includes("-C-")) {
        return "call";
    }

    const vDelta = Number(row?.greeks?.delta ?? row?.delta);
    if (Number.isFinite(vDelta)) {
        return vDelta < 0 ? "put" : "call";
    }

    return "";
}

function parseDateAny(v) {
    if (v === null || v === undefined) {
        return NaN;
    }
    const s = String(v).trim();
    if (!s) {
        return NaN;
    }

    if (/^\d+$/.test(s)) {
        const raw = Number(s);
        if (!Number.isFinite(raw) || raw <= 0) {
            return NaN;
        }
        if (raw > 1e14) {
            return Math.floor(raw / 1000); // microseconds
        }
        if (raw > 1e11) {
            return Math.floor(raw); // milliseconds
        }
        return Math.floor(raw * 1000); // seconds
    }

    // Format: dd-mm-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split("-").map((x) => Number(x));
        return new Date(yyyy, mm - 1, dd).getTime();
    }

    // Fallback to native parser (e.g. yyyy-mm-dd)
    return new Date(s).getTime();
}

function getDteDays(expiryDate) {
    const now = Date.now();
    const exp = parseDateAny(expiryDate);
    if (!Number.isFinite(exp)) {
        return null;
    }
    return (exp - now) / (24 * 60 * 60 * 1000);
}

function formatDDMMYYYY(dateObj) {
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = String(dateObj.getFullYear());
    return `${d}-${m}-${y}`;
}

function getUnderlyingCandidates(underlying) {
    const base = String(underlying || "BTC").trim().toUpperCase();
    const list = [base];
    if (!base.endsWith("USD")) {
        list.push(`${base}USD`);
    }
    return [...new Set(list)];
}

function getDefaultCandidateExpiries() {
    const now = new Date();
    const daySteps = [5, 7, 9, 10, 12, 14, 30, 37, 45, 52, 60];
    const out = [];
    for (const d of daySteps) {
        const x = new Date(now);
        x.setDate(x.getDate() + d);
        out.push(formatDDMMYYYY(x));
    }
    return [...new Set(out)];
}

function getCandidateExpiriesFromProducts(products) {
    const nowMs = Date.now();
    const objSet = new Set();
    for (const p of (products || [])) {
        const candidates = [
            p?.expiry_date,
            p?.expiry,
            p?.settlement_time,
            p?.expiry_time,
            p?.expiry_timestamp
        ];

        for (const c of candidates) {
            if (!c) {
                continue;
            }
            const ts = parseDateAny(c);
            if (!Number.isFinite(ts) || ts <= nowMs) {
                continue;
            }
            objSet.add(formatDDMMYYYY(new Date(ts)));
        }
    }

    return Array.from(objSet).sort((a, b) => parseDateAny(a) - parseDateAny(b));
}

async function fetchOptionProducts(underlying) {
    const underlyings = getUnderlyingCandidates(underlying);
    const all = [];

    for (const und of underlyings) {
        try {
            const url = `${BASE_URL}/v2/products?contract_types=call_options,put_options&underlying_asset_symbols=${encodeURIComponent(und)}`;
            const resp = await axios.get(url);
            if (resp.data?.success && Array.isArray(resp.data?.result)) {
                all.push(...resp.data.result);
            }
        }
        catch (_err) {
            // best effort
        }
    }

    return all;
}

async function fetchTicker(symbol) {
    try {
        const resp = await axios.get(`${BASE_URL}/v2/tickers/${symbol}`);
        const row = resp.data?.result || {};
        return {
            symbol,
            spot: toNum(row.spot_price, 0),
            mark: toNum(row.mark_price, toNum(row.spot_price, 0)),
            bestBid: toNum(row?.quotes?.best_bid, null),
            bestAsk: toNum(row?.quotes?.best_ask, null)
        };
    }
    catch (err) {
        const msg = err?.response?.data?.error?.code || err?.response?.statusText || err?.message || "Ticker fetch failed";
        throw new Error(`ticker_fetch_failed: ${msg}`);
    }
}

async function fetchOptionChain(apiKey, apiSecret, underlying) {
    const client = await new DeltaRestClient(apiKey, apiSecret);
    const products = await fetchOptionProducts(underlying);
    let expiries = getCandidateExpiriesFromProducts(products);
    if (expiries.length === 0) {
        expiries = getDefaultCandidateExpiries();
    }

    const underlyings = getUnderlyingCandidates(underlying);
    const rows = [];
    const errors = [];

    for (const und of underlyings) {
        for (const expiry of expiries) {
            const queries = [
                { contract_types: "", underlying_asset_symbols: und, expiry_date: expiry },
                { underlying_asset_symbols: und, expiry_date: expiry }
            ];

            for (const query of queries) {
                try {
                    const response = await client.apis.Products.getOptionChain(query);
                    const parsed = JSON.parse(response.data || "{}");
                    if (parsed.success && Array.isArray(parsed.result) && parsed.result.length > 0) {
                        rows.push(...parsed.result.map((r) => ({ ...r, __req_expiry: expiry, __req_underlying: und })));
                        break;
                    }
                    else if (!parsed.success) {
                        errors.push({
                            und,
                            expiry,
                            message: parsed?.error?.code || parsed?.message || "option_chain_not_success"
                        });
                    }
                }
                catch (err) {
                    errors.push({
                        und,
                        expiry,
                        message: err?.response?.body?.error?.code || err?.response?.statusText || err?.message || "Bad Request"
                    });
                }
            }
        }
    }

    if (rows.length === 0) {
        const firstErr = errors[0]?.message || "Failed to fetch option chain";
        throw new Error(`option_chain_fetch_failed: ${firstErr}`);
    }

    return rows
        .map((row) => {
            const expiry = row?.expiry_date || row?.expiry || row?.settlement_time || row?.expiry_time || row?.expiry_timestamp || row?.__req_expiry;
            const dte = getDteDays(expiry);
            const type = inferOptionType(row);
            if (!type || dte === null) {
                return null;
            }
            return {
                productId: row?.product_id,
                symbol: row?.symbol || row?.product_symbol,
                type,
                expiry,
                dte,
                strike: toNum(row?.strike_price ?? row?.strike, null),
                delta: toNum(row?.greeks?.delta ?? row?.delta, null),
                gamma: toNum(row?.greeks?.gamma ?? row?.gamma, 0),
                theta: toNum(row?.greeks?.theta ?? row?.theta, 0),
                vega: toNum(row?.greeks?.vega ?? row?.vega, 0),
                bestBid: toNum(row?.quotes?.best_bid ?? row?.best_bid, null),
                bestAsk: toNum(row?.quotes?.best_ask ?? row?.best_ask, null),
                mark: toNum(row?.close, toNum(row?.quotes?.mark_price ?? row?.mark_price, null))
            };
        })
        .filter(Boolean)
        .filter((o) => Number.isFinite(o.dte) && o.dte > 0 && !!o.symbol);
}

function selectOptionByDteDelta(options, criteria) {
    const {
        type,
        dteMin,
        dteMax,
        targetAbsDelta
    } = criteria;

    let candidates = options.filter((o) =>
        o.type === type &&
        o.dte >= dteMin &&
        o.dte <= dteMax
    );

    if (candidates.length === 0) {
        // Fallback: nearest available contract by DTE + delta.
        candidates = options.filter((o) =>
            o.type === type &&
            Number.isFinite(o.dte) &&
            o.dte > 0
        );
        if (candidates.length === 0) {
            return null;
        }
    }

    const vTargetDteMid = (Number(dteMin) + Number(dteMax)) / 2;
    candidates.sort((a, b) => {
        const aDeltaDiff = Number.isFinite(Number(a.delta)) ? Math.abs(Math.abs(a.delta) - targetAbsDelta) : 999;
        const bDeltaDiff = Number.isFinite(Number(b.delta)) ? Math.abs(Math.abs(b.delta) - targetAbsDelta) : 999;
        const aDteDiff = Math.abs(a.dte - vTargetDteMid);
        const bDteDiff = Math.abs(b.dte - vTargetDteMid);

        if (aDteDiff !== bDteDiff) {
            return aDteDiff - bDteDiff;
        }
        if (aDeltaDiff !== bDeltaDiff) {
            return aDeltaDiff - bDeltaDiff;
        }
        return Math.abs((a.strike || 0)) - Math.abs((b.strike || 0));
    });

    return candidates[0] || null;
}

async function fetchSnapshot(apiKey, apiSecret, config) {
    const [ticker, options] = await Promise.all([
        fetchTicker(config.symbol),
        fetchOptionChain(apiKey, apiSecret, config.underlying)
    ]);

    return {
        ticker,
        options,
        ts: new Date().toISOString()
    };
}

module.exports = {
    fetchSnapshot,
    selectOptionByDteDelta
};



