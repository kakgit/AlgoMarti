const axios = require("axios");
const crypto = require("crypto");
const DeltaRestClient = require("delta-rest-client");

const BASE_URL_DELTA = "https://api.india.delta.exchange";
const URL_COINDCX = "https://api.coindcx.com";
const URL_COINDCX_PUBLIC = "https://public.coindcx.com";
const COINDCX_FREQ_TTL_MS = 6 * 60 * 60 * 1000;
const COINDCX_FREQ_CACHE = new Map();
const COINDCX_BOOK_TTL_MS = 15 * 1000;
const COINDCX_BOOK_CACHE = new Map();

exports.defaultRoute = (req, res) => {
    res.render("cryptoFundingV2.ejs");
};

exports.fnDeltaCredValidate = async (req, res) => {
    try {
        const apiKey = req.body.ApiKey;
        const apiSecret = req.body.SecretCode;

        if (!apiKey || !apiSecret) {
            res.send({ status: "warning", message: "API key and secret are required.", data: {} });
            return;
        }

        const wallet = await getDeltaWallet(apiKey, apiSecret);
        res.send(wallet);
    } catch (error) {
        res.send({ status: "danger", message: "Failed to validate Delta credentials.", data: normalizeError(error) });
    }
};

exports.fnRefreshFundingData = async (req, res) => {
    try {
        const apiKey = req.body.ApiKey;
        const apiSecret = req.body.ApiSecret;
        const minDailyRate = Number(req.body.MinDailyRate || 0.5);

        if (!apiKey || !apiSecret) {
            res.send({ status: "warning", message: "API key and secret are required.", data: [] });
            return;
        }

        const [deltaProducts, coinDcxSymbols, deltaFundingMap, coinDcxFundingMap] = await Promise.all([
            getDeltaProducts(apiKey, apiSecret),
            getCoinDcxActiveSymbols(),
            getDeltaFundingMap(apiKey, apiSecret),
            getCoinDcxFundingMap()
        ]);

        if (deltaProducts.status !== "success") {
            res.send(deltaProducts);
            return;
        }
        if (coinDcxSymbols.status !== "success") {
            res.send(coinDcxSymbols);
            return;
        }
        if (deltaFundingMap.status !== "success") {
            res.send(deltaFundingMap);
            return;
        }
        if (coinDcxFundingMap.status !== "success") {
            res.send(coinDcxFundingMap);
            return;
        }

        const mappedRows = mergeFundingData(
            deltaProducts.data,
            coinDcxSymbols.data,
            deltaFundingMap.data.fundingMap,
            deltaFundingMap.data.volumeMap,
            deltaFundingMap.data.bestRateMap,
            coinDcxFundingMap.data
        );
        await enrichWithCoinDcxFrequency(mappedRows.rows);
        const finalRows = applyDayRateAndFilter(mappedRows.rows, minDailyRate);

        res.send({
            status: "success",
            message: "Funding data refreshed.",
            data: finalRows,
            meta: {
                ...mappedRows.meta,
                filteredRows: finalRows.length,
                minDailyRate
            }
        });
    } catch (error) {
        res.send({ status: "danger", message: "Error while refreshing funding data.", data: normalizeError(error) });
    }
};

