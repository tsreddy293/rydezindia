-- Atomic wallet debit/credit via row-level lock (run in Supabase SQL editor for production)

CREATE OR REPLACE FUNCTION public.wallet_debit_atomic(
  p_user_id UUID,
  p_amount NUMERIC,
  p_source TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Debit amount must be positive';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;

  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  v_new_balance := v_wallet.balance - p_amount;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, source, reference_id, description
  ) VALUES (
    v_wallet.id, p_user_id, 'debit', p_amount, p_source, p_reference_id, p_description
  );

  UPDATE public.wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet.id;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_credit_atomic(
  p_user_id UUID,
  p_amount NUMERIC,
  p_source TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;

  v_new_balance := v_wallet.balance + p_amount;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, source, reference_id, description
  ) VALUES (
    v_wallet.id, p_user_id, 'credit', p_amount, p_source, p_reference_id, p_description
  );

  UPDATE public.wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet.id;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_return_journey_seats(
  p_journey_id UUID,
  p_seats INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  IF p_seats IS NULL OR p_seats < 1 THEN
    RAISE EXCEPTION 'Seats must be at least 1';
  END IF;

  UPDATE public.return_journeys
  SET
    available_seats = available_seats - p_seats,
    status = CASE WHEN available_seats - p_seats <= 0 THEN 'booked' ELSE status END,
    updated_at = NOW()
  WHERE id = p_journey_id
    AND status = 'available'
    AND available_seats >= p_seats
  RETURNING available_seats INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  RETURN v_remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_return_journey_seats(
  p_journey_id UUID,
  p_seats INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  UPDATE public.return_journeys
  SET
    available_seats = available_seats + p_seats,
    status = 'available',
    updated_at = NOW()
  WHERE id = p_journey_id
  RETURNING available_seats INTO v_remaining;

  RETURN COALESCE(v_remaining, 0);
END;
$$;
