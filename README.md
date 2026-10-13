# Encontro RIO

Rede social de encontros com transporte por motoristas parceiros sob termo de confidencialidade.
Um único código roda no **navegador do celular**, no **Android** e no **iOS**.

- **App:** Expo (React Native) + Expo Router + TypeScript
- **Servidor:** Supabase (login, banco PostgreSQL, fotos, tempo real)

Decisões do produto e próximas etapas: [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md).

## Como rodar

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No Supabase, abra **SQL Editor**, cole o conteúdo de
   [`supabase/migrations/0001_inicial.sql`](supabase/migrations/0001_inicial.sql) e execute.
3. Copie `.env.example` para `.env` e preencha a URL e a chave `anon` do projeto
   (Project Settings → API).
4. Instale e rode:

   ```bash
   npm install
   npm run web       # abre no navegador
   npm run android   # Android (Expo Go ou emulador)
   npm run ios       # iOS (Expo Go ou simulador, precisa de Mac)
   ```

Para testar no celular sem instalar nada além do **Expo Go**, rode `npx expo start` e leia o QR code.

## Tornar alguém administrador

No SQL Editor do Supabase:

```sql
update perfis set tipo = 'admin' where id = (select id from auth.users where email = 'seu@email.com');
```

## Publicar nas lojas

Use o EAS (serviço de build do Expo, não exige Mac para Android):

```bash
npx eas-cli@latest build --platform android
npx eas-cli@latest build --platform ios
```

## Estrutura

```
src/app/(publico)/   telas sem login: boas-vindas, entrar, cadastro
src/app/(app)/       telas logadas: descobrir, anunciantes, mensagens, corridas, perfil, motorista
src/components/      componentes visuais reutilizáveis
src/lib/             conexão com Supabase, sessão, fotos, validações
supabase/migrations/ banco de dados e regras de segurança
```

## Verificações

```bash
npx tsc --noEmit                 # checagem de tipos
npx expo export -p web           # build do site
```
