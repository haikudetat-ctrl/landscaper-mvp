-- Seed a sizeable, realistic operational dataset for MVP clickthrough testing.
-- This migration is intentionally additive and tagged so it can be identified later.

DO $$
DECLARE
  v_seed_tag text := '[seed:2026-04-24-large-ops]';
  v_client_count int := 46;
  v_window_start date := current_date - 120;
  v_window_end date := current_date + 60;

  v_client_idx int;
  v_property_idx int;
  v_property_count int;

  v_client_id uuid;
  v_property_id uuid;
  v_plan_id uuid;
  v_invoice_id uuid;

  v_full_name text;
  v_email text;
  v_phone text;
  v_city text;
  v_state text;
  v_street text;
  v_postal_code text;

  v_frequency text;
  v_plan_status text;
  v_day_of_week int;
  v_interval_count int;
  v_start_date date;
  v_end_date date;
  v_price numeric(12, 2);
  v_service_type_id uuid;
  v_due_days int;

  v_service_type_ids uuid[];
  v_service_type_count int;

  rec record;

  v_first_names text[] := ARRAY[
    'Alex','Jordan','Taylor','Casey','Morgan','Avery','Parker','Riley','Drew','Quinn',
    'Cameron','Reese','Hayden','Bailey','Rowan','Emerson','Sawyer','Finley','Logan','Harper'
  ];
  v_last_names text[] := ARRAY[
    'Carter','Sullivan','Bennett','Hughes','Miller','Parker','Bailey','Hayes','Diaz','Reed',
    'Turner','Watson','Fisher','Murphy','Foster','Bishop','Barnes','Wheeler','Porter','Harvey'
  ];
  v_street_names text[] := ARRAY[
    'Fairview Ave','Ascher Rd','Browning Ln','Lancaster Dr','Briar Ct','Maple St','Hillcrest Ave',
    'Chestnut Dr','Valley View Rd','Magnolia Way','Oak Ridge Dr','Willow Run','Cedar Ave','Parkside Ln'
  ];
  v_cities text[] := ARRAY[
    'Sewell','Washington Township','Blackwood','Pitman','Glassboro','Deptford','Mantua','Wenonah','Woodbury'
  ];
  v_states text[] := ARRAY['NJ','NJ','NJ','NJ','PA'];
  v_payment_methods text[] := ARRAY['venmo','cash','check','other'];
