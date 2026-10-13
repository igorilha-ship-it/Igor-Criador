-- Encontro RIO — tela Descobrir (paquera)

-- Perfis que o usuário dispensou ("passar"), para não aparecerem de novo.
create table descartes (
  de_id uuid not null references perfis (id) on delete cascade,
  para_id uuid not null references perfis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (de_id, para_id),
  check (de_id <> para_id)
);

alter table descartes enable row level security;

create policy descartes_proprios on descartes for all to authenticated
  using (de_id = auth.uid()) with check (de_id = auth.uid());

-- Sugestões para o usuário logado: compatíveis nos dois sentidos (gênero x interesse),
-- dentro da faixa de idade, com pelo menos uma foto, ainda não curtidos nem dispensados.
-- Roda com as permissões do próprio usuário, então bloqueios e suspensões (RLS) já valem.
create or replace function descobrir(
  idade_min int default 18,
  idade_max int default 99,
  bairro_filtro text default null,
  limite int default 20
) returns setof perfis
language sql stable set search_path = public as $$
  select p.*
  from perfis p
  join perfis eu on eu.id = auth.uid()
  where p.id <> eu.id
    and p.tipo = 'usuario'
    and p.genero = any (eu.interesse)
    and eu.genero = any (p.interesse)
    and p.data_nascimento <= current_date - make_interval(years => greatest(idade_min, 18))
    and p.data_nascimento > current_date - make_interval(years => idade_max + 1)
    and (coalesce(bairro_filtro, '') = '' or p.bairro ilike '%' || bairro_filtro || '%')
    and exists (select 1 from fotos f where f.perfil_id = p.id)
    and not exists (select 1 from curtidas c where c.de_id = eu.id and c.para_id = p.id)
    and not exists (select 1 from descartes d where d.de_id = eu.id and d.para_id = p.id)
  order by random()
  limit least(limite, 50);
$$;
