create or replace function public.aldroobi_redeem_subscription_code(p_code_hash text, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_code public.subscription_codes%rowtype;
begin
 if auth.uid() is null or auth.uid() <> p_user_id then return jsonb_build_object('ok',false,'reason','unauthorized'); end if;
 if p_code_hash is null or length(p_code_hash) <> 64 then return jsonb_build_object('ok',false,'reason','invalid'); end if;
 select * into v_code from public.subscription_codes where code_hash=p_code_hash for update;
 if not found or v_code.status <> 'unused' or (v_code.expires_at is not null and v_code.expires_at <= now()) then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
 if not exists(select 1 from public.shop_memberships m where m.shop_id=v_code.shop_id and m.user_id=p_user_id and m.status='active') then return jsonb_build_object('ok',false,'reason','wrong_account'); end if;
 update public.subscription_codes set status='used',used_at=now(),updated_at=now() where id=v_code.id and status='unused';
 if not found then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
 update public.shop_subscriptions set status='active',starts_at=case when v_code.code_type='activation' then now() else starts_at end,
 ends_at=case when v_code.code_type='activation' then now()+make_interval(days=>v_code.duration_days) else greatest(coalesce(ends_at,now()),now())+make_interval(days=>v_code.duration_days) end,
 updated_at=now() where id=v_code.subscription_id and shop_id=v_code.shop_id;
 if not found then raise exception 'subscription record missing'; end if;
 insert into public.aldroodi_operation_logs(shop_id,actor_user_id,action,entity_type,entity_id,outcome,details)
 values(v_code.shop_id,p_user_id,'subscription_code.redeemed','subscription_code',v_code.id::text,'success',jsonb_build_object('code_type',v_code.code_type,'duration_days',v_code.duration_days));
 return jsonb_build_object('ok',true,'shop_id',v_code.shop_id,'subscription_id',v_code.subscription_id);
end; $$;
revoke all on function public.aldroobi_redeem_subscription_code(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.aldroobi_redeem_subscription_code(text,uuid) to authenticated;