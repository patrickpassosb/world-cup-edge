# World Cup Edge - Solana House Pitch

## Brief da Apresentação

- **Formato principal:** pitch estendido de aproximadamente 3 minutos e 25 segundos mais Q&A
- **Backup de tempo:** `world-cup-edge-solana-house-backup-3min.html`, sem o roadmap
- **Idioma:** português
- **Público:** jurados do World Cup Hackathon Brasil na Solana House SP
- **Narrativa:** Problema-Agitação-Solução, ancorada na persona composta Maya
- **CTA principal:** escanear e testar `https://world-cup-edge.fly.dev/`
- **Demo:** captura real de France vs England feita durante o jogo

> Maya é uma persona composta a partir de fluxos documentados de traders ativos. Ela não é cliente nem depoimento. Preços e estimativas de mercado são hipóteses de planejamento, não tração observada.

## Slide 1 - World Cup Edge

**Tempo:** 0:00-0:18

### Texto na tela

**World Cup Edge**

O monitor que verifica o contexto antes de mostrar a diferenca.

Consenso TxLINE x cotação top-of-book Polymarket

`world-cup-edge.fly.dev`

### Visual

Wordmark e proposta de valor à esquerda. QR code escaneável e URL curta à direita. Uma linha cobalto conecta as duas fontes.

### Fala

> Eu sou Patrick Passos, engenheiro de software e fundador do World Cup Edge. Construí um monitor que compara o consenso esportivo da TxLINE com a cotação no topo do livro do Polymarket e só mostra uma diferença depois de verificar o contexto.

### Transição

> Conheça a Maya.

## Slide 2 - Conheça Maya

**Tempo:** 0:18-0:48

### Texto na tela

**Devagar, a cotação muda. Errado, o capital segue uma comparação falsa.**

Maya

Trader ativa de mercados de previsão esportivos

`ODDS -> REGRAS -> LIVRO -> TAXAS -> PLANILHA`

**"Essa diferença é comparável?"**

### Visual

As cinco fontes formam uma sequência da esquerda para a direita. O slide visualiza a fragmentação sem usar uma foto que faça Maya parecer uma cliente real.

### Fala

> Maya é uma trader ativa de mercados de previsão. Antes de agir, ela abre odds, regras, livro, taxas e planilha. Se demora, a cotação muda. Se usa contratos diferentes ou dados antigos, investiga uma diferença inválida.

### Transição

> O World Cup Edge automatiza essa checagem.

## Slide 3 - Verificar primeiro. Alertar depois.

**Tempo:** 0:48-1:18

### Texto na tela

**Verificar primeiro. Alertar depois.**

1. Probabilidade de consenso TxLINE
2. Cotação top-of-book Polymarket
3. Mesmo jogo, resultado e período
4. Fontes atuais e livro disponível
5. Taxa dinâmica e diferença final

**Qualquer falha suprime o alerta e explica o motivo.**

### Visual

Um pipeline de duas fontes converge em um portão de verificação. Checagens aprovadas avançam; dados antigos, incompatíveis, mercados fechados ou livros vazios param na linha de supressão.

### Fala

> O sistema consulta as duas fontes em paralelo e confirma times, data, período, resultado, mercado, liquidez, atualidade e taxa. Só então calcula a diferença. Se algo estiver ausente, antigo ou incompatível, falha fechado: não emite alerta e explica o motivo.

### Transição

> Este é o fluxo no produto.

## Slide 4 - O produto em execução

**Tempo:** 1:18-1:53

### Texto na tela

**O produto em execução**

Captura real durante France vs England

- Consenso TxLINE: **60,4%**
- Best ask Polymarket: **87,0%**
- Resultado do motor: **suprimido**
- Verificações de equivalência: **falharam**

**Sem comparação válida. O sistema não inventou um gap.**

### Visual

Captura feita durante France vs England. O slide mostra os dois feeds ao vivo, a diferença bruta aparente e a decisão fail-closed de não calcular um gap porque a equivalência do contrato falhou.

