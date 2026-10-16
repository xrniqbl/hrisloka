# ---------------------------------------------------------------
# KiniKerja � Supabase Tree-Shaking Guide
# ---------------------------------------------------------------

## Current Bundle: 170KB (supabase-3YfAq9Bl.js)

## Issue
`import { createClient } from '@supabase/supabase-js'` imports entire SDK.
Many features not used: Auth, Storage, Realtime, Functions.

## Solution: Selective Imports
```js
// Current (src/lib/supabase.js)
import { createClient } from '@supabase/supabase-js';

// Optimized (if you only use database + auth)
import { createClient } from '@supabase/supabase-js';
// Supabase doesn't support selective imports yet, but:
// - Ensure unused features are not called
// - Enable tree-shaking in vite.config.js
```

## Vite Config Optimization
Add to vite.config.js build.rollupOptions:
```js
treeshake: {
  moduleSideEffects: false,
  propertyReadSideEffects: false,
  tryCatchDeoptimization: false,
}
```

## Estimated Savings
- Current: 170KB
- Optimized: ~120KB (30% reduction)
- Requires: Supabase SDK v2+ with proper tree-shaking support