exports.fnGetLatestTradeRates = async (req, res) => {
    try {
        const apiKey = req.body.ApiKey;
        const apiSecret = req.body.ApiSecret;
        const symbolD = req.body.SymbolD;
        const symbolC = req.body.SymbolC;
        const deltaBS = req.body.DeltaBS;
        const coinBS = req.body.CDcxBS;

        if (!apiKey || !apiSecret || !symbolD || !symbolC || !deltaBS || !coinBS) {
            res.send({ status: "warning", message: "Missing required inputs for latest trade rates.", data: {} });
            return;
        }

        const [deltaBestRates, coinBestRates] = await Promise.all([
            getDeltaBestRatesBySymbol(apiKey, apiSecret, symbolD),
            getCoinDcxBestRatesByPair(symbolC)
        ]);

        if (deltaBestRates.status !== "success") {
            res.send(deltaBestRates);
            return;
        }
        if (coinBestRates.status !== "success") {
            res.send(coinBestRates);
            return;
        }

        const dRate = pickRateBySide(deltaBS, deltaBestRates.data.bestAsk, deltaBestRates.data.bestBid);
        const cRate = pickRateBySide(coinBS, coinBestRates.data.bestAsk, coinBestRates.data.bestBid);

        if (!Number.isFinite(Number(dRate)) || !Number.isFinite(Number(cRate))) {
            res.send({ status: "warning", message: "Latest rates unavailable for one or both exchanges.", data: { DRate: dRate, CRate: cRate } });
            return;
        }

        res.send({
            status: "success",
            message: "Latest trade rates fetched.",
            data: {
                DRate: Number(dRate),
                CRate: Number(cRate),
                DBestAsk: Number(deltaBestRates.data.bestAsk),
                DBestBid: Number(deltaBestRates.data.bestBid),
                CBestAsk: Number(coinBestRates.data.bestAsk),
                CBestBid: Number(coinBestRates.data.bestBid)
            }
        });
    } catch (error) {
        res.send({ status: "danger", message: "Failed to fetch latest trade rates.", data: normalizeError(error) });
    }
};

async function getDeltaWallet(apiKey, apiSecret) {
    try {
        const client = await new DeltaRestClient(apiKey, apiSecret);
        const response = await client.apis.Wallet.getBalances();
        const parsed = JSON.parse(response.data.toString());

        if (!parsed.success || !Array.isArray(parsed.result) || parsed.result.length === 0) {
            return { status: "warning", message: "Unable to fetch wallet balances.", data: parsed };
        }

        return { status: "success", message: "Delta credentials are valid.", data: parsed.result[0] };
    } catch (error) {
        const parsedError = normalizeError(error);
        if (parsedError.code === "ip_not_whitelisted_for_api_key") {
            const ipText = parsedError.clientIp ? ` IP: ${parsedError.clientIp}` : "";
            return {
                status: "danger",
                message: `Delta API key IP is not whitelisted.${ipText} Update this IP in Delta Exchange API settings.`,
                data: parsedError
            };
        }
        return { status: "danger", message: "Delta credential validation failed.", data: parsedError };
    }
}

async function enrichWithCoinDcxFrequency(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return;

    const uniqueSymbols = [...new Set(rows.map((row) => row.SymbolC).filter(Boolean))];
    const instrumentMap = await getCoinDcxInstrumentMetaMap(uniqueSymbols);
    const bestRateMap = await getCoinDcxBestRatesMap(uniqueSymbols);

    for (const row of rows) {
        const meta = instrumentMap[row.SymbolC] || {};
        const bestRates = bestRateMap[row.SymbolC] || {};
        row.CRateFeqHr = Number.isFinite(meta.fundingFrequency) ? Number(meta.fundingFrequency) : null;
        row.MinOdrValC = Number.isFinite(meta.minOrderValue) ? Number(meta.minOrderValue) : null;
        row.CLotSize = Number.isFinite(meta.unitContractValue)
            ? Number(meta.unitContractValue)
            : (Number.isFinite(meta.minTradeSize) ? Number(meta.minTradeSize) : null);
        row.CQtyMin = Number.isFinite(meta.minQuantity) ? Number(meta.minQuantity) : null;
        row.CQtyStep = Number.isFinite(meta.quantityIncrement) ? Number(meta.quantityIncrement) : null;
        row.CTakerFee = Number.isFinite(meta.takerFeeRate) ? Number(meta.takerFeeRate) : null;
        row.CRate = pickRateBySide(row.CDcxBS, bestRates.bestAsk, bestRates.bestBid);
    }
}

async function getCoinDcxInstrumentMetaMap(symbols) {
    const map = {};
    const queue = Array.isArray(symbols) ? [...symbols] : [];
    const workers = Array.from({ length: Math.min(10, queue.length) }, async () => {
        while (queue.length > 0) {
            const symbol = queue.shift();
            if (!symbol) continue;
            map[symbol] = await getCoinDcxInstrumentMetaByPair(symbol);
        }
    });

    await Promise.all(workers);
    return map;
}

