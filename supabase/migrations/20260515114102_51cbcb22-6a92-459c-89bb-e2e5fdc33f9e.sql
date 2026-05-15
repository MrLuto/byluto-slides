-- Pin search_path on the trigger function (linter 0011).
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Restrict SECURITY DEFINER helpers to authenticated users only (linters 0028/0029).
revoke execute on function public.is_deck_collaborator(uuid, uuid) from public, anon;
revoke execute on function public.is_deck_editor(uuid, uuid)       from public, anon;
grant  execute on function public.is_deck_collaborator(uuid, uuid) to authenticated;
grant  execute on function public.is_deck_editor(uuid, uuid)       to authenticated;
