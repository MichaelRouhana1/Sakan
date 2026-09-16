ALTER TABLE "credit_transactions" ADD COLUMN IF NOT EXISTS "provider_external_id" varchar(32);
ALTER TABLE "credit_transactions" ADD COLUMN IF NOT EXISTS "provider_transaction_id" varchar(64);
ALTER TABLE "credit_transactions" ADD COLUMN IF NOT EXISTS "checkout_url" text;
CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_provider_external_id_uidx"
  ON "credit_transactions" ("provider_external_id")
  WHERE "provider_external_id" IS NOT NULL;
