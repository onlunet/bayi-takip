# Bayi Portal API

This repository contains the initial backend for a dealer (bayi) portal.
It supports:
- importing WooCommerce orders and mapping to internal products or variants
- company-based stock tracking with stock movements
- company sales reporting by unit (PIECE/KG/LT)
- detailed ledger entries (invoice/payment/adjustment)
- notification preferences and an outbox for email or WhatsApp
- tracking unmapped WooCommerce products separately for analysis
- a lightweight web dashboard served from the API

## Getting started

1. Copy `.env.example` to `.env` and update values.
2. Start Postgres:
   - `docker compose up -d`
3. Install dependencies:
   - `npm install` in `apps/api`
4. Run migrations:
   - `npm run prisma:migrate` in `apps/api`
5. Start the API:
   - `npm run dev` in `apps/api`
6. Open the dashboard:
   - `http://localhost:3000`
7. Start the notification worker (email):
   - `npm run worker:notifications` in `apps/api`

## Notes
- WooCommerce import maps line items by SKU first, then product name.
  Unmatched items are stored in a separate table for analysis.
- Variants are grouped under a parent product and apply a multiplier to stock.
- WhatsApp sending is not wired to a provider yet. The outbox table is ready for a worker.
- Email sending uses SMTP values in `.env`.
