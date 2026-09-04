-- ============================================================
-- STORAGE BUCKET para imágenes de productos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Crear bucket público para imágenes de productos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política: admins pueden subir imágenes
CREATE POLICY "admins_upload_product_images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('store_admin', 'super_admin')
  )
);

-- Política: cualquiera puede leer imágenes (bucket público)
CREATE POLICY "public_read_product_images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Política: admins pueden eliminar imágenes
CREATE POLICY "admins_delete_product_images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('store_admin', 'super_admin')
  )
);

-- ============================================================
-- POLÍTICA store_config lectura pública (si no existe)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'store_config' AND policyname = 'store_config_public_read'
  ) THEN
    CREATE POLICY "store_config_public_read" ON store_config
      FOR SELECT USING (true);
  END IF;
END $$;
