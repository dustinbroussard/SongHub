-- Create a secure RPC for joining a band via invite code
-- This uses SECURITY DEFINER to bypass RLS, ensuring users can only join if they have a valid invite code

create or replace function join_band_by_invite_code(p_invite_code text)
returns json as $$
declare
  v_band_id uuid;
  v_user_id uuid;
  v_result json;
begin
  -- Get the ID of the authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Find the band with the given invite code
  select id into v_band_id
  from hub_bands
  where invite_code = p_invite_code;

  if v_band_id is null then
    raise exception 'Invalid invite code';
  end if;

  -- Insert the user into hub_band_members if they are not already there
  insert into hub_band_members (band_id, user_id)
  values (v_band_id, v_user_id)
  on conflict (band_id, user_id) do nothing;

  -- Return the band_id so the frontend can use it for navigation and notifications
  select json_build_object('band_id', v_band_id) into v_result;
  
  return v_result;
end;
$$ language plpgsql security definer;
