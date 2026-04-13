// Saturated Anchor Data (R-410A)
const R410A_T  = [-40, -20, 0, 20, 40, 47, 60, 80, 95, 100, 105, 120, 140];
const R410A_P  = [29.3, 43.0, 61.4, 84.8, 114.6, 128.1, 152.6, 199.7, 243.4, 258.4, 274.2, 323.6, 399.2];
const R410A_HF = [0.00, 5.97, 12.1, 18.3, 24.8, 27.0, 31.5, 38.4, 44.1, 45.6, 47.2, 53.1, 61.2];
const R410A_HG = [109.1, 111.5, 113.8, 116.0, 118.0, 118.5, 119.8, 121.3, 122.3, 122.6, 122.8, 123.5, 124.0];

function cubicInterpolate(x, xCol, yCol) {
    if (x <= xCol[0]) return yCol[0];
    if (x >= xCol[xCol.length - 1]) return yCol[yCol.length - 1];

    let i = 0;
    while (i < xCol.length - 2 && xCol[i + 1] < x) { i++; }

    let idx = Math.max(1, Math.min(i, xCol.length - 3));
    
    let x0 = xCol[idx - 1], y0 = yCol[idx - 1];
    let x1 = xCol[idx],     y1 = yCol[idx];
    let x2 = xCol[idx + 1], y2 = yCol[idx + 1];
    let x3 = xCol[idx + 2], y3 = yCol[idx + 2];

    let L0 = ((x - x1) * (x - x2) * (x - x3)) / ((x0 - x1) * (x0 - x2) * (x0 - x3));
    let L1 = ((x - x0) * (x - x2) * (x - x3)) / ((x1 - x0) * (x1 - x2) * (x1 - x3));
    let L2 = ((x - x0) * (x - x1) * (x - x3)) / ((x2 - x0) * (x2 - x1) * (x2 - x3));
    let L3 = ((x - x0) * (x - x1) * (x - x2)) / ((x3 - x0) * (x3 - x1) * (x3 - x2));

    return (y0 * L0) + (y1 * L1) + (y2 * L2) + (y3 * L3);
}

export function getPsat(T_F) { return cubicInterpolate(T_F, R410A_T, R410A_P); }
export function getTsat(P_psia) { return cubicInterpolate(P_psia, R410A_P, R410A_T); }
export function getHf(T_F) { return cubicInterpolate(T_F, R410A_T, R410A_HF); }
export function getHg(T_F) { return cubicInterpolate(T_F, R410A_T, R410A_HG); }

export function getQuality(h, T_sat) {
    const hf = getHf(T_sat);
    const hg = getHg(T_sat);
    if (h <= hf) return 0;
    if (h >= hg) return 1;
    return (h - hf) / (hg - hf);
}

export function getHsuperheated(P, T_actual) {
    const Tsat = getTsat(P);
    if (T_actual <= Tsat) return getHg(Tsat);
    const superheat = T_actual - Tsat;
    const Cp_approx = 0.245 + (0.00015 * superheat) + (0.00005 * P);
    return getHg(Tsat) + (Cp_approx * superheat);
}

export function runTests() {
    console.log("%c--- R-410A Refrigerant Engine Tests ---", "color: #00d4ff; font-weight: bold;");
    console.log(`getPsat(95)      → ${getPsat(95).toFixed(1)} psia (Expected ~243.4)`);
    console.log(`getTsat(243.4)   → ${getTsat(243.4).toFixed(1)} °F (Expected ~95.0)`);
    console.log(`getHf(95)        → ${getHf(95).toFixed(1)} Btu/lb (Expected ~44.1)`);
    console.log(`getHg(40)        → ${getHg(40).toFixed(1)} Btu/lb (Expected ~118.0)`);
    
    const hSuper = getHsuperheated(114.6, 60);
    console.log(`getHsuperheat(114.6, 60) → ${hSuper.toFixed(1)} Btu/lb (Expected > 118.0)`);
}