async function getCoinDcxInstrumentMetaByPair(pair) {
    const now = Date.now();
    const cached = COINDCX_FREQ_CACHE.get(pair);
    if (cached && now - cached.ts < COINDCX_FREQ_TTL_MS) return cached.value;

    try {
        const response = await axios.request({
            method: "GET",
            url: `${URL_COINDCX}/exchange/v1/derivatives/futures/data/instrument?pair=${encodeURIComponent(pair)}&margin_currency_short_name=USDT`,
            headers: { "Content-Type": "application/json", Accept: "application/json" }
        });

        const fundingFrequency = Number(response.data?.instrument?.funding_frequency);
        const minOrderValue = Number(response.data?.instrument?.min_notional);
        const unitContractValue = Number(response.data?.instrument?.unit_contract_value);
        const minTradeSize = Number(response.data?.instrument?.min_trade_size);
        const minQuantity = Number(response.data?.instrument?.min_quantity);
        const quantityIncrement = Number(response.data?.instrument?.quantity_increment);
        const takerFee = Number(response.data?.instrument?.taker_fee);
        const normalized = {
            fundingFrequency: Number.isFinite(fundingFrequency) ? fundingFrequency : null,
            minOrderValue: Number.isFinite(minOrderValue) ? minOrderValue : null,
            unitContractValue: Number.isFinite(unitContractValue) ? unitContractValue : null,
            minTradeSize: Number.isFinite(minTradeSize) ? minTradeSize : null,
            minQuantity: Number.isFinite(minQuantity) ? minQuantity : null,
            quantityIncrement: Number.isFinite(quantityIncrement) ? quantityIncrement : null,
            takerFeeRate: normalizeFeeRate(takerFee)
        };
        COINDCX_FREQ_CACHE.set(pair, { value: normalized, ts: now });
        return normalized;
    } catch (error) {
        const fallback = {
            fundingFrequency: null,
            minOrderValue: null,
            unitContractValue: null,
            minTradeSize: null,
            minQuantity: null,
            quantityIncrement: null,
            takerFeeRate: null
        };
        COINDCX_FREQ_CACHE.set(pair, { value: fallback, ts: now });
        return fallback;
    }
}

async function getCoinDcxBestRatesMap(symbols) {
    const map = {};
    const queue = Array.isArray(symbols) ? [...symbols] : [];
    const workers = Array.from({ length: Math.min(10, queue.length) }, async () => {
        while (queue.length > 0) {
            const symbol = queue.shift();
            if (!symbol) continue;
            const result = await getCoinDcxBestRatesByPair(symbol);
            map[symbol] = result.status === "success" ? (result.data || {}) : {};
        }
    });

    await Promise.all(workers);
    return map;
}

async function getCoinDcxBestRatesByPair(pair) {
    const now = Date.now();
    const cached = COINDCX_BOOK_CACHE.get(pair);
    if (cached && now - cached.ts < COINDCX_BOOK_TTL_MS) {
        return { status: "success", message: "CoinDCX best rates fetched (cache).", data: cached.value };
    }

    try {
        const response = await axios.request({
            method: "GET",
            url: `${URL_COINDCX_PUBLIC}/market_data/v3/orderbook/${encodeURIComponent(pair)}-futures/50`,
            headers: { "Content-Type": "application/json", Accept: "application/json" }
        });

        const asksObj = response.data?.asks || {};
        const bidsObj = response.data?.bids || {};
        const askKeys = Object.keys(asksObj).map((x) => Number(x)).filter((x) => Number.isFinite(x));
        const bidKeys = Object.keys(bidsObj).map((x) => Number(x)).filter((x) => Number.isFinite(x));

        const bestAsk = askKeys.length > 0 ? Math.min(...askKeys) : null;
        const bestBid = bidKeys.length > 0 ? Math.max(...bidKeys) : null;
        const normalized = { bestAsk, bestBid };
        COINDCX_BOOK_CACHE.set(pair, { value: normalized, ts: now });
        return { status: "success", message: "CoinDCX best rates fetched.", data: normalized };
    } catch (error) {
        const fallback = { bestAsk: null, bestBid: null };
        COINDCX_BOOK_CACHE.set(pair, { value: fallback, ts: now });
        return { status: "danger", message: "Failed to fetch CoinDCX best rates.", data: normalizeError(error) };
    }
}

