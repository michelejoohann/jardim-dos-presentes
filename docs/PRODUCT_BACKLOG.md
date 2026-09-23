# Product Backlog — Jardim dos Presentes v2.0

## Visão do produto

Transformar o Jardim dos Presentes em uma aplicação web profissional, responsiva e segura, com catálogo dinâmico, reservas em tempo real e painel administrativo para gestão de produtos, imagens e status.

## Perfis de usuário

### Visitante
- Visualiza desejos disponíveis, reservados e realizados.
- Pesquisa, filtra e ordena produtos.
- Reserva um presente sem expor seus dados a outros visitantes.
- Envia uma mensagem opcional para Michèlé.

### Administradora
- Autentica-se com e-mail e senha.
- Cadastra, edita, publica e arquiva produtos.
- Faz upload de imagens.
- Consulta dados privados de reservas.
- Marca desejos como recebidos.
- Gerencia categorias, coleções e prioridades.

## Épicos

### EPIC-01 — Fundação técnica
- React + Vite.
- React Router.
- Firebase Authentication.
- Firestore.
- Firebase Storage.
- GitHub Pages.
- Ambientes de desenvolvimento e produção.

### EPIC-02 — Catálogo público
- Cards responsivos.
- Imagens reais e fallback.
- Busca.
- Filtros por categoria, coleção, status e faixa de preço.
- Ordenação por valor e nome.
- Página de detalhe do produto.
- Compartilhamento de item e coleção.

### EPIC-03 — Reservas
- Autenticação anônima.
- Reserva de um produto disponível.
- Estado público sem dados pessoais.
- Dados privados acessíveis somente à administradora.
- Prevenção de reserva duplicada.
- Cancelamento e confirmação administrativa.

### EPIC-04 — Painel administrativo
- Login administrativo.
- Dashboard.
- CRUD de produtos.
- Gestão de imagens.
- Gestão de reservas.
- Marcação de item recebido.
- Histórico mínimo de alterações.

### EPIC-05 — Segurança e qualidade
- Firestore Security Rules.
- Storage Security Rules.
- App Check.
- Restrição de chave por domínio.
- Tratamento de erros e estados vazios.
- Testes unitários e de integração.
- Auditoria de acessibilidade.
- CI com build e testes.

## User stories prioritárias

### US-001 — Visualizar catálogo
**Como** visitante, **quero** visualizar os desejos publicados, **para** escolher um presente adequado.

Critérios de aceite:
- Exibir nome, imagem, descrição, preço, coleção e status.
- Não mostrar produtos arquivados.
- Apresentar fallback quando não houver imagem.
- Funcionar em celular e desktop.

### US-002 — Buscar e filtrar
**Como** visitante, **quero** buscar e filtrar os desejos, **para** encontrar opções compatíveis com meu orçamento e interesse.

Critérios de aceite:
- Busca por nome, descrição e coleção.
- Filtro por categoria, status e faixa de preço.
- Ordenação crescente e decrescente por valor.
- Produtos sem preço ficam no final da ordenação crescente.

### US-003 — Reservar presente
**Como** visitante, **quero** reservar um desejo, **para** evitar que outra pessoa compre o mesmo item.

Critérios de aceite:
- Apenas itens disponíveis podem ser reservados.
- A reserva exige nome e permite mensagem e e-mail opcionais.
- Outros visitantes veem somente o status “Reservado”.
- Dados pessoais ficam em coleção privada.
- Duas reservas simultâneas para o mesmo produto não podem ser aceitas.

### US-004 — Login administrativo
**Como** administradora, **quero** entrar com e-mail e senha, **para** acessar informações e funções privadas.

Critérios de aceite:
- Usuários não autorizados não acessam o painel.
- O UID administrativo é validado nas regras do Firestore.
- Sessão persistente e opção de logout.

### US-005 — Gerenciar produtos
**Como** administradora, **quero** cadastrar e editar produtos pelo navegador, **para** manter o Jardim sem alterar código.

Critérios de aceite:
- Criar, editar, publicar, arquivar e excluir logicamente.
- Campos: nome, categoria, coleção, descrição, história, preço, link, prioridade e status.
- Validação de campos obrigatórios e URL.
- Atualização refletida no catálogo em tempo real.

### US-006 — Gerenciar imagens
**Como** administradora, **quero** enviar uma imagem do produto, **para** tornar o catálogo visualmente completo.

Critérios de aceite:
- Aceitar JPG, PNG e WebP.
- Limitar tamanho e validar formato.
- Salvar no Firebase Storage.
- Registrar URL no produto.
- Permitir substituição e remoção.

### US-007 — Consultar reservas
**Como** administradora, **quero** consultar os dados privados das reservas, **para** acompanhar quem escolheu cada presente.

Critérios de aceite:
- Mostrar produto, nome, contato opcional, mensagem e data.
- Dados disponíveis somente para o UID administrativo.
- Permitir cancelar, confirmar e marcar como recebido.

## Roadmap

### Marco 1 — Fundação
- Estrutura React/Vite.
- Firebase configurado.
- Rotas e tema base.
- Regras iniciais.

### Marco 2 — Catálogo dinâmico
- Migração dos produtos para Firestore.
- Listagem, busca, filtros e ordenação.
- Cards e detalhes.

### Marco 3 — Reservas compartilhadas
- Login anônimo.
- Transação de reserva.
- Coleções pública e privada.
- Status em tempo real.

### Marco 4 — Painel administrativo
- Login.
- Dashboard.
- CRUD de produtos.
- Gestão de reservas e imagens.

### Marco 5 — Produção
- Testes.
- App Check.
- Regras endurecidas.
- CI/CD.
- Migração definitiva para a versão 2.0.

## Definition of Done

Uma história é considerada concluída quando:
- critérios de aceite estão atendidos;
- código revisado e sem erros de lint/build;
- testes aplicáveis estão passando;
- comportamento validado em celular e desktop;
- regras de segurança foram verificadas;
- documentação relevante foi atualizada;
- nenhuma informação privada é exposta ao público.