BEGIN
  -- Guard so accidental re-application does not duplicate demo data.
  IF EXISTS (
    SELECT 1
    FROM public.clients
    WHERE billing_notes ILIKE '%' || v_seed_tag || '%'
    LIMIT 1
  ) THEN
    RAISE NOTICE 'Large ops seed already present. Skipping migration.';
    RETURN;
  END IF;

  -- Ensure there are service types to reference.
  IF NOT EXISTS (SELECT 1 FROM public.service_types WHERE is_active = true) THEN
    INSERT INTO public.service_types (
      code,
      label,
      is_active,
      is_recurring_capable,
      is_seasonal
    )
    SELECT * FROM (
      VALUES
        ('mowing', 'Mowing', true, true, true),
        ('cleanup', 'Cleanup', true, true, true),
        ('mulch', 'Mulch Refresh', true, false, true),
        ('leaf', 'Leaf Removal', true, true, true)
    ) AS seed_types(code, label, is_active, is_recurring_capable, is_seasonal)
    WHERE NOT EXISTS (SELECT 1 FROM public.service_types);
  END IF;

  SELECT array_agg(id ORDER BY label), count(*)
  INTO v_service_type_ids, v_service_type_count
  FROM public.service_types
  WHERE is_active = true;

  IF v_service_type_count = 0 THEN
    RAISE EXCEPTION 'No active service types available; cannot create seeded plans.';
  END IF;

  CREATE TEMP TABLE tmp_seed_clients (
    client_id uuid PRIMARY KEY,
    client_idx int NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE tmp_seed_properties (
    property_id uuid PRIMARY KEY,
    client_id uuid NOT NULL,
    client_idx int NOT NULL,
    property_idx int NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE tmp_seed_plans (
    plan_id uuid PRIMARY KEY,
    property_id uuid NOT NULL,
    client_id uuid NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE tmp_seed_visits (
    seq bigserial PRIMARY KEY,
    visit_id uuid UNIQUE NOT NULL,
    plan_id uuid NOT NULL,
    property_id uuid NOT NULL,
    client_id uuid NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE tmp_seed_invoices (
    seq bigserial PRIMARY KEY,
    invoice_id uuid UNIQUE NOT NULL,
    visit_id uuid NOT NULL,
    property_id uuid NOT NULL,
    client_id uuid NOT NULL
  ) ON COMMIT DROP;

  FOR v_client_idx IN 1..v_client_count LOOP
    v_full_name := format(
      '%s %s %s',
      v_first_names[((v_client_idx - 1) % cardinality(v_first_names)) + 1],
      v_last_names[((v_client_idx - 1) % cardinality(v_last_names)) + 1],
      lpad(v_client_idx::text, 2, '0')
    );
    v_email := format('ops-seed-%s@landscaper-mvp.local', lpad(v_client_idx::text, 3, '0'));
    v_phone := format(
      '609-5%02s-%04s',
      (10 + (v_client_idx % 80))::text,
      (1000 + ((v_client_idx * 97) % 9000))::text
    );

    INSERT INTO public.clients (
      full_name,
      primary_email,
      primary_phone,
      payment_method_preference,
      billing_notes,
      cash_collection_notes,
      check_payable_to,
      venmo_handle,
      is_active
    )
    VALUES (
      v_full_name,
      v_email,
      v_phone,
      v_payment_methods[((v_client_idx - 1) % cardinality(v_payment_methods)) + 1],
      'Seeded account for workflow testing ' || v_seed_tag,
      CASE WHEN v_client_idx % 5 = 0 THEN 'Prefers porch envelope pickup.' ELSE NULL END,
      CASE WHEN v_client_idx % 4 = 0 THEN '2Stack Landscaping LLC' ELSE NULL END,
      CASE WHEN v_client_idx % 3 = 0 THEN format('@opsseed%s', lpad(v_client_idx::text, 2, '0')) ELSE NULL END,
      true
    )
    RETURNING id INTO v_client_id;

    INSERT INTO tmp_seed_clients (client_id, client_idx) VALUES (v_client_id, v_client_idx);

    v_property_count := CASE WHEN mod(v_client_idx, 4) = 0 THEN 2 ELSE 1 END;

    FOR v_property_idx IN 1..v_property_count LOOP
      v_city := v_cities[((v_client_idx + v_property_idx - 2) % cardinality(v_cities)) + 1];
      v_state := v_states[((v_client_idx + v_property_idx - 2) % cardinality(v_states)) + 1];
      v_street := format(
        '%s %s',
        (120 + (v_client_idx * 7) + (v_property_idx * 11))::text,
        v_street_names[((v_client_idx + v_property_idx - 2) % cardinality(v_street_names)) + 1]
      );
      v_postal_code := lpad((8000 + ((v_client_idx * 37 + v_property_idx * 19) % 1990))::text, 5, '0');

      INSERT INTO public.properties (
        client_id,
        street_1,
        city,
        state,
        postal_code,
        property_name,
        service_notes,
        access_notes,
        gate_notes,
        is_active
      )
      VALUES (
        v_client_id,
        v_street,
        v_city,
        v_state,
        v_postal_code,
        CASE WHEN v_property_idx = 2 THEN 'Second Property' ELSE NULL END,
        'Standard mow/edge/blow service. ' || v_seed_tag,
        CASE WHEN mod(v_client_idx + v_property_idx, 6) = 0 THEN 'Watch sprinkler heads near front curb.' ELSE NULL END,
        CASE WHEN mod(v_client_idx + v_property_idx, 7) = 0 THEN 'Side gate code #24' ELSE NULL END,
        true
      )
      RETURNING id INTO v_property_id;

      INSERT INTO tmp_seed_properties (property_id, client_id, client_idx, property_idx)
      VALUES (v_property_id, v_client_id, v_client_idx, v_property_idx);

      v_day_of_week := ((v_client_idx + v_property_idx) % 5) + 1;
      v_frequency := CASE mod(v_client_idx + v_property_idx, 5)
        WHEN 0 THEN 'weekly'
        WHEN 1 THEN 'biweekly'
        WHEN 2 THEN 'custom_interval'
        WHEN 3 THEN 'seasonal'
        ELSE 'one_time'
      END;
      v_interval_count := CASE WHEN v_frequency = 'custom_interval' THEN 21 ELSE NULL END;

      v_plan_status := CASE
        WHEN mod(v_client_idx, 17) = 0 AND v_property_idx = 2 THEN 'inactive'
        WHEN mod(v_client_idx, 11) = 0 THEN 'paused'
        ELSE 'active'
      END;

      v_start_date := CASE
        WHEN v_frequency = 'one_time'
          THEN current_date + ((v_client_idx + v_property_idx) % 40) - 20
        ELSE current_date - (45 + ((v_client_idx * 2 + v_property_idx * 3) % 60))
      END;
      v_end_date := CASE WHEN v_frequency = 'one_time' THEN v_start_date ELSE NULL END;
      v_price := ROUND((38 + ((v_client_idx * 9 + v_property_idx * 13) % 92))::numeric, 2);
      v_service_type_id := v_service_type_ids[((v_client_idx + v_property_idx - 2) % v_service_type_count) + 1];

      INSERT INTO public.service_plans (
        property_id,
        service_type_id,
        plan_name,
        frequency_type,
        day_of_week,
        interval_count,
        start_date,
        end_date,
        quoted_price,
        status,
        auto_generate_visits,
        billing_mode,
        notes,
        season_start_month,
        season_end_month
      )
      VALUES (
        v_property_id,
        v_service_type_id,
        format('Ops Plan %s-%s', v_client_idx, v_property_idx),
        v_frequency,
        CASE WHEN v_frequency IN ('weekly', 'biweekly', 'seasonal') THEN v_day_of_week ELSE NULL END,
        v_interval_count,
        v_start_date,
        v_end_date,
        v_price,
        v_plan_status,
        true,
        'per_visit',
        'Generated for clickthrough testing ' || v_seed_tag,
        CASE WHEN v_frequency = 'seasonal' THEN 3 ELSE NULL END,
        CASE WHEN v_frequency = 'seasonal' THEN 11 ELSE NULL END
      )
      RETURNING id INTO v_plan_id;

      INSERT INTO tmp_seed_plans (plan_id, property_id, client_id)
      VALUES (v_plan_id, v_property_id, v_client_id);

      IF v_plan_status <> 'inactive' THEN
        PERFORM public.generate_service_visits_for_plan(v_plan_id, v_window_start, v_window_end);

        INSERT INTO tmp_seed_visits (visit_id, plan_id, property_id, client_id)
        SELECT sv.id, v_plan_id, v_property_id, v_client_id
        FROM public.service_visits sv
        WHERE sv.service_plan_id = v_plan_id
          AND sv.scheduled_date BETWEEN v_window_start AND v_window_end
        ON CONFLICT (visit_id) DO NOTHING;

        -- Skipped visits requiring operational attention.
        UPDATE public.service_visits sv
        SET
          status = 'skipped',
          skip_reason = 'Access blocked - gate locked',
          operator_notes = 'Owner follow-up required. ' || v_seed_tag,
          reactivation_required = true,
          completion_timestamp = NULL,
          completion_notes = NULL
        WHERE sv.service_plan_id = v_plan_id
          AND sv.scheduled_date < current_date
          AND sv.scheduled_date >= current_date - 70
          AND sv.status = 'scheduled'
          AND mod((extract(doy FROM sv.scheduled_date)::int + v_client_idx + v_property_idx), 13) = 0;

        UPDATE public.service_visits sv
        SET
          status = 'pending_reactivation',
          operator_notes = coalesce(sv.operator_notes, '') || ' Pending reactivation queue.'
        WHERE sv.service_plan_id = v_plan_id
          AND sv.status = 'skipped'
          AND mod((extract(day FROM sv.scheduled_date)::int + v_client_idx), 5) = 0;

        -- Completed history.
        UPDATE public.service_visits sv
        SET
          status = 'completed',
          completion_timestamp = (
            sv.scheduled_date::timestamp
            + interval '10 hours'
            + make_interval(mins => ((v_client_idx + v_property_idx) % 45))
          ),
          completion_notes = 'Completed by owner-operator. ' || v_seed_tag,
          skip_reason = NULL,
          reactivation_required = false
        WHERE sv.service_plan_id = v_plan_id
          AND sv.scheduled_date < current_date
          AND sv.status = 'scheduled';

        -- Some reschedules and cancellations for operational realism.
        UPDATE public.service_visits sv
        SET
          status = 'rescheduled',
          operator_notes = 'Rescheduled due to weather/staff balance. ' || v_seed_tag
        WHERE sv.service_plan_id = v_plan_id
          AND sv.scheduled_date BETWEEN current_date AND current_date + 14
          AND sv.status = 'scheduled'
          AND mod((extract(day FROM sv.scheduled_date)::int + v_client_idx), 17) = 0;

        UPDATE public.service_visits sv
        SET
          status = 'canceled',
          operator_notes = 'Customer requested cancellation. ' || v_seed_tag
        WHERE sv.service_plan_id = v_plan_id
          AND sv.scheduled_date > current_date
          AND sv.status = 'scheduled'
          AND mod((extract(doy FROM sv.scheduled_date)::int + v_client_idx), 29) = 0;

        -- Create invoices for a large subset of completed visits.
        FOR rec IN
          SELECT sv.id AS visit_id
          FROM public.service_visits sv
          WHERE sv.service_plan_id = v_plan_id
            AND sv.status = 'completed'
            AND sv.scheduled_date <= current_date - 10
            AND NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.service_visit_id = sv.id)
            AND mod((extract(day FROM sv.scheduled_date)::int + v_client_idx + v_property_idx), 3) <> 0
          ORDER BY sv.scheduled_date DESC
          LIMIT 18
        LOOP
          v_due_days := CASE mod(v_client_idx + v_property_idx, 4)
            WHEN 0 THEN 120
            WHEN 1 THEN 135
            WHEN 2 THEN 150
            ELSE 180
          END;

          v_invoice_id := public.create_invoice_for_visit(rec.visit_id, v_due_days)::uuid;

          INSERT INTO tmp_seed_invoices (invoice_id, visit_id, property_id, client_id)
          VALUES (v_invoice_id, rec.visit_id, v_property_id, v_client_id)
          ON CONFLICT (invoice_id) DO NOTHING;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  -- Full payments on ~60% of seeded invoices.
  INSERT INTO public.payments (
    invoice_id,
    payment_date,
    payment_method,
    amount,
    reference_note
  )
  SELECT
    tsi.invoice_id,
    LEAST(current_date, i.due_date + ((tsi.seq % 4)::int - 1)),
    (ARRAY['venmo','cash','check','other'])[((tsi.seq % 4)::int) + 1],
    i.amount_due,
    'Auto-seeded full payment ' || v_seed_tag
  FROM tmp_seed_invoices tsi
  JOIN public.invoices i ON i.id = tsi.invoice_id
  WHERE mod(tsi.seq, 5) IN (0, 1, 2);

  -- Partial payments on ~20% of seeded invoices.
  INSERT INTO public.payments (
    invoice_id,
    payment_date,
    payment_method,
    amount,
    reference_note
  )
  SELECT
    tsi.invoice_id,
    LEAST(current_date, i.due_date - 2),
    (ARRAY['venmo','cash','check','other'])[((tsi.seq + 1) % 4)::int + 1],
    ROUND((i.amount_due * 0.45)::numeric, 2),
    'Auto-seeded partial payment ' || v_seed_tag
  FROM tmp_seed_invoices tsi
  JOIN public.invoices i ON i.id = tsi.invoice_id
  WHERE mod(tsi.seq, 5) = 3;

  -- Push partial and unpaid invoices into overdue territory.
  -- Keep invoice_date <= due_date to satisfy invoice check constraints.
  UPDATE public.invoices i
  SET
    invoice_date = current_date - (45 + (tsi.seq % 75))::int,
    due_date = current_date - (8 + (tsi.seq % 35))::int
  FROM tmp_seed_invoices tsi
  WHERE i.id = tsi.invoice_id
    AND mod(tsi.seq, 5) IN (3, 4);

  -- Refresh invoice status after payment/due-date changes.
  FOR rec IN SELECT invoice_id FROM tmp_seed_invoices LOOP
    PERFORM public.refresh_invoice_status(rec.invoice_id);
  END LOOP;

  -- Communication history: invoice sent logs.
  INSERT INTO public.communication_log (
    channel,
    message_type,
    recipient,
    status,
    client_id,
    property_id,
    service_visit_id,
    invoice_id,
    subject,
    sent_at
  )
  SELECT
    'email',
    'invoice_request',
    coalesce(c.primary_email, c.primary_phone, 'seed-recipient@local.test'),
    'sent',
    tsi.client_id,
    tsi.property_id,
    tsi.visit_id,
    tsi.invoice_id,
    'Invoice #' || i.invoice_number || ' created',
    i.invoice_date::timestamp + interval '8 hours'
  FROM tmp_seed_invoices tsi
  JOIN public.invoices i ON i.id = tsi.invoice_id
  LEFT JOIN public.clients c ON c.id = tsi.client_id;

  -- Communication history: overdue reminders.
  INSERT INTO public.communication_log (
    channel,
    message_type,
    recipient,
    status,
    client_id,
    property_id,
    service_visit_id,
    invoice_id,
    subject,
    sent_at
  )
  SELECT
    'sms',
    'invoice_request',
    coalesce(c.primary_phone, c.primary_email, 'seed-recipient@local.test'),
    'sent',
    tsi.client_id,
    tsi.property_id,
    tsi.visit_id,
    tsi.invoice_id,
    'Overdue invoice follow-up',
    now() - make_interval(days => (tsi.seq % 6)::int)
  FROM tmp_seed_invoices tsi
  JOIN public.invoices i ON i.id = tsi.invoice_id
  LEFT JOIN public.clients c ON c.id = tsi.client_id
  WHERE i.status = 'overdue'
    AND mod(tsi.seq, 2) = 0;

  -- Communication history: upcoming visit reminders.
  INSERT INTO public.communication_log (
    channel,
    message_type,
    recipient,
    status,
    client_id,
    property_id,
    service_visit_id,
    subject,
    sent_at
  )
  SELECT
    'sms',
    'service_reminder',
    coalesce(c.primary_phone, c.primary_email, 'seed-recipient@local.test'),
    'sent',
    tsv.client_id,
    tsv.property_id,
    tsv.visit_id,
    'Upcoming visit reminder',
    sv.scheduled_date::timestamp - interval '1 day' + interval '6 hours'
  FROM tmp_seed_visits tsv
  JOIN public.service_visits sv ON sv.id = tsv.visit_id
  LEFT JOIN public.clients c ON c.id = tsv.client_id
  WHERE sv.scheduled_date BETWEEN current_date AND current_date + 14
    AND sv.status IN ('scheduled', 'rescheduled')
    AND mod((extract(day FROM sv.scheduled_date)::int + tsv.seq::int), 4) = 0;

  RAISE NOTICE 'Seeded large ops dataset (% clients) with past/future visits, invoices, payments, and communication logs.', v_client_count;
END
$$;
