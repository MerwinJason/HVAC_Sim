/**
 * HVAC System Simulator - Phase 3: Compressor Model
 * Implements ARI 10-coefficient polynomial map and physics-based compression equations.
 */

export class Compressor {
    constructor(options = {}) {
        this.type = options.type || 'Scroll'; // Scroll, Rotary, Reciprocating
        this.driveType = options.driveType || 'Single'; // Single, Variable, Digital
        
        this.displacement = options.displacement || 2.5; // in³ per rev
        this.ratedRPM = options.ratedRPM || 3450;
        this.operatingRPM = options.operatingRPM || 3450;
        this.ratedPower = options.ratedPower || 3000; // W
        this.motorEfficiency = options.motorEfficiency || 0.85; // %
        this.suctionSuperheatTarget = options.suctionSuperheatTarget || 10; // °F
        this.dutyCycle = options.dutyCycle || 1.0; // 0.0 to 1.0 (Digital)

        // 10-coefficient maps (Default initialization)
        this.C = options.C || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Capacity (Btu/h)
        this.D = options.D || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Power (W)
    }

    // Evaluates the standard ARI 10-coefficient polynomial
    evaluateARI(coeffs, Te, Tc) {
        const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10] = coeffs;
        return c1 +
               c2 * Te +
               c3 * Tc +
               c4 * Te * Te +
               c5 * Te * Tc +
               c6 * Tc * Tc +
               c7 * Te * Te * Te +
               c8 * Tc * Te * Te +
               c9 * Te * Tc * Tc +
               c10 * Tc * Tc * Tc;
    }

    // Calculates Capacity (Btu/h) and Power (W) using the map and drive modifiers
    getMapPerformance(Te, Tc) {
        let Q = this.evaluateARI(this.C, Te, Tc);
        let P = this.evaluateARI(this.D, Te, Tc);

        // Apply variable speed or digital scroll modifiers
        if (this.driveType === 'Variable') {
            const rpmRatio = this.operatingRPM / this.ratedRPM;
            Q = Q * Math.pow(rpmRatio, 0.9);
            P = P * Math.pow(rpmRatio, 1.1);
        } else if (this.driveType === 'Digital') {
            Q = Q * this.dutyCycle;
            P = P * Math.pow(this.dutyCycle, 0.85);
        }

        return { Q_map: Q, P_map: P };
    }

    // Calculates volumetric efficiency based on empirical modifiers for the compressor type
    getVolumetricEfficiency(Pe, Pc) {
        const Rc = Pc / Pe;
        if (this.type === 'Scroll') {
            return 0.93 - 0.0015 * (Rc - 1);
        } else if (this.type === 'Rotary') {
            return 0.90 - 0.002 * (Rc - 1);
        } else if (this.type === 'Reciprocating') {
            return 0.85 - 0.003 * (Rc - 1);
        }
        return 0.90; // Fallback default
    }

    /**
     * Performs rigorous thermodynamic calculations.
     * Expected to be called during the iterative cycle simulation loop (Phase 12).
     */
    calculatePhysics(Te, Tc, Pe, Pc, v_suction, h_suction, h_discharge_is, Tsat_Pc) {
        const Rc = Pc / Pe;
        const eta_vol = this.getVolumetricEfficiency(Pe, Pc);
        
        // Mass flow rate: lb/min
        // V_dot (cfm) = Disp(in³) * RPM / 1728
        const V_dot_cfm = (this.displacement * this.operatingRPM) / 1728;
        const m_dot = (V_dot_cfm * eta_vol) / v_suction;
        
        // Isentropic Power
        const P_is_btu_min = m_dot * (h_discharge_is - h_suction);
        const P_is_W = P_is_btu_min * 17.5842; // Convert Btu/min to Watts
        
        // Actual Power (Isentropic efficiency ≈ 0.75 for typical scrolls)
        const eta_is = 0.75; 
        const P_act_W = P_is_W / eta_is;

        // Heat of compression & Discharge State
        const mapData = this.getMapPerformance(Te, Tc);
        const Q_rej = mapData.Q_map + (P_act_W * 3.412); // Btu/h
        
        // Energy balance for actual discharge enthalpy
        const h_discharge_actual = h_suction + ((P_act_W * 3.412) / (m_dot * 60));
        
        // APPROX: Discharge superheat using a rough specific heat of superheated vapor ~0.2 Btu/lb-°F 
        // (In Phase 12, this will use the true inverse lookup function from phase 1)
        const Cp_vapor = 0.2; 
        const T_dis = Tsat_Pc + ((h_discharge_actual - h_discharge_is) / Cp_vapor); 
        const dischargeSuperheat = T_dis - Tsat_Pc;

        const COP = mapData.Q_map / (P_act_W * 3.412);

        return {
            compressionRatio: Rc, volumetricEfficiency: eta_vol,
            massFlowRate: m_dot, isentropicPower: P_is_W,
            actualPower: P_act_W, isentropicEfficiency: eta_is,
            dischargeEnthalpy: h_discharge_actual, dischargeTemperature: T_dis,
            dischargeSuperheat: dischargeSuperheat, heatOfCompression: Q_rej,
            COP: COP, mapCapacity: mapData.Q_map, mapPower: mapData.P_map
        };
    }
}