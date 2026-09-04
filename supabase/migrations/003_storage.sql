-- ============================================================
-- MobilSa · 003 — Storage buckets y políticas
-- Correr DESPUÉS de 001/002.
-- ============================================================

-- Bucket público: imágenes de productos, platos, logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 5242880,
        array['image/jpeg','image/jpg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- Bucket PRIVADO: comprobantes de pago (no deben ser públicos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 10485760,
        array['image/jpeg','image/jpg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ---------- products (público) ----------
drop policy if exists products_bucket_public_read on storage.objects;
create policy products_bucket_public_read on storage.objects
  for select to public using (bucket_id = 'products');

drop policy if exists products_bucket_staff_write on storage.objects;
create policy products_bucket_staff_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'products'
    and exists (select 1 from profiles where id = auth.uid()
                and role in ('store_admin','super_admin'))
  );

drop policy if exists products_bucket_staff_delete on storage.objects;
create policy products_bucket_staff_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'products'
    and exists (select 1 from profiles where id = auth.uid()
                and role in ('store_admin','super_admin'))
  );

-- ---------- comprobantes (privado) ----------
-- Subida: cualquiera autenticado puede subir su comprobante.
-- La subida pública (invitado / bot) se hace desde rutas API con service_role.
drop policy if exists comprobantes_upload on storage.objects;
create policy comprobantes_upload on storage.objects
  for insert to authenticated with check (bucket_id = 'comprobantes');

-- Lectura: solo staff (revisan la cola). El super_admin incluido vía role.
drop policy if exists comprobantes_staff_read on storage.objects;
create policy comprobantes_staff_read on storage.objects
  for select to authenticated using (
    bucket_id = 'comprobantes'
    and exists (select 1 from profiles where id = auth.uid()
                and role in ('store_admin','super_admin'))
  );

-- Nota: para mostrar el comprobante en el panel se usan signed URLs generadas
-- con service_role (createAdminClient), no acceso público.
