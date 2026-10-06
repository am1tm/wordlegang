create table if not exists players (
  id text primary key,
  name text not null,
  key_hash text not null unique,
  tz text not null default 'UTC',
  notify_midnight boolean not null default true,
  notify_morning boolean not null default true,
  notify_afternoon boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id text primary key,
  name text not null,
  invite_code text not null unique,
  created_by text not null references players(id),
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  group_id text not null references groups(id) on delete cascade,
  player_id text not null references players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);
create index if not exists memberships_player_idx on memberships(player_id);

create table if not exists results (
  player_id text not null references players(id) on delete cascade,
  puzzle integer not null,
  score smallint not null check (score between 1 and 7),
  hard boolean not null default false,
  grid text not null,
  created_at timestamptz not null default now(),
  primary key (player_id, puzzle)
);

create table if not exists push_subscriptions (
  endpoint text primary key,
  player_id text not null references players(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_player_idx on push_subscriptions(player_id);

create table if not exists notification_log (
  player_id text not null references players(id) on delete cascade,
  puzzle integer not null,
  slot text not null,
  sent_at timestamptz not null default now(),
  primary key (player_id, puzzle, slot)
);

-- Daily group chat: messages belong to a puzzle day and are purged soon after.
create table if not exists messages (
  id bigserial primary key,
  group_id text not null references groups(id) on delete cascade,
  player_id text not null references players(id) on delete cascade,
  puzzle integer not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists messages_group_puzzle_idx on messages(group_id, puzzle, id);

-- Trash talk read state: last message id seen / notified about, per member.
alter table memberships add column if not exists chat_read_id bigint not null default 0;
alter table memberships add column if not exists chat_notified_id bigint not null default 0;
alter table players add column if not exists notify_chat boolean not null default true;