async function getDeltaBestRatesBySymbol(apiKey, apiSecret, symbol) {
    try {
        const method = "GET";
        const path = "/v2/tickers?contract_types=perpetual_futures";
        const timestamp = Math.floor(Date.now() / 1000);
        const queryStr = "";
        const body = "";
        const signature = getDeltaSignature(apiSecret, method, path, queryStr, timestamp, body);

        const response = await axios.request({
            method,
            url: `${BASE_URL_DELTA}${path}${queryStr}`,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "api-key": apiKey,
                signature,
                timestamp
            }
        });

        const rows = response.data?.result || [];
        const row = rows.find((item) => item.symbol === symbol);
        if (!row) {
            return { status: "warning", message: `Delta ticker not found for symbol ${symbol}.`, data: {} };
        }

        const bestAsk = Number(row.quotes?.best_ask);
        const bestBid = Number(row.quotes?.best_bid);
        return { status: "success", message: "Delta best rates fetched.", data: { bestAsk, bestBid } };
    } catch (error) {
        return { status: "danger", message: "Failed to fetch Delta best rates.", data: normalizeError(error) };
    }
}

async function getDeltaProducts(apiKey, apiSecret) {
    try {
        const client = await new DeltaRestClient(apiKey, apiSecret);
        const response = await client.apis.Products.getProducts({ contract_types: "perpetual_futures", states: "live" });
        const parsed = JSON.parse(response.data);

        if (!parsed.success || !Array.isArray(parsed.result)) {
            return { status: "warning", message: "Delta products fetch returned no data.", data: [] };
        }

        const products = parsed.result.map((item) => {
            const rateFreqSeconds = Number(item.product_specs?.rate_exchange_interval || 0);
            const rateFreqHours = rateFreqSeconds > 0 ? rateFreqSeconds / 3600 : 0;
            const underlying = item.spot_index?.config?.underlying_asset || "";

            return {
                AnnualFundD: Number(item.annualized_funding || 0),
                LotSizeD: Number(item.contract_value || 0),
                LeverageD: Number(item.default_leverage || 0),
                DTakerFee: normalizeFeeRate(Number(item.taker_commission_rate)),
                SymbIdD: item.id,
                PosLimitD: Number(item.position_size_limit || 0),
                RateFeqMsD: rateFreqSeconds,
                RateFeqHrD: rateFreqHours,
                SymbolD: item.symbol,
                UndrAsstSymbD: underlying,
                AllowOnlyCloseD: !!item.product_specs?.only_reduce_only_orders_allowed,
                SymbolC: `B-${underlying}_USDT`
            };
        });

        return { status: "success", message: "Delta products fetched.", data: products };
    } catch (error) {
        return { status: "danger", message: "Failed to fetch Delta products.", data: normalizeError(error) };
    }
}

async function getCoinDcxActiveSymbols() {
    try {
        const response = await axios.request({
            method: "GET",
            url: `${URL_COINDCX}/exchange/v1/derivatives/futures/data/active_instruments?margin_currency_short_name[]=USDT`,
            headers: { "Content-Type": "application/json", Accept: "application/json" }
        });

        const symbolSet = new Set(Array.isArray(response.data) ? response.data : []);
        return { status: "success", message: "CoinDCX active symbols fetched.", data: symbolSet };
    } catch (error) {
        return { status: "danger", message: "Failed to fetch CoinDCX active symbols.", data: normalizeError(error) };
    }
}

async function getCoinDcxFundingMap() {
    try {
        const response = await axios.request({
            method: "GET",
            url: `${URL_COINDCX_PUBLIC}/market_data/v3/current_prices/futures/rt`,
            headers: { "Content-Type": "application/json", Accept: "application/json" }
        });

        const prices = response.data?.prices || {};
        return { status: "success", message: "CoinDCX funding map fetched.", data: prices };
    } catch (error) {
        return { status: "danger", message: "Failed to fetch CoinDCX funding map.", data: normalizeError(error) };
    }
}

