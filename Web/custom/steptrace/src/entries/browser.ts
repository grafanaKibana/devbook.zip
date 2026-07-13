import { steptrace } from "../engine"

// Quartz loads this bundle as a classic script. Keep the compatibility global
// at the host boundary instead of leaking it through the shared module graph.
Object.assign(globalThis, { steptrace })
