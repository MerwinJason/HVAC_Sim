import { Compressor } from '../Physics/compressor.js';

export function initCompressorLab(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Build the structural UI with instrument-style dark theme
    container.innerHTML = `
        <div class="compressor-lab" style="background: #1a1d27; padding: 15px; border-radius: 8px;">
            <h4 style="color: #00d4ff; margin-top: 0; font-family: 'Inter', sans-serif;">10-Coefficient ARI Map</h4>
            <p style="font-size: 0.8rem; color: #888; margin-bottom: 10px;">Paste directly from Excel to auto-fill the grid</p>
            
            <div id="coeff-grid" style="display: grid; grid-template-columns: 30px 1fr 1fr; gap: 8px; margin-bottom: 15px; font-family: monospace;">
                <div style="color: #888; font-weight: 600;">#</div>
                <div style="color: #888; font-weight: 600;">Capacity (C)</div>
                <div style="color: #888; font-weight: 600;">Power (D)</div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <label style="color: #888; font-size: 0.9rem;">Type: 
                    <select id="comp-type" style="background: #0f1117; color: #fff; border: 1px solid #333; padding: 4px;">
                        <option value="Scroll">Scroll</option>
                        <option value="Rotary">Rotary</option>
                        <option value="Reciprocating">Reciprocating</option>
                    </select>
                </label>
                <label style="color: #888; font-size: 0.9rem;">Drive: 
                    <select id="comp-drive" style="background: #0f1117; color: #fff; border: 1px solid #333; padding: 4px;">
                        <option value="Single">Single-speed</option>
                        <option value="Variable">Variable (Inverter)</option>
                        <option value="Digital">Digital Scroll</option>
                    </select>
                </label>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
                <label style="color: #888; font-size: 0.8rem;">Displacement (in³): <input type="number" step="0.1" id="comp-disp" value="2.5" style="width: 55px; background: #0f1117; color: #00d4ff; border: 1px solid #333;"></label>
                <label style="color: #888; font-size: 0.8rem;">Rated RPM: <input type="number" step="10" id="comp-rpm-rated" value="3450" style="width: 55px; background: #0f1117; color: #00d4ff; border: 1px solid #333;"></label>
                <label style="color: #888; font-size: 0.8rem;">Operating RPM: <input type="number" step="10" id="comp-rpm-op" value="3450" style="width: 55px; background: #0f1117; color: #00d4ff; border: 1px solid #333;"></label>
                <label style="color: #888; font-size: 0.8rem;">Duty Cycle: <input type="number" step="0.05" min="0" max="1" id="comp-duty" value="1.0" style="width: 55px; background: #0f1117; color: #00d4ff; border: 1px solid #333;"></label>
            </div>
            <button id="update-map-btn" style="background: #00d4ff; color: #0f1117; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">Simulate Map</button>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 15px; flex-direction: column;">
            <div style="background: #1a1d27; padding: 10px; border-radius: 8px;">
                <h5 style="color: #00d4ff; margin: 0 0 10px 0;">Capacity Heat Map (Te vs Tc)</h5>
                <canvas id="comp-heatmap" width="300" height="150" style="width: 100%; border: 1px solid #333; background: #0f1117;"></canvas>
            </div>
            <div style="background: #1a1d27; padding: 10px; border-radius: 8px;">
                <h5 style="color: #00d4ff; margin: 0 0 10px 0;">Performance Curve (Variable RPM)</h5>
                <canvas id="comp-chart" width="300" height="150" style="width: 100%; border: 1px solid #333; background: #0f1117;"></canvas>
            </div>
        </div>
        
        <div id="comp-calc-results" style="margin-top: 15px; background: #1a1d27; padding: 15px; border-radius: 8px; font-family: monospace;">
            <!-- Live calculated outputs -->
        </div>
    `;

    // Generate 10 rows for coefficients (Pre-filling with rough mock baseline data for visualization)
    const grid = container.querySelector('#coeff-grid');
    for (let i = 1; i <= 10; i++) {
        grid.innerHTML += `
            <div style="color: #888; align-self: center;">${i}</div>
            <input type="number" step="any" id="coeff-c${i}" value="${i===1 ? 36000 : 0}" style="background: #0f1117; color: #00d4ff; border: 1px solid #333; padding: 4px;">
            <input type="number" step="any" id="coeff-d${i}" value="${i===1 ? 3000 : 0}" style="background: #0f1117; color: #00d4ff; border: 1px solid #333; padding: 4px;">
        `;
    }

    // Handle Excel Paste event
    container.querySelector('.compressor-lab').addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text');
        const rows = pasteData.trim().split('\n');
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const cols = rows[i].split('\t');
            if(cols.length >= 1) {
                const cVal = parseFloat(cols[0].replace(/,/g, ''));
                if(!isNaN(cVal)) document.getElementById(`coeff-c${i+1}`).value = cVal;
            }
            if(cols.length >= 2) {
                const dVal = parseFloat(cols[1].replace(/,/g, ''));
                if(!isNaN(dVal)) document.getElementById(`coeff-d${i+1}`).value = dVal;
            }
        }
        updateVisuals();
    });

    document.getElementById('update-map-btn').addEventListener('click', updateVisuals);
    
    // Function to parse current UI state, build model, and trigger draw updates
    function updateVisuals() {
        const C = [], D = [];
        for (let i = 1; i <= 10; i++) {
            C.push(parseFloat(document.getElementById(`coeff-c${i}`).value) || 0);
            D.push(parseFloat(document.getElementById(`coeff-d${i}`).value) || 0);
        }

        const comp = new Compressor({
            type: document.getElementById('comp-type').value,
            driveType: document.getElementById('comp-drive').value,
            displacement: parseFloat(document.getElementById('comp-disp').value),
            ratedRPM: parseFloat(document.getElementById('comp-rpm-rated').value),
            operatingRPM: parseFloat(document.getElementById('comp-rpm-op').value),
            dutyCycle: parseFloat(document.getElementById('comp-duty').value),
            C: C, D: D
        });

        // Mock standard state to run a live calculation (In future phases, this comes from the full cycle solver)
        const physics = comp.calculatePhysics(45, 100, 130, 315, 0.45, 118.0, 130.0, 100);

        // Render live Physics output
        const resBox = document.getElementById('comp-calc-results');
        resBox.innerHTML = `
            <div style="color: #00d4ff; margin-bottom: 8px; font-weight: bold; font-family: 'Inter', sans-serif;">Live Simulation (Te=45°F, Tc=100°F)</div>
            <div style="color: #888;">Comp Ratio (Rc): <span style="color:#fff;">${physics.compressionRatio.toFixed(2)}</span></div>
            <div style="color: #888;">Mass Flow: <span style="color:#fff;">${physics.massFlowRate.toFixed(2)} lb/min</span></div>
            <div style="color: #888;">Isentropic Power: <span style="color:#fff;">${physics.isentropicPower.toFixed(0)} W</span></div>
            <div style="color: #888;">Actual Power: <span style="color:#fff;">${physics.actualPower.toFixed(0)} W</span></div>
            <div style="color: #888;">COP: <span style="color:#fff;">${physics.COP.toFixed(2)}</span></div>
            <div style="color: #888;">Discharge Temp: <span style="color:${physics.dischargeTemperature > 250 ? '#ff3b30' : '#30d158'};">${physics.dischargeTemperature.toFixed(1)} °F</span></div>
            <div style="color: #888;">Heat of Comp: <span style="color:#fff;">${physics.heatOfCompression.toFixed(0)} Btu/h</span></div>
        `;
        
        drawHeatMap('comp-heatmap', comp);
        drawChart('comp-chart', comp);
    }

    // Draws the requested Te vs Tc map with color scaling (intensity = Capacity)
    function drawHeatMap(canvasId, compressor) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        
        let maxQ = 0;
        for(let x=0; x<w; x+=5) {
            for(let y=0; y<h; y+=5) {
                const Te = -10 + (x/w) * 60;
                const Tc = 140 - (y/h) * 70;
                const Q = compressor.getMapPerformance(Te, Tc).Q_map;
                if(Q > maxQ) maxQ = Q;
            }
        }

        for(let x=0; x<w; x+=2) {
            for(let y=0; y<h; y+=2) {
                const Te = -10 + (x/w) * 60;
                const Tc = 140 - (y/h) * 70;
                const intensity = Math.max(0, Math.min(1, compressor.getMapPerformance(Te, Tc).Q_map / (maxQ || 1)));
                // Color interpolates from Dark Blue to Bright Red
                ctx.fillStyle = `rgb(${Math.floor(intensity * 255)}, 0, ${Math.floor((1 - intensity) * 255)})`;
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }

    // (Stub hook to be expanded inside charts.js - drawing a simple visual placeholder)
    function drawChart(canvasId, compressor) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#888';
        ctx.fillText("RPM Scaling Curve (Requires D3 or custom math render)", 10, canvas.height/2);
    }

    // Initial render call
    updateVisuals();
}