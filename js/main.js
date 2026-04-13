import { appState } from './state.js';
import * as Ref from './Physics/refrigerant.js';
import * as Psychro from './Physics/psychrometrics.js';
import { initCompressorLab } from './ui/panels.js';

class SimulatorApp {
    constructor() {
        this.physicsReady = true; 
        this.init();
    }

    init() {
        console.log("HVAC Simulator PRO Initializing...");
        
        // Run physics component tests
        Ref.runTests();
        Psychro.runTests();
        
        this.initCanvas();
        window.addEventListener('resize', () => this.initCanvas());

        // Initialize the Compressor UI panel
        initCompressorLab('compressor-tab');

        appState.subscribe((newState) => {
            this.runSimulationLoop(newState);
            this.updateUI(newState);
        });

        this.bindEvents();
        appState.notify(); 
    }
    
    initCanvas() {
        const canvas = document.getElementById('system-canvas');
        if (!canvas) return;
        const parent = canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }

    bindEvents() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                const targetId = e.target.getAttribute('data-target');
                const contentPanel = document.getElementById(`${targetId}-tab`);
                if (contentPanel) contentPanel.classList.add('active');
            });
        });
    }

    runSimulationLoop(state) {
        if (!this.physicsReady) return; 
        const start = performance.now();
        // Future Phase 12 logic goes here
        const end = performance.now();
        if ((end - start) > 50) {
            console.warn(`Simulation loop exceeded 50ms: ${(end - start).toFixed(2)}ms`);
        }
    }

    updateUI(state) {
        document.getElementById('disp-btuh').innerText = state.simulationResults.totalBtuh.toLocaleString();
        document.getElementById('disp-seer2').innerText = state.simulationResults.seer2.toFixed(1);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SimulatorApp();
});
