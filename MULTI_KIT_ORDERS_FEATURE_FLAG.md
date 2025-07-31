# Multi-Kit Orders Feature Flag

The multi-kit orders feature is controlled by a feature flag to allow easy enabling/disabling of the ability to create orders with multiple test kits.

## How to Enable/Disable Multi-Kit Orders

### To Disable Multi-Kit Orders (Single Kit Only)
Add this to your `.env.local` file:
```bash
NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=false
```

### To Enable Multi-Kit Orders
Add this to your `.env.local` file:
```bash
NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=true
```

## What Gets Restricted When Disabled

When `NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=false`:

1. **Kit Count Selection** - The dropdown is disabled and only shows "1 Kit"
2. **Kit Type Selection** - Only shows one kit type selector (for the single kit)
3. **Form Validation** - Enforces that only single kit orders can be created
4. **User Interface** - Shows a helpful message explaining the restriction

## What Still Works When Disabled

- All other order creation functionality
- Single kit order creation with any kit type (BASE, PLUS, PREMIUM)
- User selection (existing or new users)
- Notes and other order details
- All existing order management features

## What's Available When Enabled

When `NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=true`:

1. **Multiple Kit Selection** - Admins can select 1-10 kits per order
2. **Individual Kit Type Selection** - Each kit can have its own type
3. **Flexible Order Creation** - Full multi-kit order functionality

## Environment Variables

```bash
# Feature flag (required)
NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=false

# Default state: false (single kit only)
# Set to true to enable multi-kit orders
```

## Testing

To test the disabled state:
1. Set `NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=false`
2. Restart your development server
3. Navigate to Admin → Orders → Create Order
4. Verify that only single kit selection is available

To test the enabled state:
1. Set `NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=true`
2. Restart your development server
3. Navigate to Admin → Orders → Create Order
4. Verify that multiple kit selection is available

## Implementation Details

The feature flag is implemented in:
- `src/lib/feature-flags.ts` - Feature flag configuration
- `src/app/admin/orders/CreateOrderModal.tsx` - UI and validation logic

The flag controls:
- Kit count dropdown options
- Form validation rules
- UI state and messaging 