-- Encontro RIO — esquema inicial
-- Rede social de encontros + transporte com motoristas parceiros.
-- Executar no Supabase (SQL Editor ou `supabase db push`).

create extension if not exists pgcrypto;

-- =====================================================================
-- Tipos
-- =====================================================================
create type tipo_conta as enum ('usuario', 'anunciante', 'motorista', 'admin');
create type status_analise as enum ('pendente', 'aprovado', 'rejeitado');
create type categoria_veiculo as enum ('economico', 'conforto', 'executivo');
create type tipo_corrida as enum ('imediata', 'agendada', 'ida_volta');
create type status_corrida as enum (
  'solicitada', 'aceita', 'motorista_a_caminho', 'em_andamento',
  'aguardando_volta', 'concluida', 'cancelada'
);
create type status_encontro as enum ('proposto', 'aceito', 'recusado', 'cancelado', 'realizado');
create type metodo_pagamento as enum ('pix', 'cartao');
create type status_pagamento as enum ('pendente', 'aprovado', 'recusado', 'estornado');
create type origem_conversa as enum ('match', 'anuncio');

-- =====================================================================
-- Perfis
-- =====================================================================
create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_exibicao text not null check (char_length(nome_exibicao) between 2 and 40),
  data_nascimento date not null
    check (data_nascimento <= (current_date - interval '18 years')),
  genero text not null check (genero in ('mulher', 'homem', 'nao_binario', 'outro')),
  interesse text[] not null default '{}',
  bio text check (char_length(bio) <= 500),
  tipo tipo_conta not null default 'usuario',
  status_verificacao status_analise not null default 'pendente',
  cidade text not null default 'Rio de Janeiro',
  bairro text,
  suspenso boolean not null default false,
  termos_aceitos_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create or replace function meu_tipo() returns tipo_conta
language sql stable security definer set search_path = public as $$
  select tipo from perfis where id = auth.uid();
$$;

create or replace function eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_tipo() = 'admin', false);
$$;

-- Cria o perfil a partir dos dados enviados no cadastro.
create or replace function criar_perfil_novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := new.raw_user_meta_data;
  tipo_pedido tipo_conta := coalesce(nullif(meta->>'tipo', ''), 'usuario')::tipo_conta;
begin
  if tipo_pedido = 'admin' then
    tipo_pedido := 'usuario';
  end if;
  insert into perfis (id, nome_exibicao, data_nascimento, genero, interesse, tipo)
  values (
    new.id,
    meta->>'nome_exibicao',
    (meta->>'data_nascimento')::date,
    meta->>'genero',
    coalesce(array(select jsonb_array_elements_text(meta->'interesse')), '{}'),
    tipo_pedido
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function criar_perfil_novo_usuario();

-- Usuário comum não pode alterar tipo, verificação nem suspensão.
create or replace function proteger_campos_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then
    new.tipo := old.tipo;
    new.status_verificacao := old.status_verificacao;
    new.suspenso := old.suspenso;
    new.data_nascimento := old.data_nascimento;
  end if;
  return new;
end;
$$;

create trigger proteger_perfil
  before update on perfis
  for each row execute function proteger_campos_perfil();

create table fotos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete cascade,
  caminho text not null,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table verificacoes_identidade (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete cascade,
  documento_caminho text not null,
  selfie_caminho text not null,
  status status_analise not null default 'pendente',
  motivo_rejeicao text,
  analisado_por uuid references perfis (id),
  criado_em timestamptz not null default now()
);

create table bloqueios (
  bloqueador_id uuid not null references perfis (id) on delete cascade,
  bloqueado_id uuid not null references perfis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id)
);

create or replace function bloqueado_entre(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bloqueios
    where (bloqueador_id = a and bloqueado_id = b)
       or (bloqueador_id = b and bloqueado_id = a)
  );
$$;

create table denuncias (
  id uuid primary key default gen_random_uuid(),
  denunciante_id uuid not null references perfis (id) on delete cascade,
  denunciado_id uuid not null references perfis (id) on delete cascade,
  motivo text not null,
  detalhes text,
  status status_analise not null default 'pendente',
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- Paquera (curtidas e matches)
-- =====================================================================
create table curtidas (
  de_id uuid not null references perfis (id) on delete cascade,
  para_id uuid not null references perfis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (de_id, para_id),
  check (de_id <> para_id)
);

create table conversas (
  id uuid primary key default gen_random_uuid(),
  origem origem_conversa not null,
  participante_a uuid not null references perfis (id) on delete cascade,
  participante_b uuid not null references perfis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  check (participante_a < participante_b),
  unique (participante_a, participante_b)
);

-- Curtida recíproca abre uma conversa automaticamente.
create or replace function criar_match() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from curtidas where de_id = new.para_id and para_id = new.de_id) then
    insert into conversas (origem, participante_a, participante_b)
    values ('match', least(new.de_id, new.para_id), greatest(new.de_id, new.para_id))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger ao_curtir
  after insert on curtidas
  for each row execute function criar_match();