async function getDeltaFundingMap(apiKey, apiSecret) {
    try {
        const method = "GET";
        const path = "/v2/tickers?contract_types=perpetual_futures";
        const timestamp = Math.floor(Date.now() / 1000);
        const queryStr = "";
        const body = "";
        const signature = getDeltaSignature(apiSecret, method, path, queryStr, timestamp, body);

        const response = await axios.request({
            method,
            url: `${BASE_URL_DELTA}${path}${queryStr}`,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "api-key": apiKey,
                signature,
                timestamp
            }
        });

        const fundingMap = {};
        const volumeMap = {};
        const bestRateMap = {};
        const rows = response.data?.result || [];
        for (const item of rows) {
            fundingMap[item.symbol] = Number(item.funding_rate || 0);
            volumeMap[item.symbol] = Number(item.volume || 0);
            bestRateMap[item.symbol] = {
                bestAsk: Number(item.quotes?.best_ask),
                bestBid: Number(item.quotes?.best_bid)
            };
        }

        return { status: "success", message: "Delta funding map fetched.", data: { fundingMap, volumeMap, bestRateMap } };
    } catch (error) {
        return { status: "danger", message: "Failed to fetch Delta funding map.", data: normalizeError(error) };
    }
}

function mergeFundingData(deltaProducts, coinDcxSymbolSet, deltaFundingMap, deltaVolumeMap, deltaBestRateMap, coinDcxFundingMap) {
    const rows = [];
    let missingCoinDcxRate = 0;
    let totalCommonSymbols = 0;

    for (const item of deltaProducts) {
        if (!coinDcxSymbolSet.has(item.SymbolC)) continue;
        totalCommonSymbols += 1;

        const deltaFunding = Number(deltaFundingMap[item.SymbolD]);
        const deltaVolume = Number(deltaVolumeMap[item.SymbolD]);
        const deltaBestRates = deltaBestRateMap[item.SymbolD] || {};
        const coinData = coinDcxFundingMap[item.SymbolC];
        const coinFunding = Number(coinData?.fr) * 100;
        const coinVolume = Number(coinData?.v);

        if (!Number.isFinite(deltaFunding) || !Number.isFinite(coinFunding)) {
            missingCoinDcxRate += 1;
            continue;
        }

        const side = getTradeSide(deltaFunding, coinFunding);
        const rateDiff = Math.abs(side.rateTB);
        if (item.AllowOnlyCloseD !== false) continue;

        rows.push({
            ...item,
            FundDelta: deltaFunding,
            FundCDcx: coinFunding,
            DVolume: Number.isFinite(deltaVolume) ? deltaVolume : null,
            CVolume: Number.isFinite(coinVolume) ? coinVolume : null,
            DRate: pickRateBySide(side.deltaBS, deltaBestRates.bestAsk, deltaBestRates.bestBid),
            DeltaBS: side.deltaBS,
            CDcxBS: side.coinBS,
            RateDiff: rateDiff,
            RatePD: null
        });
    }

    return {
        rows,
        meta: {
            totalDeltaProducts: deltaProducts.length,
            totalCommonSymbols,
            missingCoinDcxRate
        }
    };
}

function computeSignedFundingRate(side, fundingRate) {
    const s = String(side || "");
    const r = Number(fundingRate);
    if (!Number.isFinite(r)) return null;
    if (s === "B") return -r;
    if (s === "S") return r;
    return null;
}

function computeDayRate(sideD, sideC, fundD, fundC, freqHrD, freqHrC) {
    const legD = computeSignedFundingRate(sideD, fundD);
    const legC = computeSignedFundingRate(sideC, fundC);
    const fD = Number(freqHrD);
    const fC = Number(freqHrC);
    if (!Number.isFinite(legD) || !Number.isFinite(legC)) return null;
    if (!Number.isFinite(fD) || fD <= 0 || !Number.isFinite(fC) || fC <= 0) return null;
    return Math.abs((legD * (24 / fD)) + (legC * (24 / fC)));
}

