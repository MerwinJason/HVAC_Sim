// Psychrometrics Engine (IP Units)

/**
 * Returns saturation pressure of water vapor (psia) over liquid water
 * using the Tetens formula converted to IP.
 */
function getPws(Tdb) {
    const Tc = (Tdb - 32) * 5 / 9;
    // Saturation vapor pressure in hPa (mb)
    const Pws_hPa = 6.112 * Math.exp(17.67 * Tc / (Tc + 243.5));
    return Pws_hPa * 0.01450377; // Convert to psia
}

export function getHumidityRatio(Tdb, Twb, P_atm = 14.696) {
    const Pws_wb = getPws(Twb);
    const Wsat_wb = 0.62198 * Pws_wb / (P_atm - Pws_wb);
    // Sprung formula exactly as specified
    return Wsat_wb - 0.000367 * (Tdb - Twb);
}

export function getRelativeHumidity(Tdb, Twb, P_atm = 14.696) {
    const W = getHumidityRatio(Tdb, Twb, P_atm);
    const Pw = W * P_atm / (0.62198 + W);
    const Pws = getPws(Tdb);
    return Pw / Pws;
}

export function getDewPoint(Tdb, W, P_atm = 14.696) {
    const Pw = W * P_atm / (0.62198 + W);
    const Pw_hPa = Pw / 0.01450377;
    // Inverse Tetens to find Dew Point in Celsius
    const Tc = 243.5 * Math.log(Pw_hPa / 6.112) / (17.67 - Math.log(Pw_hPa / 6.112));
    return Tc * 9 / 5 + 32;
}

export function getEnthalpy(Tdb, W) {
    // h = 0.240·Tdb + W·(1061 + 0.444·Tdb)
    return 0.240 * Tdb + W * (1061 + 0.444 * Tdb);
}

export function getSpecificVolume(Tdb, W, P_atm = 14.696) {
    // 0.370486 comes from (R_air / 144) where R_air = 53.35 ft-lbf/lb-R
    return (0.370486 * (Tdb + 459.67) / P_atm) * (1 + 1.6078 * W);
}

export function getWBfromTdbRH(Tdb, RH, P_atm = 14.696) {
    const Pws = getPws(Tdb);
    const Pw = RH * Pws;
    const targetW = 0.62198 * Pw / (P_atm - Pw);
    
    // Iterative solve (bisection) for Twb
    let low = 0;
    let high = Tdb;
    let Twb = Tdb;
    
    for (let i = 0; i < 20; i++) {
        Twb = (low + high) / 2;
        let currentW = getHumidityRatio(Tdb, Twb, P_atm);
        if (currentW > targetW) {
            high = Twb;
        } else {
            low = Twb;
        }
    }
    return Twb;
}

export function getSensibleHeat(Tdb1, Tdb2, cfm, W) {
    const v = getSpecificVolume(Tdb1, W, 14.696);
    const massFlow = (cfm * 60) / v; // lb dry air / hr
    return massFlow * 0.240 * (Tdb1 - Tdb2); // Btu/h
}

export function getLatentHeat(W1, W2, cfm) {
    // Standard air approximation for mass flow if only CFM provided
    const massFlow = cfm * 60 * 0.075; 
    const moistureRemoved = massFlow * (W1 - W2); // lb/h
    return {
        heat: moistureRemoved * 1061, // Btu/h
        moistureRemoved: moistureRemoved
    };
}

export function getTotalHeat(h1, h2, cfm) {
    const massFlow = cfm * 60 * 0.075;
    return massFlow * (h1 - h2);
}

export function runTests() {
    console.log("%c--- Psychrometrics Engine Tests ---", "color: #30d158; font-weight: bold;");
    console.log(`getHumidityRatio(80, 67)    → ${getHumidityRatio(80, 67).toFixed(4)} lb/lb (Expected ~0.0112)`);
    console.log(`getRelativeHumidity(80, 67) → ${(getRelativeHumidity(80, 67) * 100).toFixed(1)}% (Expected ~51.1%)`);
}
