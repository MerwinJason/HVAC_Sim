class Store {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = [];
    }

    getState() {
        return structuredClone(this.state);
    }

    setState(partialState) {
        this.state = {
            ...this.state,
            ...partialState
        };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        const currentState = this.getState();
        this.listeners.forEach(listener => listener(currentState));
    }
}

const initialState = {
    system: {
        mode: 'AC',
        refrigerant: 'R410A',
        units: 'IP',
    },
    simulationResults: {
        converged: false,
        totalBtuh: 0,
        seer2: 0,
        hspf2: 0
    }
};

export const appState = new Store(initialState);
