# Stripe API Documentation

Comprehensive reference for Stripe APIs used in this project.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Checkout Sessions](#checkout-sessions)
3. [Customer Portal](#customer-portal)
4. [Subscriptions](#subscriptions)
5. [Webhooks](#webhooks)
6. [Prices](#prices)
7. [Products](#products)
8. [Error Handling](#error-handling)

---

## Authentication

All Stripe API requests require authentication using your API key.

### Headers

```
Authorization: Bearer YOUR_SECRET_KEY
Content-Type: application/json
Stripe-Version: 2025-03-31.basil (or your preferred version)
```

### API Keys

- **Secret Key**: Used for server-side requests (starts with `sk_`)
- **Publishable Key**: Used for client-side requests (starts with `pk_`)

**Security**: Never expose your secret key in client-side code or public repositories.

---

## Checkout Sessions

A Checkout Session represents your customer's session as they pay for one-time purchases or subscriptions through Checkout or Payment Links.

### Endpoints

- `POST /v1/checkout/sessions` - Create a Checkout Session
- `GET /v1/checkout/sessions/:id` - Retrieve a Checkout Session
- `POST /v1/checkout/sessions/:id` - Update a Checkout Session
- `GET /v1/checkout/sessions/:id/line_items` - List line items
- `GET /v1/checkout/sessions` - List all Checkout Sessions
- `POST /v1/checkout/sessions/:id/expire` - Expire a Checkout Session

### Create Checkout Session

**Endpoint**: `POST /v1/checkout/sessions`

#### Required Parameters

| Parameter | Type | Description                                                             |
| --------- | ---- | ----------------------------------------------------------------------- |
| `mode`    | enum | The mode of the Checkout Session: `payment`, `setup`, or `subscription` |

#### Conditionally Required Parameters

| Parameter     | Type   | Condition                                       | Description                               |
| ------------- | ------ | ----------------------------------------------- | ----------------------------------------- |
| `line_items`  | array  | Required for `payment` and `subscription` mode  | List of items the customer is purchasing  |
| `success_url` | string | Required if `ui_mode` is `hosted`               | URL to redirect after successful payment  |
| `return_url`  | string | Required if `ui_mode` is `embedded` or `custom` | URL to redirect back after authentication |
| `currency`    | enum   | Required for certain configurations             | Three-letter ISO currency code            |

#### Optional Parameters

| Parameter                     | Type      | Description                                                       |
| ----------------------------- | --------- | ----------------------------------------------------------------- |
| `customer`                    | string    | ID of an existing Customer                                        |
| `customer_email`              | string    | Customer's email address                                          |
| `client_reference_id`         | string    | Unique string to reference the Checkout Session                   |
| `metadata`                    | object    | Set of key-value pairs for additional information                 |
| `automatic_tax`               | object    | Settings for automatic tax lookup                                 |
| `ui_mode`                     | enum      | UI mode: `hosted`, `embedded`, or `custom` (defaults to `hosted`) |
| `payment_method_types`        | array     | Payment methods to display (e.g., `['card', 'us_bank_account']`)  |
| `allow_promotion_codes`       | boolean   | Whether to allow promotion codes                                  |
| `billing_address_collection`  | enum      | Whether to collect billing address: `auto` or `required`          |
| `cancel_url`                  | string    | URL to redirect if customer cancels                               |
| `payment_intent_data`         | object    | Additional data for PaymentIntent                                 |
| `subscription_data`           | object    | Additional data for Subscription                                  |
| `expires_at`                  | timestamp | When the session expires (30 min to 24 hours)                     |
| `invoice_creation`            | object    | Settings for invoice creation                                     |
| `phone_number_collection`     | object    | Whether to collect phone numbers                                  |
| `shipping_address_collection` | object    | Countries to show for shipping                                    |
| `shipping_options`            | array     | Shipping rate options                                             |
| `custom_fields`               | array     | Custom form fields to collect                                     |
| `custom_text`                 | object    | Custom text to display                                            |
| `discounts`                   | array     | Discounts to apply                                                |
| `optional_items`              | array     | Optional items customers can add                                  |
| `locale`                      | enum      | Language for the Checkout page                                    |
| `payment_method_collection`   | enum      | When to collect payment method: `always` or `if_required`         |
| `customer_creation`           | enum      | When to create customer: `always` or `if_required`                |
| `after_expiration`            | object    | What to do after expiration                                       |
| `consent_collection`          | object    | Settings for consent collection                                   |

#### Line Items Structure

```json
{
  "line_items": [
    {
      "price": "price_1234567890", // Price ID
      "quantity": 1,
      "adjustable_quantity": {
        "enabled": true,
        "minimum": 1,
        "maximum": 10
      }
    }
  ]
}
```

Or using `price_data`:

```json
{
  "line_items": [
    {
      "price_data": {
        "currency": "usd",
        "product_data": {
          "name": "T-shirt",
          "description": "Comfortable cotton t-shirt"
        },
        "unit_amount": 2000, // Amount in cents
        "recurring": {
          "interval": "month"
        }
      },
      "quantity": 1
    }
  ]
}
```

#### Response Object

```json
{
  "id": "cs_test_...",
  "object": "checkout.session",
  "mode": "payment",
  "status": "open",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "customer": "cus_...",
  "payment_intent": "pi_...",
  "payment_status": "unpaid",
  "currency": "usd",
  "amount_total": 2000,
  "expires_at": 1234567890,
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel",
  "metadata": {},
  "client_reference_id": "order_123"
}
```

#### Status Values

- `open` - The checkout session is still in progress
- `complete` - The checkout session is complete
- `expired` - The checkout session has expired

#### Payment Status Values

- `paid` - Payment funds are available
- `unpaid` - Payment funds are not yet available
- `no_payment_required` - Payment is delayed or not required

### Update Checkout Session

**Endpoint**: `POST /v1/checkout/sessions/:id`

#### Parameters

| Parameter               | Type   | Description                     |
| ----------------------- | ------ | ------------------------------- |
| `metadata`              | object | Updated metadata                |
| `shipping_options`      | array  | Updated shipping options        |
| `collected_information` | object | Pre-filled customer information |

### Expire Checkout Session

**Endpoint**: `POST /v1/checkout/sessions/:id/expire`

Expires a Checkout Session when it's in `open` status.

### Checkout Session Lifecycle

1. Customer initiates checkout
2. Server creates Checkout Session
3. Customer redirects to Checkout Session URL
4. Customer completes payment
5. `checkout.session.completed` webhook event fires
6. Customer redirects to success URL

---

## Customer Portal

The Billing customer portal is a Stripe-hosted UI for subscription and billing management.

### Endpoints

- `POST /v1/billing_portal/sessions` - Create a portal session

### Create Portal Session

**Endpoint**: `POST /v1/billing_portal/sessions`

#### Required Parameters

| Parameter  | Type   | Description                |
| ---------- | ------ | -------------------------- |
| `customer` | string | ID of an existing customer |

#### Optional Parameters

| Parameter       | Type   | Description                                      |
| --------------- | ------ | ------------------------------------------------ |
| `configuration` | string | ID of portal configuration to use                |
| `return_url`    | string | URL to redirect when customer clicks return      |
| `locale`        | enum   | Language for the portal (e.g., `en`, `es`, `fr`) |
| `on_behalf_of`  | string | (Connect only) Account to show subscriptions for |
| `flow_data`     | object | Specific flow for customer to go through         |

#### Flow Data Structure

For deep linking to specific portal pages:

```json
{
  "flow_data": {
    "type": "subscription_cancel",
    "subscription_cancel": {
      "subscription": "sub_1234567890"
    }
  }
}
```

Flow types:

- `subscription_cancel`
- `subscription_update`
- `subscription_update_confirm`
- `payment_method_update`

#### Response Object

```json
{
  "id": "bps_...",
  "object": "billing_portal.session",
  "configuration": "bpc_...",
  "created": 1234567890,
  "customer": "cus_...",
  "livemode": false,
  "locale": "en",
  "return_url": "https://example.com/account",
  "url": "https://billing.stripe.com/session/..."
}
```

### Portal Configuration

Configure portal features in Dashboard under Settings > Billing > Customer portal, or via API:

- **Subscription management**: Cancel, pause, resume subscriptions
- **Payment method updates**: Add, remove, update payment methods
- **Invoice history**: View past invoices
- **Tax ID collection**: Manage customer tax IDs

---

## Subscriptions

Subscriptions allow you to charge customers on a recurring basis.

### Endpoints

- `POST /v1/subscriptions` - Create a subscription
- `GET /v1/subscriptions/:id` - Retrieve a subscription
- `POST /v1/subscriptions/:id` - Update a subscription
- `DELETE /v1/subscriptions/:id` - Cancel a subscription
- `GET /v1/subscriptions` - List subscriptions

### Create Subscription

**Endpoint**: `POST /v1/subscriptions`

#### Required Parameters

| Parameter  | Type   | Description                            |
| ---------- | ------ | -------------------------------------- |
| `customer` | string | ID of the customer to subscribe        |
| `items`    | array  | List of subscription items with prices |

#### Optional Parameters

| Parameter                 | Type      | Description                                    |
| ------------------------- | --------- | ---------------------------------------------- |
| `default_payment_method`  | string    | Default payment method for the subscription    |
| `metadata`                | object    | Key-value pairs for additional information     |
| `trial_period_days`       | integer   | Number of trial days                           |
| `billing_cycle_anchor`    | timestamp | When billing cycle starts                      |
| `collection_method`       | enum      | `charge_automatically` or `send_invoice`       |
| `days_until_due`          | integer   | Days until invoice is due (for `send_invoice`) |
| `payment_behavior`        | enum      | `default_incomplete`, `allow_incomplete`, etc. |
| `proration_behavior`      | enum      | `create_prorations`, `none`, `always_invoice`  |
| `cancel_at_period_end`    | boolean   | Cancel subscription at period end              |
| `cancel_at`               | timestamp | Timestamp to cancel subscription               |
| `automatic_tax`           | object    | Automatic tax settings                         |
| `description`             | string    | Description of the subscription                |
| `application_fee_percent` | decimal   | Connect application fee percentage             |
| `coupon`                  | string    | Coupon ID to apply                             |
| `promotion_code`          | string    | Promotion code ID to apply                     |
| `default_tax_rates`       | array     | Tax rates to apply                             |
| `trial_end`               | timestamp | End of trial period                            |
| `trial_settings`          | object    | Trial settings                                 |
| `payment_settings`        | object    | Payment settings                               |
| `transfer_data`           | object    | Connect transfer data                          |
| `billing_thresholds`      | object    | Billing thresholds                             |

#### Subscription Items Structure

```json
{
  "items": [
    {
      "price": "price_1234567890",
      "quantity": 1,
      "metadata": {},
      "tax_rates": []
    }
  ]
}
```

### Update Subscription

**Endpoint**: `POST /v1/subscriptions/:id`

Common update operations:

- Change price/quantity
- Add/remove items
- Update payment method
- Apply coupons
- Modify billing cycle
- Update metadata

#### Parameters

Same as create, with proration handling:

| Parameter            | Type      | Description                                                             |
| -------------------- | --------- | ----------------------------------------------------------------------- |
| `proration_behavior` | enum      | How to handle prorations: `create_prorations`, `none`, `always_invoice` |
| `proration_date`     | timestamp | Date to calculate prorations from                                       |

### Cancel Subscription

**Endpoint**: `DELETE /v1/subscriptions/:id`

#### Parameters

| Parameter              | Type    | Description                          |
| ---------------------- | ------- | ------------------------------------ |
| `invoice_now`          | boolean | Create invoice immediately           |
| `prorate`              | boolean | Prorate the cancellation             |
| `cancellation_details` | object  | Reason and feedback for cancellation |

Or set `cancel_at_period_end` to `true` to cancel at period end.

### Subscription Object

```json
{
  "id": "sub_...",
  "object": "subscription",
  "status": "active",
  "customer": "cus_...",
  "current_period_start": 1234567890,
  "current_period_end": 1234567890,
  "items": {
    "data": [
      {
        "id": "si_...",
        "price": {...},
        "quantity": 1
      }
    ]
  },
  "default_payment_method": "pm_...",
  "cancel_at_period_end": false,
  "canceled_at": null,
  "trial_start": null,
  "trial_end": null,
  "metadata": {}
}
```

#### Status Values

- `incomplete` - First payment pending
- `incomplete_expired` - First payment failed
- `trialing` - In trial period
- `active` - Active subscription
- `past_due` - Payment failed, retrying
- `canceled` - Subscription canceled
- `unpaid` - Payment permanently failed
- `paused` - Subscription paused

---

## Webhooks

Stripe sends webhook events to notify your application of events in your account.

### Setup

1. Create webhook endpoint handler
2. Register endpoint URL in Stripe Dashboard
3. Verify webhook signatures
4. Handle events

### Webhook Endpoint Registration

**Dashboard**: Settings > Developers > Webhooks
**API**: Use Event Destinations API v2

### Event Structure

```json
{
  "id": "evt_...",
  "object": "event",
  "api_version": "2025-03-31",
  "created": 1234567890,
  "data": {
    "object": {...}  // The object that triggered the event
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_...",
    "idempotency_key": "..."
  },
  "type": "checkout.session.completed"
}
```

### Event Types

#### Checkout Events

| Event                                      | Description                             |
| ------------------------------------------ | --------------------------------------- |
| `checkout.session.completed`               | Checkout session completed successfully |
| `checkout.session.async_payment_succeeded` | Async payment succeeded                 |
| `checkout.session.async_payment_failed`    | Async payment failed                    |
| `checkout.session.expired`                 | Checkout session expired                |

#### Customer Events

| Event                                  | Description          |
| -------------------------------------- | -------------------- |
| `customer.created`                     | Customer created     |
| `customer.updated`                     | Customer updated     |
| `customer.deleted`                     | Customer deleted     |
| `customer.subscription.created`        | Subscription created |
| `customer.subscription.updated`        | Subscription updated |
| `customer.subscription.deleted`        | Subscription deleted |
| `customer.subscription.trial_will_end` | Trial ending soon    |

#### Payment Events

| Event                           | Description             |
| ------------------------------- | ----------------------- |
| `payment_intent.succeeded`      | Payment succeeded       |
| `payment_intent.payment_failed` | Payment failed          |
| `payment_intent.canceled`       | Payment intent canceled |
| `payment_intent.created`        | Payment intent created  |
| `payment_method.attached`       | Payment method attached |
| `payment_method.detached`       | Payment method detached |

#### Invoice Events

| Event                       | Description               |
| --------------------------- | ------------------------- |
| `invoice.created`           | Invoice created           |
| `invoice.finalized`         | Invoice finalized         |
| `invoice.paid`              | Invoice paid              |
| `invoice.payment_failed`    | Invoice payment failed    |
| `invoice.payment_succeeded` | Invoice payment succeeded |
| `invoice.updated`           | Invoice updated           |

#### Customer Portal Events

| Event                                  | Description            |
| -------------------------------------- | ---------------------- |
| `billing_portal.configuration.created` | Configuration created  |
| `billing_portal.configuration.updated` | Configuration updated  |
| `billing_portal.session.created`       | Portal session created |

### Webhook Signature Verification

Stripe signs webhooks with a signature in the `Stripe-Signature` header.

#### Verification Process

1. Extract timestamp and signature from header
2. Prepare signed payload
3. Compute expected signature
4. Compare signatures

#### Example (Node.js)

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Fulfill the order
      break;
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      // Update subscription access
      break;
    // ... handle other events
  }

  res.json({ received: true });
});
```

#### Signature Header Format

```
t=1234567890,v1=signature1,v1=signature2
```

- `t` - Timestamp when event was sent
- `v1` - Signature(s) computed with current secret

### Best Practices

1. **Return 2xx quickly**: Don't perform long operations in webhook handler
2. **Verify signatures**: Always verify webhook signatures
3. **Handle duplicates**: Use event ID to prevent duplicate processing
4. **Handle retries**: Stripe retries failed webhooks up to 3 days
5. **Use specific events**: Only listen to events you need
6. **Use HTTPS**: Required for live mode
7. **Check event ordering**: Events may arrive out of order
8. **Implement idempotency**: Handle same event multiple times safely

### Webhook Retry Behavior

- **Live mode**: Up to 3 days with exponential backoff
- **Test mode**: 3 retries over a few hours

### Testing Webhooks

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/webhook
stripe trigger checkout.session.completed
```

---

## Prices

Prices define the unit cost, currency, and billing cycle for products.

### Endpoints

- `POST /v1/prices` - Create a price
- `GET /v1/prices/:id` - Retrieve a price
- `POST /v1/prices/:id` - Update a price
- `GET /v1/prices` - List prices

### Create Price

**Endpoint**: `POST /v1/prices`

#### Required Parameters

| Parameter  | Type   | Description                    |
| ---------- | ------ | ------------------------------ |
| `currency` | string | Three-letter ISO currency code |

One of:

- `unit_amount` - Amount in cents
- `unit_amount_decimal` - Precise amount for decimal currencies
- `custom_unit_amount` - Customer chooses amount

#### Optional Parameters

| Parameter            | Type    | Description                                                    |
| -------------------- | ------- | -------------------------------------------------------------- |
| `product`            | string  | ID of product this price is for                                |
| `product_data`       | object  | Create product inline                                          |
| `recurring`          | object  | Recurring billing configuration                                |
| `metadata`           | object  | Key-value pairs                                                |
| `nickname`           | string  | Brief description                                              |
| `active`             | boolean | Whether price is active (default: true)                        |
| `billing_scheme`     | enum    | `per_unit` or `tiered`                                         |
| `lookup_key`         | string  | Unique key for price lookup                                    |
| `tiers`              | array   | Tiers for tiered pricing                                       |
| `tiers_mode`         | enum    | `graduated` or `volume`                                        |
| `transform_quantity` | object  | Apply transformation to quantity                               |
| `tax_behavior`       | enum    | How tax is calculated: `inclusive`, `exclusive`, `unspecified` |
| `currency_options`   | object  | Prices in other currencies                                     |

#### Recurring Structure

```json
{
  "recurring": {
    "interval": "month", // day, week, month, year
    "interval_count": 1,
    "usage_type": "licensed", // licensed or metered
    "aggregate_usage": "sum", // For metered billing
    "trial_period_days": 14
  }
}
```

#### Price Object

```json
{
  "id": "price_...",
  "object": "price",
  "active": true,
  "currency": "usd",
  "unit_amount": 2000,
  "recurring": {
    "interval": "month",
    "interval_count": 1
  },
  "product": "prod_...",
  "type": "recurring",
  "nickname": "Premium Plan",
  "metadata": {}
}
```

### Update Price

**Endpoint**: `POST /v1/prices/:id`

#### Updatable Fields

- `active`
- `metadata`
- `nickname`
- `lookup_key`
- `tax_behavior`
- `currency_options`

**Note**: Cannot update `unit_amount` or `currency` after creation.

---

## Products

Products describe the specific goods or services you offer.

### Endpoints

- `POST /v1/products` - Create a product
- `GET /v1/products/:id` - Retrieve a product
- `POST /v1/products/:id` - Update a product
- `DELETE /v1/products/:id` - Delete a product
- `GET /v1/products` - List products

### Create Product

**Endpoint**: `POST /v1/products`

#### Required Parameters

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `name`    | string | Product name |

#### Optional Parameters

| Parameter              | Type    | Description                               |
| ---------------------- | ------- | ----------------------------------------- |
| `description`          | string  | Product description                       |
| `metadata`             | object  | Key-value pairs                           |
| `active`               | boolean | Whether product is active (default: true) |
| `default_price_data`   | object  | Create default price inline               |
| `images`               | array   | List of image URLs                        |
| `url`                  | string  | Product page URL                          |
| `statement_descriptor` | string  | Statement descriptor                      |
| `tax_code`             | string  | Tax code for product                      |
| `unit_label`           | string  | Unit label (e.g., "seat", "GB")           |
| `shippable`            | boolean | Whether product is shippable              |
| `package_dimensions`   | object  | Package dimensions for shipping           |

#### Product Object

```json
{
  "id": "prod_...",
  "object": "product",
  "name": "Premium Subscription",
  "description": "Access to all premium features",
  "active": true,
  "default_price": "price_...",
  "images": [],
  "metadata": {},
  "type": "service"
}
```

### Update Product

**Endpoint**: `POST /v1/products/:id`

All fields except `id` can be updated.

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "type": "card_error",
    "code": "card_declined",
    "message": "Your card was declined.",
    "param": "card",
    "charge": "ch_..."
  }
}
```

### Error Types

| Type                    | Description                  |
| ----------------------- | ---------------------------- |
| `api_error`             | API errors (Stripe issue)    |
| `card_error`            | Card errors (customer issue) |
| `invalid_request_error` | Invalid parameters           |
| `authentication_error`  | Authentication failed        |
| `rate_limit_error`      | Too many requests            |
| `idempotency_error`     | Idempotency key reused       |

### Common Error Codes

| Code                      | Description                 |
| ------------------------- | --------------------------- |
| `card_declined`           | Card was declined           |
| `expired_card`            | Card has expired            |
| `incorrect_cvc`           | CVC is incorrect            |
| `processing_error`        | Processing error            |
| `incorrect_number`        | Card number is incorrect    |
| `invalid_expiry_month`    | Expiry month is invalid     |
| `invalid_expiry_year`     | Expiry year is invalid      |
| `resource_missing`        | Resource doesn't exist      |
| `parameter_invalid_empty` | Required parameter is empty |
| `parameter_unknown`       | Unknown parameter           |

### HTTP Status Codes

| Code               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| 200                | OK - Request succeeded                               |
| 400                | Bad Request - Invalid parameters                     |
| 401                | Unauthorized - Invalid API key                       |
| 402                | Request Failed - Parameters valid but request failed |
| 403                | Forbidden - No permission                            |
| 404                | Not Found - Resource doesn't exist                   |
| 429                | Too Many Requests - Rate limited                     |
| 500, 502, 503, 504 | Server Errors - Stripe issue                         |

### Error Handling Best Practices

1. **Catch errors gracefully**: Handle all error types
2. **Log errors**: Track errors for debugging
3. **Show user-friendly messages**: Don't expose technical details
4. **Retry logic**: Implement exponential backoff for retries
5. **Idempotency**: Use idempotency keys for POST requests
6. **Rate limiting**: Respect rate limits (100 reads/sec, 100 writes/sec)

---

## Additional Resources

- [Stripe API Reference](https://docs.stripe.com/api)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Testing](https://docs.stripe.com/testing)
- [Stripe CLI](https://docs.stripe.com/stripe-cli)
- [Stripe SDKs](https://docs.stripe.com/sdks)

### Test Cards

```
4242 4242 4242 4242 - Visa (success)
4000 0000 0000 0002 - Visa (card declined)
4000 0025 0000 3155 - Visa (requires authentication)
```

---

_Last Updated: 2025-10-23_
_API Version: 2025-03-31.basil_
