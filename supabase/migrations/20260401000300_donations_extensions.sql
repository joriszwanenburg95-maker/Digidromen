ALTER TABLE public.donation_batches
  ADD COLUMN IF NOT EXISTS pickup_date DATE,
  ADD COLUMN IF NOT EXISTS batch_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shipment_reference TEXT,
  ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS data_wipe_certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS residual_value_eur NUMERIC,
  ADD COLUMN IF NOT EXISTS invoiced BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_notified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thank_you_email_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_laptops INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_mice INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_headsets INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_bags INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_chargers INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_other INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Document kind uitbreiden
DO $$ BEGIN
  ALTER TYPE public.document_kind ADD VALUE IF NOT EXISTS 'data_wipe_certificate';
  ALTER TYPE public.document_kind ADD VALUE IF NOT EXISTS 'connector_photo';
  ALTER TYPE public.document_kind ADD VALUE IF NOT EXISTS 'invoice';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger: vul timestamp velden bij statuswijzigingen donatiebatches
CREATE OR REPLACE FUNCTION public.donation_batches_set_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'OPHAALAFSPRAAK_GEPLAND' AND (OLD.status IS DISTINCT FROM 'OPHAALAFSPRAAK_GEPLAND') AND NEW.pickup_scheduled_at IS NULL THEN
    NEW.pickup_scheduled_at := now();
  END IF;
  IF NEW.status = 'OPGEHAALD' AND (OLD.status IS DISTINCT FROM 'OPGEHAALD') AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := now();
  END IF;
  IF NEW.status = 'RAPPORTAGE_GEREED' AND (OLD.status IS DISTINCT FROM 'RAPPORTAGE_GEREED') AND NEW.processed_at IS NULL THEN
    NEW.processed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_batches_timestamps ON public.donation_batches;
CREATE TRIGGER trg_donation_batches_timestamps
  BEFORE UPDATE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.donation_batches_set_timestamps();

-- Blokkeer OP_VOORRAAD als data_wipe_certificate ontbreekt
CREATE OR REPLACE FUNCTION public.donation_batches_check_certificate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'OP_VOORRAAD' AND (OLD.status IS DISTINCT FROM 'OP_VOORRAAD') THEN
    IF NEW.data_wipe_certificate_url IS NULL THEN
      RAISE EXCEPTION 'data_wipe_certificate_url is verplicht voordat de batch als OP_VOORRAAD kan worden gemarkeerd';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_batches_check_certificate ON public.donation_batches;
CREATE TRIGGER trg_donation_batches_check_certificate
  BEFORE UPDATE ON public.donation_batches
  FOR EACH ROW EXECUTE FUNCTION public.donation_batches_check_certificate();