create table mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas (id) on delete cascade,
  autor_id uuid not null references perfis (id) on delete cascade,
  texto text check (char_length(texto) <= 2000),
  foto_caminho text,
  lida_em timestamptz,
  criado_em timestamptz not null default now(),
  check (texto is not null or foto_caminho is not null)
);

create or replace function participa_da_conversa(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversas
    where id = c and auth.uid() in (participante_a, participante_b)
  );
$$;

-- =====================================================================
-- Anunciantes
-- =====================================================================
create table anuncios (
  id uuid primary key default gen_random_uuid(),
  anunciante_id uuid not null references perfis (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 3 and 80),
  descricao text check (char_length(descricao) <= 2000),
  valor_hora numeric(10, 2) check (valor_hora >= 0),
  bairro text,
  ativo boolean not null default true,
  status status_analise not null default 'pendente',
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- Encontros
-- =====================================================================
create table encontros (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas (id) on delete cascade,
  proponente_id uuid not null references perfis (id) on delete cascade,
  convidado_id uuid not null references perfis (id) on delete cascade,
  data_hora timestamptz not null,
  local_nome text not null,
  local_endereco text,
  local_lat double precision,
  local_lng double precision,
  status status_encontro not null default 'proposto',
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- Motoristas, veículos e termo de sigilo
-- =====================================================================
create table motoristas (
  id uuid primary key references perfis (id) on delete cascade,
  cnh_numero text not null,
  cnh_validade date not null,
  cnh_foto_caminho text not null,
  antecedentes_caminho text,
  status status_analise not null default 'pendente',
  online boolean not null default false,
  lat double precision,
  lng double precision,
  posicao_atualizada_em timestamptz,
  criado_em timestamptz not null default now()
);

create table veiculos (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas (id) on delete cascade,
  placa text not null unique,
  modelo text not null,
  cor text not null,
  ano int not null check (ano >= 2012),
  categoria categoria_veiculo not null,
  crlv_caminho text,
  status status_analise not null default 'pendente',
  criado_em timestamptz not null default now()
);

create table termos_sigilo (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motoristas (id) on delete cascade,
  versao text not null,
  texto text not null,
  nome_assinatura text not null,
  aceito_em timestamptz not null default now()
);

-- =====================================================================
-- Tarifas, corridas e pagamentos
-- =====================================================================
create table tarifas (
  categoria categoria_veiculo primary key,
  bandeirada numeric(10, 2) not null,
  por_km numeric(10, 2) not null,
  por_minuto numeric(10, 2) not null,
  minimo numeric(10, 2) not null
);

-- Valores iniciais de exemplo (Rio de Janeiro) — ajustar no painel admin.
insert into tarifas values
  ('economico', 4.00, 1.80, 0.35, 9.00),
  ('conforto',  5.50, 2.40, 0.45, 13.00),
  ('executivo', 9.00, 3.80, 0.70, 25.00);

create table configuracoes (
  chave text primary key,
  valor jsonb not null
);

insert into configuracoes values ('comissao_percentual', '20');

create table corridas (
  id uuid primary key default gen_random_uuid(),
  passageiro_id uuid not null references perfis (id),
  motorista_id uuid references motoristas (id),
  encontro_id uuid references encontros (id) on delete set null,
  tipo tipo_corrida not null,
  categoria categoria_veiculo not null,
  origem_endereco text not null,
  origem_lat double precision not null,
  origem_lng double precision not null,
  destino_endereco text not null,
  destino_lat double precision not null,
  destino_lng double precision not null,
  agendada_para timestamptz,
  volta_agendada_para timestamptz,
  distancia_km numeric(8, 2),
  duracao_min numeric(8, 2),
  preco_estimado numeric(10, 2),
  preco_final numeric(10, 2),
  status status_corrida not null default 'solicitada',
  criado_em timestamptz not null default now(),
  check (tipo = 'imediata' or agendada_para is not null),
  check (tipo <> 'ida_volta' or volta_agendada_para is not null)
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  corrida_id uuid not null references corridas (id),
  pagador_id uuid not null references perfis (id),
  metodo metodo_pagamento not null,
  valor numeric(10, 2) not null,
  comissao numeric(10, 2) not null,
  status status_pagamento not null default 'pendente',
  id_gateway text,
  criado_em timestamptz not null default now()
);

create table avaliacoes (
  corrida_id uuid not null references corridas (id) on delete cascade,
  autor_id uuid not null references perfis (id),
  nota int not null check (nota between 1 and 5),
  comentario text,
  criado_em timestamptz not null default now(),
  primary key (corrida_id, autor_id)
);

create or replace function sou_motorista_aprovado(exigir_online boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from motoristas
    where id = auth.uid() and status = 'aprovado' and (online or not exigir_online)
  );
$$;

create or replace function meu_motorista(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from corridas where motorista_id = m and passageiro_id = auth.uid());
$$;

-- Sigilo: o motorista só enxerga o primeiro nome do passageiro.
create or replace function passageiro_da_corrida(c uuid) returns text
language sql stable security definer set search_path = public as $$
  select split_part(p.nome_exibicao, ' ', 1)
  from corridas r join perfis p on p.id = r.passageiro_id
  where r.id = c and (r.motorista_id = auth.uid() or r.passageiro_id = auth.uid() or eh_admin());
$$;

-- =====================================================================
-- Segurança (Row Level Security)
-- =====================================================================
alter table perfis enable row level security;
alter table fotos enable row level security;
alter table verificacoes_identidade enable row level security;
alter table bloqueios enable row level security;
alter table denuncias enable row level security;
alter table curtidas enable row level security;
alter table conversas enable row level security;
alter table mensagens enable row level security;
alter table anuncios enable row level security;
alter table encontros enable row level security;
alter table motoristas enable row level security;
alter table veiculos enable row level security;
alter table termos_sigilo enable row level security;
alter table tarifas enable row level security;
alter table configuracoes enable row level security;
alter table corridas enable row level security;
alter table pagamentos enable row level security;
alter table avaliacoes enable row level security;

-- Perfis: visíveis na rede social (exceto motoristas, bloqueados e suspensos).
create policy perfis_ver on perfis for select to authenticated using (
  id = auth.uid() or eh_admin() or (
    tipo in ('usuario', 'anunciante')
    and not suspenso
    and not bloqueado_entre(id, auth.uid())
    and meu_tipo() is distinct from 'motorista'
  )
);
create policy perfis_editar on perfis for update to authenticated
  using (id = auth.uid() or eh_admin());

create policy fotos_ver on fotos for select to authenticated using (
  exists (select 1 from perfis p where p.id = perfil_id)
);
create policy fotos_gerenciar on fotos for all to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

create policy verificacoes_proprias on verificacoes_identidade for select to authenticated
  using (perfil_id = auth.uid() or eh_admin());
create policy verificacoes_enviar on verificacoes_identidade for insert to authenticated
  with check (perfil_id = auth.uid());
create policy verificacoes_admin on verificacoes_identidade for update to authenticated
  using (eh_admin());

create policy bloqueios_proprios on bloqueios for all to authenticated
  using (bloqueador_id = auth.uid()) with check (bloqueador_id = auth.uid());

create policy denuncias_enviar on denuncias for insert to authenticated
  with check (denunciante_id = auth.uid());
create policy denuncias_admin on denuncias for select to authenticated using (eh_admin());
create policy denuncias_admin_editar on denuncias for update to authenticated using (eh_admin());

create policy curtidas_proprias on curtidas for select to authenticated
  using (de_id = auth.uid());
create policy curtidas_enviar on curtidas for insert to authenticated
  with check (de_id = auth.uid() and not bloqueado_entre(de_id, para_id));

create policy conversas_ver on conversas for select to authenticated
  using (auth.uid() in (participante_a, participante_b) or eh_admin());
create policy conversas_anuncio on conversas for insert to authenticated with check (
  origem = 'anuncio'
  and auth.uid() in (participante_a, participante_b)
  and exists (
    select 1 from anuncios a
    where a.ativo and a.status = 'aprovado'
      and a.anunciante_id in (participante_a, participante_b)
      and a.anunciante_id <> auth.uid()
  )
);

create policy mensagens_ver on mensagens for select to authenticated
  using (participa_da_conversa(conversa_id) or eh_admin());
create policy mensagens_enviar on mensagens for insert to authenticated
  with check (autor_id = auth.uid() and participa_da_conversa(conversa_id));
create policy mensagens_marcar_lida on mensagens for update to authenticated
  using (participa_da_conversa(conversa_id) and autor_id <> auth.uid());

create policy anuncios_ver on anuncios for select to authenticated
  using ((ativo and status = 'aprovado') or anunciante_id = auth.uid() or eh_admin());
create policy anuncios_criar on anuncios for insert to authenticated with check (
  anunciante_id = auth.uid()
  and meu_tipo() = 'anunciante'
);
create policy anuncios_editar on anuncios for update to authenticated
  using (anunciante_id = auth.uid() or eh_admin());

create policy encontros_ver on encontros for select to authenticated
  using (auth.uid() in (proponente_id, convidado_id) or eh_admin());
create policy encontros_propor on encontros for insert to authenticated
  with check (proponente_id = auth.uid() and participa_da_conversa(conversa_id));
create policy encontros_responder on encontros for update to authenticated
  using (auth.uid() in (proponente_id, convidado_id));

create policy motoristas_proprio on motoristas for select to authenticated
  using (id = auth.uid() or eh_admin()
    or meu_motorista(id));
create policy motoristas_cadastrar on motoristas for insert to authenticated with check (
  id = auth.uid()
  and meu_tipo() = 'motorista'
);
create policy motoristas_editar on motoristas for update to authenticated
  using (id = auth.uid() or eh_admin());

create policy veiculos_ver on veiculos for select to authenticated
  using (motorista_id = auth.uid() or eh_admin()
    or meu_motorista(motorista_id));
create policy veiculos_cadastrar on veiculos for insert to authenticated
  with check (motorista_id = auth.uid());
create policy veiculos_admin on veiculos for update to authenticated using (eh_admin());

create policy termos_ver on termos_sigilo for select to authenticated
  using (motorista_id = auth.uid() or eh_admin());
create policy termos_assinar on termos_sigilo for insert to authenticated
  with check (motorista_id = auth.uid());

create policy tarifas_ver on tarifas for select to authenticated using (true);
create policy tarifas_admin on tarifas for update to authenticated using (eh_admin());
create policy configuracoes_ver on configuracoes for select to authenticated using (true);
create policy configuracoes_admin on configuracoes for update to authenticated using (eh_admin());

-- Motorista vê corridas abertas (sem encontro associado visível) e as suas.
create policy corridas_ver on corridas for select to authenticated using (
  passageiro_id = auth.uid() or motorista_id = auth.uid() or eh_admin()
  or (status = 'solicitada' and sou_motorista_aprovado(true))
);
create policy corridas_pedir on corridas for insert to authenticated
  with check (passageiro_id = auth.uid());
create policy corridas_atualizar on corridas for update to authenticated using (
  passageiro_id = auth.uid() or motorista_id = auth.uid() or eh_admin()
  or (status = 'solicitada' and sou_motorista_aprovado(false))
);

create policy pagamentos_ver on pagamentos for select to authenticated
  using (pagador_id = auth.uid() or eh_admin());

create policy avaliacoes_ver on avaliacoes for select to authenticated using (true);
create policy avaliacoes_enviar on avaliacoes for insert to authenticated
  with check (autor_id = auth.uid() and exists (
    select 1 from corridas c where c.id = corrida_id and c.status = 'concluida'
      and auth.uid() in (c.passageiro_id, c.motorista_id)
  ));

-- =====================================================================
-- Armazenamento de arquivos (privado; acesso por URL assinada)
-- Estrutura: <bucket>/<id do usuário>/<arquivo>
-- =====================================================================
insert into storage.buckets (id, name, public) values
  ('fotos', 'fotos', false),
  ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id in ('fotos', 'documentos')
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id in ('fotos', 'documentos')
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy fotos_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos');
create policy documentos_ler on storage.objects for select to authenticated
  using (bucket_id = 'documentos'
    and ((storage.foldername(name))[1] = auth.uid()::text or eh_admin()));

-- Atualizações em tempo real (chat, corridas, posição do motorista).
alter publication supabase_realtime add table mensagens, corridas, encontros, motoristas;

-- =====================================================================
-- Só o admin aprova: cadastros entram como 'pendente' e o status não muda sem admin.
-- =====================================================================
create or replace function proteger_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pendente';
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger proteger_status before insert or update on motoristas
  for each row execute function proteger_status();
create trigger proteger_status before insert or update on veiculos
  for each row execute function proteger_status();
create trigger proteger_status before insert or update on anuncios
  for each row execute function proteger_status();
create trigger proteger_status before insert or update on verificacoes_identidade
  for each row execute function proteger_status();
create trigger proteger_status before insert or update on denuncias
  for each row execute function proteger_status();
