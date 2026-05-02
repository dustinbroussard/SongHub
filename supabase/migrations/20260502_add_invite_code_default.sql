-- Generate a random 12-character hex string for invite codes
create or replace function generate_invite_code()
returns text as $$
begin
  return array_to_string(
    array(
      select substr('0123456789abcdef', floor(random() * 16)::int + 1, 1)
      from generate_series(1, 12)
    ),
    ''
  );
end;
$$ language plpgsql;

-- Set default value for invite_code column
alter table hub_bands
alter column invite_code set default generate_invite_code();

-- Update any existing NULL invite codes
update hub_bands
set invite_code = generate_invite_code()
where invite_code is null;

-- Add unique constraint to invite_code if not exists
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'hub_bands_invite_code_unique'
  ) then
    alter table hub_bands
    add constraint hub_bands_invite_code_unique unique (invite_code);
  end if;
end;
$$;