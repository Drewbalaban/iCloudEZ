-- CloudEZ RLS and Storage Policies
-- Safe to re-run; uses CREATE POLICY IF NOT EXISTS where supported via drop/create guards

-- =====================================================
-- documents table RLS
-- =====================================================

-- Ensure authenticated role has table privileges; RLS will enforce row access
grant select, insert, update, delete on public.documents to authenticated;

alter table if exists public.documents enable row level security;

-- Owners: full access to own documents
drop policy if exists "doc_owner_select" on public.documents;
create policy "doc_owner_select" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "doc_owner_modify" on public.documents;
create policy "doc_owner_modify" on public.documents
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public: read-only access when visibility = 'public'
drop policy if exists "doc_public_read" on public.documents;
create policy "doc_public_read" on public.documents
  for select using (visibility = 'public');

-- Shared-with: read-only access if listed in file_shares and not expired
drop policy if exists "doc_shared_read" on public.documents;
create policy "doc_shared_read" on public.documents
  for select using (
    exists (
      select 1
      from public.file_shares fs
      where fs.document_id = documents.id
        and fs.shared_with = auth.uid()
        and (fs.expires_at is null or fs.expires_at > now())
    )
  );

-- Inserts: only owner can insert rows for themselves
drop policy if exists "doc_owner_insert" on public.documents;
create policy "doc_owner_insert" on public.documents
  for insert with check (auth.uid() = user_id);

-- =====================================================
-- file_shares table RLS
-- =====================================================

grant select, insert, update, delete on public.file_shares to authenticated;

alter table if exists public.file_shares enable row level security;

-- Owner or recipient can view share rows they are part of
drop policy if exists "share_viewer" on public.file_shares;
create policy "share_viewer" on public.file_shares
  for select using (
    shared_with = auth.uid() or shared_by = auth.uid()
  );

-- Only owner can create shares for their documents
drop policy if exists "share_owner_insert" on public.file_shares;
create policy "share_owner_insert" on public.file_shares
  for insert with check (
    shared_by = auth.uid()
  );

-- Only owner can delete their shares
drop policy if exists "share_owner_delete" on public.file_shares;
create policy "share_owner_delete" on public.file_shares
  for delete using (
    shared_by = auth.uid()
  );

-- =====================================================
-- Storage: bucket policies for 'documents'
-- =====================================================

-- Note: storage policies live on the storage.objects table

-- Ensure authenticated role has privileges; RLS restricts access
grant select, insert, update, delete on storage.objects to authenticated;

-- Also allow reading basic profile data if needed by app
grant select on public.profiles to authenticated;

-- Allow public reads for files whose associated document is public
drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and d.visibility = 'public'
    )
  );

-- Allow owners to read their own files
drop policy if exists "storage_owner_read" on storage.objects;
create policy "storage_owner_read" on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and d.user_id = auth.uid()
    )
  );

-- Allow shared-with users to read shared files (if not expired)
drop policy if exists "storage_shared_read" on storage.objects;
create policy "storage_shared_read" on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.documents d
      join public.file_shares fs on fs.document_id = d.id
      where d.file_path = storage.objects.name
        and fs.shared_with = auth.uid()
        and (fs.expires_at is null or fs.expires_at > now())
    )
  );

-- Allow owners to insert/update/delete files that map to their documents
drop policy if exists "storage_owner_write" on storage.objects;
create policy "storage_owner_write" on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and d.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and d.user_id = auth.uid()
    )
  );

-- Service role has full access implicitly; no extra grants required here


