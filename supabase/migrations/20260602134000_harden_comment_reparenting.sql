-- Comments are object memory. Editing a comment may change the body only, never its owner or parent object.

create or replace function public.prevent_comment_reparenting()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id
    or new.organization_id <> old.organization_id
    or new.author_user_id <> old.author_user_id
    or new.entity_type <> old.entity_type
    or new.entity_id <> old.entity_id
    or new.created_at <> old.created_at then
    raise exception 'comments cannot be moved to another author, organization, or object';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_no_reparenting on public.comments;
create trigger comments_no_reparenting
before update on public.comments
for each row execute function public.prevent_comment_reparenting();

notify pgrst, 'reload schema';
