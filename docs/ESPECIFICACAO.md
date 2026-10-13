# Encontro RIO — Especificação

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Nome | Encontro RIO |
| Cidade de lançamento | Rio de Janeiro |
| Plataformas | Navegador do celular, Android e iOS (um único código, Expo) |
| Encontros | **Paquera** entre usuários (curtida recíproca = match) **e** área separada de **anunciantes** profissionais |
| Conversa | Chat privado + botão "Marcar encontro" que gera convite e já oferece a corrida |
| Corridas | Imediata, agendada, ida e volta; categorias Econômico, Conforto e Executivo |
| Pagamento | Pix e cartão dentro do app via **Mercado Pago** (split); plataforma retém 20% (configurável) |
| Motoristas | Autônomos cadastrados (CNH com EAR, veículo 2012+, antecedentes) aprovados pelo admin |
| Sigilo | Motorista assina digitalmente o termo de confidencialidade (versão, texto e data registrados) |
| Painel admin | Completo: aprovar cadastros, denúncias, corridas, pagamentos, bloqueios, tarifas |
| Visual | Vibrante e moderno (rosa `#FF2D87` e roxo `#8B3DFF` sobre fundo escuro) |

## Regras de segurança já aplicadas no banco

- Cadastro **só para maiores de 18** (validado no app e no banco).
- Ninguém se cadastra como admin; tipo de conta, data de nascimento e verificação não podem ser alterados pelo próprio usuário.
- Cadastros de motorista, veículo, anúncio e verificação entram como **pendentes**; só o admin aprova.
- **Motoristas não enxergam a rede social** (perfis, conversas, encontros); na corrida veem apenas o primeiro nome do passageiro.
- Fotos e documentos ficam **privados**, acessados por links temporários.
- Bloqueio entre usuários esconde os perfis mutuamente; denúncias vão para o admin.

## Etapas

- [x] **1. Base:** projeto, banco completo, cadastro/login, perfil com fotos, cadastro de motorista com termo de sigilo
- [x] **2. Paquera:** tela Descobrir (curtir/passar), matches, filtros de idade e bairro, denunciar/bloquear
- [ ] **3. Anunciantes:** criação e vitrine de anúncios verificados
- [ ] **4. Chat e encontros:** mensagens em tempo real, envio de fotos, marcar encontro
- [ ] **5. Corridas:** mapa, cálculo de preço, despacho para motoristas online, acompanhamento em tempo real, ida e volta
- [ ] **6. Pagamentos:** Pix e cartão (gateway a definir), comissão e repasse ao motorista
- [ ] **7. Painel admin:** aprovações, denúncias, tarifas, relatórios
- [ ] **8. Segurança extra:** verificação por selfie + documento, botão de emergência, compartilhar viagem
- [ ] **9. Publicação:** builds Android/iOS (EAS) e site

## Pendências técnicas conhecidas

- O preço da corrida e a aceitação pelo motorista devem passar a ser feitos por funções no servidor
  (hoje as regras permitem que o próprio app grave esses campos) — resolver na etapa 5.
- Cadastro de motorista grava três registros em sequência; mover para uma função única no servidor.

## Pontos para validar com advogado

- Enquadramento da área de anunciantes (Código Penal, arts. 228–230) — o modelo do Fatal Model
  funciona como classificados, sem intermediar o encontro.
- Termos de Uso, Política de Privacidade (LGPD) e o texto final do termo de sigilo do motorista.
- Vínculo com motoristas autônomos e regras municipais de transporte por aplicativo no Rio.
- Políticas das lojas: Apple e Google não aceitam apps de serviços sexuais pagos; **decidido:** a área de
  anunciantes fica só na versão web (navegador).