### Fala

> Esta captura é real e foi feita durante France contra England. A TxLINE mostrava sessenta vírgula quatro por cento e a melhor oferta no Polymarket, oitenta e sete. Os dois feeds estavam ao vivo, mas as verificações de equivalência falharam. Por isso o motor suprimiu a comparação e não inventou um gap. Esse é o fail-closed funcionando em jogo real.

### Transição

> Essa cautela define a arquitetura.

## Slide 5 - Determinístico por design

**Tempo:** 1:53-2:20

### Texto na tela

**Determinístico por design**

Sem LLM no motor de decisão

| Camada | Função |
| --- | --- |
| TxLINE | Consenso esportivo e proveniência ancorada na Solana |
| Engine | Cálculo reproduzível e verificações explícitas |
| Safety | Dados antigos ou incompatíveis suprimem alertas |

**A proveniência ajuda a auditar a fonte. Não transforma probabilidade em verdade.**

### Visual

Três camadas horizontais mostram fonte, motor e segurança. Solana aparece como trilho de proveniência, não como decoração blockchain.

### Fala

> Não há LLM no motor de decisão, porque a diferença precisa ser reproduzível. A TxLINE fornece consenso esportivo em uma arquitetura de proveniência ancorada na Solana; o World Cup Edge normaliza os dados e aplica regras explícitas. Proveniência ajuda a auditar a fonte, mas não transforma probabilidade em verdade.

### Transição

> A mesma clareza orienta o negócio.

## Slide 6 - Modelo de negócio global

**Tempo:** 2:20-2:43

### Texto na tela

**Software de pesquisa, não execução**

| Plano | Hipótese de preço | Valor |
| --- | ---: | --- |
| Free | US$0 | Dashboard atrasado e cobertura limitada |
| Pro | US$39/mês | Tempo real, thresholds, watchlists e alertas |
| Team/API | A partir de US$199/mês | Webhooks, exportação histórica e integrações |

**Entrada:** traders esportivos ativos

**Expansão:** mais jogos, esportes e venues

### Visual

Três colunas de preço separadas por linhas finas, sem cards genéricos. A nota identifica os preços como hipóteses a validar em pilotos pagos.

### Fala

> O modelo proposto é SaaS freemium: gratuito com cobertura limitada; Pro, como hipótese de trinta e nove dólares por mês, com tempo real e alertas; e Team/API, a partir de cento e noventa e nove dólares, com webhooks e dados derivados. Agora preciso validar preço e recorrência com traders reais.

### Transição

> O crescimento segue um roadmap condicionado por evidência.

## Slide 7 - Roadmap orientado por evidência

**Tempo:** 2:43-3:08

### Texto na tela

**Metas, não promessas**

| Horizonte | Meta |
| --- | --- |
| Agora | MVP público com captura real e fail-closed |
| 30 dias | 20 testers; 5 traders recorrentes |
| 60 dias | Primeiro piloto Pro pago |
| 90 dias | 10 clientes pagantes ou decisão de pivotar |

**Depois da validação:** Team/API, novos esportes e venues, condicionados aos direitos de dados.

### Visual

Quatro etapas separadas por linhas finas. Os horizontes e números usam JetBrains Mono; os resultados usam Source Serif 4. Uma nota deixa claro que são metas de validação, não tração atual.

### Fala

> O roadmap também falha fechado. Agora temos o MVP público. Em trinta dias, a meta é vinte testers e cinco traders recorrentes. Em sessenta, o primeiro piloto Pro pago. Em noventa, dez clientes pagantes ou uma decisão de pivotar baseada em evidência. Team/API e novos esportes só vêm depois da validação e da confirmação dos direitos de dados.

### Transição

> E eu sou responsável por executar esse próximo passo.

## Slide 8 - Fundador e próximo passo

**Tempo:** 3:08-3:25

### Texto na tela

**Patrick Passos**

Engenheiro de software e fundador

