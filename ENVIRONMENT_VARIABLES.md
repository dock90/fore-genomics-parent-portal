# Environment Variables

## Test Mode Configuration

### `NEXT_PUBLIC_TEST_MODE`

Controls whether testing features are enabled in the application.

**Values:**
- `'true'` - Enables test features (reset buttons, [TEST] email prefixes)
- `'false'` or unset - Disables test features (production mode)

**Usage:**
```bash
# For staging/testing environments
NEXT_PUBLIC_TEST_MODE=true

# For production (or omit entirely)
NEXT_PUBLIC_TEST_MODE=false
```

**Features controlled by this variable:**
1. **Reset Buttons** - Shows "Delete All Data & Sign Out" buttons on dashboards
2. **Email Prefixes** - Adds "[TEST]" prefix to all email subjects

**Example email subjects:**
- Test mode: `[TEST] New Onboarding Completed - John Doe (ORD-123)`
- Production: `New Onboarding Completed - John Doe (ORD-123)`

**Security Note:** This variable is prefixed with `NEXT_PUBLIC_` so it's available in the browser. Only use `true` in staging/testing environments, never in production. 