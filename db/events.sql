insert into public.events (id, title, stat, goal, reward_kind, reward_ref, reward_amount, starts_at, ends_at)
values ('event-id', 'Titre affiche', 'ranked_won', 20, 'skin', 'sombra', 0, now(), now() + interval '7 days');

update public.events set ends_at = now() where id = 'event-id';

delete from public.events where id = 'event-id';