Produto construído solo

**Próximo marco:** cinco traders recorrentes

Escaneie e teste o aplicativo

`world-cup-edge.fly.dev`

### Visual

O retrato de Patrick ocupa o terço esquerdo. O lado direito mostra o título de fundador, um próximo marco concreto, QR code grande e URL curta.

### Fala

> Construí sozinho o motor determinístico, a interface e o deploy. O próximo marco é colocar o World Cup Edge nas mãos de cinco traders recorrentes e medir tempo economizado, comparações evitadas e disposição para pagar. O QR está na tela. Obrigado.

## Script Contínuo

> Eu sou Patrick Passos, engenheiro de software e fundador do World Cup Edge. Construí um monitor que compara o consenso esportivo da TxLINE com a cotação no topo do livro do Polymarket e só mostra uma diferença depois de verificar o contexto.
>
> Conheça a Maya.
>
> Maya é uma trader ativa de mercados de previsão. Antes de agir, ela abre odds, regras, livro, taxas e planilha. Se demora, a cotação muda. Se usa contratos diferentes ou dados antigos, investiga uma diferença inválida.
>
> O World Cup Edge automatiza essa checagem.
>
> O sistema consulta as duas fontes em paralelo e confirma times, data, período, resultado, mercado, liquidez, atualidade e taxa. Só então calcula a diferença. Se algo estiver ausente, antigo ou incompatível, falha fechado: não emite alerta e explica o motivo.
>
> Este é o fluxo no produto.
>
> Esta captura é real e foi feita durante France contra England. A TxLINE mostrava sessenta vírgula quatro por cento e a melhor oferta no Polymarket, oitenta e sete. Os dois feeds estavam ao vivo, mas as verificações de equivalência falharam. Por isso o motor suprimiu a comparação e não inventou um gap. Esse é o fail-closed funcionando em jogo real.
>
> Essa cautela define a arquitetura.
>
> Não há LLM no motor de decisão, porque a diferença precisa ser reproduzível. A TxLINE fornece consenso esportivo em uma arquitetura de proveniência ancorada na Solana; o World Cup Edge normaliza os dados e aplica regras explícitas. Proveniência ajuda a auditar a fonte, mas não transforma probabilidade em verdade.
>
> A mesma clareza orienta o negócio.
>
> O modelo proposto é SaaS freemium: gratuito com cobertura limitada; Pro, como hipótese de trinta e nove dólares por mês, com tempo real e alertas; e Team/API, a partir de cento e noventa e nove dólares, com webhooks e dados derivados. Agora preciso validar preço e recorrência com traders reais.
>
> O crescimento segue um roadmap condicionado por evidência.
>
> O roadmap também falha fechado. Agora temos o MVP público. Em trinta dias, a meta é vinte testers e cinco traders recorrentes. Em sessenta, o primeiro piloto Pro pago. Em noventa, dez clientes pagantes ou uma decisão de pivotar baseada em evidência. Team/API e novos esportes só vêm depois da validação e da confirmação dos direitos de dados.
>
> E eu sou responsável por executar esse próximo passo.
>
> Construí sozinho o motor determinístico, a interface e o deploy. O próximo marco é colocar o World Cup Edge nas mãos de cinco traders recorrentes e medir tempo economizado, comparações evitadas e disposição para pagar. O QR está na tela. Obrigado.

## Autoavaliação

| Dimensão | Nota | Observação |
| --- | ---: | --- |
| Clareza do problema | 9,5/10 | A dor aparece através de uma pessoa e de um fluxo concreto. |
| Produto e demonstração | 9,5/10 | A captura real mostra o produto recusando uma comparação inválida durante o jogo. |
| Persona | 9/10 | Maya deixa o comprador claro e permanece identificada como persona composta. |
| Diferenciação | 9/10 | Determinismo, fail-closed e proveniência têm funções distintas e compreensíveis. |
| Modelo de negócio | 8/10 | Planos e entrada estão claros, mas preço e disposição para pagar ainda precisam de validação. |
| Founder | 9/10 | Patrick aparece como engenheiro de software, fundador e responsável pelo produto completo. |
| Segurança das alegações | 10/10 | Não promete arbitragem, retorno, verdade verificada ou execução. |
| Tempo | 9/10 | Versão estendida com roadmap para aproximadamente 3:25; backup preservado em 3 minutos. |
| **Geral** | **9,1/10** | Pronto para ensaio e ajustes baseados na velocidade real de apresentação. |