function computeTbRateHourly(sideD, sideC, fundD, fundC, freqHrD, freqHrC) {
    const legD = computeSignedFundingRate(sideD, fundD);
    const legC = computeSignedFundingRate(sideC, fundC);
    const fD = Number(freqHrD);
    const fC = Number(freqHrC);
    if (!Number.isFinite(legD) || !Number.isFinite(legC)) return null;
    if (!Number.isFinite(fD) || fD <= 0 || !Number.isFinite(fC) || fC <= 0) return null;
    return Math.abs((legD / fD) + (legC / fC));
}

function applyDayRateAndFilter(rows, minDailyRate) {
    const threshold = Number(minDailyRate || 0);
    const out = [];
    for (const row of (rows || [])) {
        const dRate = Number(row.DRate);
        const cRate = Number(row.CRate);
        if (!Number.isFinite(dRate) || dRate <= 0 || !Number.isFinite(cRate) || cRate <= 0) continue;

        const tbRate = computeTbRateHourly(
            row.DeltaBS,
            row.CDcxBS,
            row.FundDelta,
            row.FundCDcx,
            row.RateFeqHrD,
            row.CRateFeqHr
        );
        const dayRate = computeDayRate(
            row.DeltaBS,
            row.CDcxBS,
            row.FundDelta,
            row.FundCDcx,
            row.RateFeqHrD,
            row.CRateFeqHr
        );

        row.RateDiff = Number.isFinite(tbRate) ? tbRate : null;
        row.RatePD = Number.isFinite(dayRate) ? dayRate : null;
        if (!Number.isFinite(row.RatePD)) continue;
        if (row.RatePD < threshold) continue;
        out.push(row);
    }

    out.sort((a, b) => Number(b.RatePD || 0) - Number(a.RatePD || 0));
    return out;
}

function getTradeSide(deltaFunding, coinFunding) {
    let deltaBS = "NT";
    let coinBS = "NT";
    let rateTB = 0;

    if (deltaFunding < 0 && coinFunding >= 0) {
        rateTB = Math.abs(deltaFunding) + coinFunding;
        deltaBS = "B";
        coinBS = "S";
    } else if (deltaFunding >= 0 && coinFunding < 0) {
        rateTB = deltaFunding + Math.abs(coinFunding);
        deltaBS = "S";
        coinBS = "B";
    } else if (deltaFunding < 0 && coinFunding < 0) {
        rateTB = deltaFunding - coinFunding;
        if (deltaFunding < coinFunding) {
            deltaBS = "B";
            coinBS = "S";
        } else {
            deltaBS = "S";
            coinBS = "B";
        }
    } else {
        rateTB = deltaFunding - coinFunding;
        if (deltaFunding > coinFunding) {
            deltaBS = "S";
            coinBS = "B";
        } else {
            deltaBS = "B";
            coinBS = "S";
        }
    }

    return { deltaBS, coinBS, rateTB };
}

function getDeltaSignature(apiSecret, method, path, queryStr, timestamp, body) {
    const payload = body || "";
    const message = `${method}${timestamp}${path}${queryStr}${payload}`;
    return crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
}

function normalizeFeeRate(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    // CoinDCX commonly returns fee like 0.059 meaning 0.059%.
    if (n > 0.01) return n / 100;
    return n;
}

function pickRateBySide(side, bestAsk, bestBid) {
    const ask = Number(bestAsk);
    const bid = Number(bestBid);
    if (side === "B") return Number.isFinite(ask) ? ask : null;
    if (side === "S") return Number.isFinite(bid) ? bid : null;
    return null;
}

function normalizeError(error) {
    if (!error) return { message: "Unknown error" };
    const raw = error.response?.data || error.response?.body || null;
    const code =
        error.response?.data?.error?.code ||
        error.response?.body?.error?.code ||
        error.response?.text?.error?.code ||
        null;
    const clientIp =
        error.response?.data?.error?.context?.client_ip ||
        error.response?.body?.error?.context?.client_ip ||
        error.response?.text?.error?.context?.client_ip ||
        null;

    return {
        message: error.message || "Request failed",
        status: error.response?.status || null,
        code,
        clientIp,
        raw
    };
}
