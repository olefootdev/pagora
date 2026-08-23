-- =============================================================================
-- 0010 — Chat interno (ponto 9)
-- =============================================================================
-- O chat existia como array em useState, com resposta automática depois de
-- 1,1s. Esta migration cria a conversa de verdade: mensagem por pedido, RLS
-- deny-by-default, realtime, e a fila de moderação do bloqueio de contato.
--
-- POR QUE A CONVERSA É PRESA AO PEDIDO
-- Não há "conversa avulsa". Cliente e prestador só se falam quando existe uma
-- order ligando os dois, e a conversa morre com ela. Isso não é limitação de
-- schema: é o que impede o chat de virar canal de prospecção paralelo, que é
-- o mesmo problema que o ponto 9 quer resolver.
--
-- POR QUE O TEXTO BLOQUEADO NÃO É GRAVADO EM messages
-- Mensagem barrada não entra na conversa — se entrasse, bastaria ler o
-- histórico para ver o telefone que o filtro recusou. O que vai para
-- `message_blocks` é o trecho que disparou a regra, para o admin ver padrão de
-- reincidência, e não a mensagem inteira.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------------
create table if not exists pagora.messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references pagora.orders(id) on delete cascade,
  sender_id   uuid not null references pagora.profiles(id) on delete restrict,
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),

  -- 2000 é folgado para combinar um frete e curto o bastante para não virar
  -- vetor de despejo de texto. O limite existe no banco, não só na tela: a
  -- tela é sugestão, o banco é regra.
  constraint messages_body_len check (char_length(body) between 1 and 2000)
);

create index messages_order_idx on pagora.messages(order_id, created_at);
create index messages_unread_idx on pagora.messages(order_id, read_at)
  where read_at is null;

-- -----------------------------------------------------------------------------
-- message_blocks — o que o filtro barrou
-- -----------------------------------------------------------------------------
create table if not exists pagora.message_blocks (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references pagora.orders(id) on delete cascade,
  sender_id   uuid not null references pagora.profiles(id) on delete restrict,
  -- 'phone' | 'email' | 'url' | 'handle' — espelha ContactKind no TypeScript.
  kind        text not null check (kind in ('phone', 'email', 'url', 'handle')),
  -- Só o trecho que casou com a regra, nunca a mensagem inteira.
  excerpt     text not null check (char_length(excerpt) <= 120),
  created_at  timestamptz not null default now()
);

create index message_blocks_sender_idx
  on pagora.message_blocks(sender_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Quem participa de um pedido
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER porque as policies de `messages` precisam ler `orders`, e
-- `orders` tem RLS própria. Sem isto a policy dependeria de o usuário poder
-- enxergar a linha da order pelo caminho normal — acoplamento que quebraria
-- calado no dia em que a RLS de orders mudasse.
create or replace function pagora.is_order_participant(p_order_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pagora, public
as $$
  select exists (
    select 1 from pagora.orders o
     where o.id = p_order_id
       and (o.client_id = p_profile_id or o.provider_id = p_profile_id)
  );
$$;

revoke all on function pagora.is_order_participant(uuid, uuid) from public;
grant execute on function pagora.is_order_participant(uuid, uuid)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table pagora.messages enable row level security;
alter table pagora.message_blocks enable row level security;

-- `force` além de `enable`: sem ele o DONO da tabela ignora as policies, e o
-- dono é quem as migrations e as funções SECURITY DEFINER usam. A invariante
-- em security.test.ts cobre o schema inteiro e pegou estas duas tabelas
-- justamente por faltar esta linha.
alter table pagora.messages force row level security;
alter table pagora.message_blocks force row level security;

-- Herda o deny-by-default da 0006: nada de insert/update/delete para
-- authenticated, exceto o que for concedido coluna a coluna abaixo.
revoke insert, update, delete on pagora.messages from authenticated, anon;
revoke insert, update, delete on pagora.message_blocks from authenticated, anon;
grant select on pagora.messages to authenticated;

-- `message_blocks` é material de moderação: o próprio autor não precisa ler a
-- lista dos seus bloqueios, e a outra parte muito menos. Só service_role.
revoke select on pagora.message_blocks from authenticated, anon;

-- Ler: só quem é parte do pedido.
create policy messages_participant_select on pagora.messages
  for select to authenticated
  using (pagora.is_order_participant(order_id, auth.uid()));

-- Escrever: só participante, e só em nome de si mesmo.
--
-- `sender_id` fica FORA do grant de colunas de propósito — é o with check que
-- o amarra a auth.uid(). Se `sender_id` fosse gravável livremente, um
-- participante poderia inserir mensagem se passando pelo outro.
grant insert (order_id, sender_id, body) on pagora.messages to authenticated;

create policy messages_participant_insert on pagora.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and pagora.is_order_participant(order_id, auth.uid())
  );

-- Marcar como lida: só o DESTINATÁRIO, e só a coluna read_at.
--
-- A condição `sender_id <> auth.uid()` é o que impede alguém de marcar a
-- própria mensagem como lida e fabricar prova de que o outro leu.
grant update (read_at) on pagora.messages to authenticated;

create policy messages_recipient_mark_read on pagora.messages
  for update to authenticated
  using (
    pagora.is_order_participant(order_id, auth.uid())
    and sender_id <> auth.uid()
  )
  with check (
    pagora.is_order_participant(order_id, auth.uid())
    and sender_id <> auth.uid()
  );

-- Sem policy de delete: mensagem não se apaga. É o registro que a plataforma
-- usa para arbitrar disputa, e registro que uma das partes apaga não arbitra
-- nada.

-- -----------------------------------------------------------------------------
-- Registro de bloqueio
-- -----------------------------------------------------------------------------
-- Só service_role grava. O cliente não insere aqui: se pudesse, poderia tanto
-- omitir o próprio bloqueio quanto poluir a fila com bloqueios de terceiros.
-- Quem chama é a Edge Function que roda o mesmo guard do TypeScript.
create or replace function pagora.record_message_block(
  p_order_id uuid,
  p_sender_id uuid,
  p_kind text,
  p_excerpt text
) returns void
language sql
volatile
security definer
set search_path = pagora, public
as $$
  insert into pagora.message_blocks (order_id, sender_id, kind, excerpt)
  values (p_order_id, p_sender_id, p_kind, left(p_excerpt, 120));
$$;

revoke all on function pagora.record_message_block(uuid, uuid, text, text) from public;
grant execute on function pagora.record_message_block(uuid, uuid, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
-- Só `messages`. `message_blocks` fora de propósito: transmitir bloqueio em
-- tempo real entregaria à outra parte a informação de que houve tentativa de
-- contato, que é assunto de moderação, não da conversa.
alter publication supabase_realtime add table pagora.messages;