## Perguntas e Respostas dos Jurados

### 1. Por que um trader pagaria se os dados brutos já existem?

> O trader não paga por mais um feed. O valor está na normalização, equivalência de contratos, cálculo da taxa dinâmica, verificação de atualidade, regras de supressão e um único fluxo auditável.

### 2. A diferença exibida é uma oportunidade de arbitragem?

> Não. É uma diferença entre uma probabilidade de consenso e uma cotação no topo do livro. Ela pode diminuir, aumentar ou desaparecer com liquidez e tempo. O produto diz apenas que a diferença merece investigação.

### 3. Por que usar Solana?

> A arquitetura de proveniência da TxLINE ancora registros na Solana. Isso oferece ao fluxo de dados esportivos uma camada de publicação auditável. No MVP, o aplicativo consome dados da TxLINE e não apresenta proveniência como prova de que uma probabilidade está correta.

### 4. O aplicativo valida hoje cada registro de odds on-chain?

> Ainda não. A validação da prova de odds é uma fase futura. O MVP atual demonstra o fluxo de comparação segura: normalização, equivalência de contratos, atualidade, cálculo de taxa e alertas fail-closed.

### 5. Por que não há um agente de IA na track Trading Tools and Agents?

> Porque o produto é uma ferramenta de trading, e a decisão central do alerta precisa ser reproduzível. Um LLM poderá explicar alertas validados no futuro, mas nunca poderá inventar ou suprimir esses alertas.

### 6. O que acontece quando o mercado é eficiente e nenhuma diferença aparece?

> Nenhum alerta é um resultado válido. Isso informa que as fontes estão alinhadas ou que as evidências não são seguras o suficiente para comparar. Evitar uma investigação falsa faz parte do valor.

### 7. Alguém no Brasil pode operar através do produto?

> Não. O produto é somente leitura e não facilita ordens. Ele exibe a cotação pública no topo do livro do Polymarket, nunca um preço executável, e não possui conexão de carteira ou custódia.

### 8. Qual tração você possui?

> Temos um MVP público funcionando e evidências de mercado documentadas, mas ainda não temos validação de clientes. O próximo marco é ter cinco traders ativos usando o produto repetidamente para medir tempo economizado, comparações inválidas evitadas e disposição para pagar.

### 9. O que impede outro dashboard de copiar o produto?

> O trabalho defensável está na infraestrutura de comparação: mapeamentos confirmados, equivalência em runtime, dados normalizados de múltiplas fontes, histórico de supressão e confiança conquistada ao explicar alertas e estados sem alerta.

### 10. Qual é o maior risco de negócio?

> Disposição para pagar. O preço é uma hipótese. Vou testá-lo com pilotos conduzidos pelo fundador antes de expandir a cobertura ou construir billing. Licenciamento de dados é o segundo maior risco e precisa ser confirmado antes de qualquer API comercial.

## Checklist de Alegações

- Use **diferença de consenso**, não arbitragem.
- Use **cotação top-of-book**, não preço executável.
- Use **merece investigação**, não comprar ou vender.
- Diga que proveniência apoia auditabilidade, não verdade absoluta.
- Mantenha Maya identificada como persona composta.
- Apresente a captura como real, mas deixe claro que o motor suprimiu a comparação por falha de equivalência.
- Mantenha os preços Free, Pro e Team/API como hipóteses de planejamento.
- Não alegue tração de clientes ou disposição para pagar validada.
