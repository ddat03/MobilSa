-- Campos para métodos de pago manuales en store_config
alter table store_config
  add column if not exists bank_name       text,
  add column if not exists bank_account    text,
  add column if not exists bank_holder     text,
  add column if not exists bank_id         text,
  add column if not exists deuna_qr_url    text,
  add column if not exists deuna_phone     text;
