import { EventEmitter } from "events";

// Global event emitter for POS real-time updates
export const posEventEmitter = new EventEmitter();

// Increase MaxListeners if needed to prevent memory leak warnings on high load
posEventEmitter.setMaxListeners(100);
