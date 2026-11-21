# MCU Interactive Archive

Seu arquivo pessoal do Marvel Cinematic Universe. Um catálogo com a cara de um sistema da S.H.I.E.L.D., para montar sua própria jornada, registrar o que assistiu e se preparar para **Avengers: Doomsday**.

Todos usam o mesmo catálogo, mas cada pessoa constrói o seu arquivo. Tudo roda no navegador, sem conta, sem servidor e sem rastreamento.

## O que dá para fazer

- **Painel de controle:** progresso geral, por fase e por saga, obras concluídas e em andamento, reassistidas, média das suas notas, tempo restante, próxima missão e gráfico de evolução.
- **Catálogo:** filmes, séries, especiais e animações, organizados por fase, saga e ano. Cada obra tem detalhes, personagens, conexões com outras obras e importância para o universo. Há busca por título ou personagem e filtros por fase, saga, ano, tipo, status e seleção.
- **Minha jornada:** adicione ou remova obras da sua lista e marque como não assistida, em andamento ou assistida. O app diferencia primeira visualização, assistida anteriormente e reassistida, com data e histórico.
- **Linha do tempo:** em ordem de lançamento ou cronológica, com marcos por período e destaque das conexões narrativas entre as obras.
- **Doomsday Protocol:** uma curadoria editorial em três níveis (essenciais, recomendadas e complementares), com opção de alternar entre a jornada completa e a preparatória. É uma seleção narrativa e não confirma participações nem acontecimentos do filme.
- **Diário cinematográfico:** registros com datas, notas, resenhas, favoritas e histórico de reassistidas, além de uma retrospectiva com as obras mais bem avaliadas, as fases favoritas e a evolução das suas notas.
- **Mapa de conexões:** uma rede com todas as obras por fase, destacando como cada uma se liga às outras.
- **Abertura animada:** uma sequência original de acesso ao arquivo, que aparece uma vez por sessão e pode ser pulada.
- **Dois temas:** *MCU Classic* (vermelho e dourado) e *Doomsday Protocol* (visual de monitoramento multiversal). A troca é instantânea e não afeta seus dados.

## Privacidade e seus dados

- Seu progresso, notas, resenhas, histórico, favoritos e preferências ficam **somente no seu navegador** (`localStorage`). Nada é enviado a servidor, e ninguém mais tem acesso a eles.
- O catálogo é separado dos seus registros, que se ligam às obras por um `id` fixo. Atualizações no catálogo não apagam o seu progresso.
- Perfis locais permitem que mais de uma pessoa use o mesmo navegador sem misturar os dados.
- **Exporte** um backup em JSON e **importe** em outro navegador ou aparelho para levar sua jornada com você.
- Você pode reiniciar a jornada a qualquer momento, e isso só afeta o perfil ativo.

> Como os dados ficam no navegador, limpar os dados do site apaga o arquivo. Exporte um backup de vez em quando.

## Pôsteres e avaliações

São opcionais e vêm da [OMDb API](https://www.omdbapi.com/apikey.aspx), que traz as notas do IMDb, do Rotten Tomatoes e do Metacritic, sempre com a fonte indicada. Cada pessoa usa a própria chave gratuita, informada na seção **Dados** e guardada só no navegador.

Sem chave, ou se a API estiver fora do ar, o app continua funcionando normalmente, com capas geradas e as avaliações marcadas como indisponíveis. Nenhuma nota é inventada.

## Tecnologia

HTML, CSS e JavaScript puros, com módulos ES. Sem frameworks, sem build e sem dependências. O código é pequeno e separado por responsabilidade:

```
index.html
css/styles.css            Temas e componentes
js/main.js                Inicialização, rotas e ações
js/catalog/catalog.js     Catálogo público e curadoria Doomsday
js/core/storage.js        Camada de armazenamento (adapters)
js/core/profiles.js       Perfis locais
js/core/userStore.js      Registros pessoais, validação e backup
js/core/selectors.js      Estatísticas e jornada
js/core/external.js       OMDb opcional, com cache e fallback
js/ui/emblem.js           Emblema original, favicon e carimbos
js/ui/intro.js            Abertura animada
js/ui/                    Modal, utilitários e uma view por seção
```

O armazenamento fica isolado da interface. Para integrar um serviço de sincronização no futuro, basta criar um adapter com `get`, `set`, `remove` e `keys`.

### Executar localmente

Os módulos ES não funcionam abrindo o arquivo direto, então use um servidor estático:

```bash
python3 -m http.server
# abra http://localhost:8000
```

## Contribuindo com o catálogo

O catálogo está em `js/catalog/catalog.js`. Algumas regras:

- Nunca altere o `id` de uma obra existente, pois é ele que preserva o progresso das pessoas.
- Quando uma informação não for conhecida, deixe `null`. O app mostra "a confirmar" ou "indisponível".
- Datas e durações devem vir de fontes confiáveis. Não invente informações.

Correções e sugestões são bem-vindas por issue ou pull request.

## Aviso

Projeto de fã, sem fins lucrativos e sem vínculo com a Marvel Studios ou a Disney. Marvel e os nomes de personagens e obras pertencem aos seus respectivos donos.
