# World Cup Edge: roteiro final de fala

## Contexto

- **Duração-alvo:** 3 minutos
- **Idioma:** português
- **Slides:** 7
- **Público:** jurados do World Cup Hackathon Brasil, Solana House SP
- **Velocidade recomendada:** 115 a 120 palavras por minuto
- **Objetivo:** tornar clara a dor comercial do trader, demonstrar o produto e terminar com um próximo passo concreto

## Regra principal

Não leia o texto dos slides. Use cada slide como prova visual da frase que você está dizendo. A fala explica a história; a tela sustenta a história.

# Roteiro por slide

## Slide 1: World Cup Edge

**Janela:** 0:00-0:18

### Fala

> Eu sou Patrick Passos, engenheiro de software e fundador do World Cup Edge. Construí um monitor que compara o consenso esportivo da TxLINE com a cotação top-of-book da Polymarket e verifica o contexto antes de mostrar qualquer diferença.

### Intenção

Apresente quem você é, o que o produto compara e a regra que diferencia o produto. Não explique arquitetura ainda.

### Transição

> Para entender por que isso importa, conheça a Maya.

---

## Slide 2: Maya e a dor comercial

**Janela:** 0:18-0:50

### Fala

> A Maya representa meu cliente inicial: uma trader ativa de mercados de previsão. O objetivo dela é gerar retorno encontrando diferenças antes que o mercado se mova. Mas cada diferença exige conferir regras, o contrato exato, atualidade, liquidez e taxas em cinco etapas. Se ela demora, a cotação muda. Se erra, arrisca capital com uma comparação falsa.

### Intenção

Esta é a parte comercial do problema. Separe claramente:

- o objetivo da Maya é gerar retorno;
- lentidão custa a janela de mercado;
- uma comparação errada coloca capital em risco;
- o World Cup Edge não promete retorno, ele melhora a qualidade e a velocidade da pesquisa.

### Entonação

Faça uma pausa curta depois de **"antes que o mercado se mova"**. Diga as duas consequências em frases separadas:

> Se ela demora, a cotação muda. **[pausa]** Se erra, arrisca capital com uma comparação falsa.

### Transição

> O World Cup Edge transforma esse processo manual em uma checagem única.

---

## Slide 3: Verificar primeiro, alertar depois

**Janela:** 0:50-1:20

### Fala

> O sistema consulta TxLINE e Polymarket em paralelo. Primeiro confirma se é o mesmo jogo, resultado e período. Depois checa atualidade, livro disponível e taxa dinâmica. Só então calcula a diferença e exige confirmação antes de alertar. Se qualquer entrada estiver ausente, antiga ou incompatível, ele falha fechado: não alerta e mostra o motivo.

### Intenção

Explique o fluxo, não cada linha da tela. A ideia que precisa ficar é: **o produto tenta invalidar a comparação antes de alertar**.

### Entonação

Dê peso à frase:

> Só então calcula a diferença.

### Transição

> Agora, esse é o fluxo funcionando no produto.

---

## Slide 4: Demonstração

**Janela:** 1:20-1:55

### Fala

> Esta captura é real e foi feita durante France contra England. A TxLINE mostrava sessenta vírgula quatro por cento e a melhor oferta da Polymarket, oitenta e sete. Os dois feeds estavam ao vivo, mas as verificações de equivalência falharam. Por isso o motor suprimiu a comparação e não inventou um gap. Esse é o fail-closed funcionando em jogo real.

### Complemento curto

> O valor também está em mostrar quando os dados não podem ser comparados com segurança.

### Intenção

A captura é evidência real do produto durante o jogo. A sequência é:

1. identificar France vs England e a captura ao vivo;
2. mostrar as duas entradas;
3. apontar que a equivalência falhou;
4. mostrar o veredito fail-closed: **sem comparação válida**.

### Entonação

Faça uma pausa antes e depois de:

> Sem comparação válida.

### Transição

> Essa cautela não é apenas texto na interface. Ela está na arquitetura.

---

## Slide 5: Determinístico por design

**Janela:** 1:55-2:22

### Fala

> O motor não usa LLM para decidir se existe gap, porque esse cálculo precisa ser reproduzível. A TxLINE fornece consenso esportivo em uma arquitetura de proveniência ancorada na Solana. O World Cup Edge normaliza as fontes, verifica equivalência e aplica regras explícitas. A proveniência ajuda a auditar a origem; ela não transforma uma probabilidade em verdade.

### Intenção

Conecte tecnologia a confiança operacional:

- TxLINE fornece o consenso e a arquitetura de proveniência;
- o motor faz cálculo e equivalência de forma reproduzível;
- a camada de segurança suprime entradas inválidas;
- Solana é infraestrutura de proveniência, não decoração.

### Transição

> E esse valor se transforma em um modelo de negócio simples.

---

## Slide 6: Modelo de negócio

**Janela:** 2:22-2:44

### Fala

> Começamos por traders esportivos ativos como a Maya. O modelo proposto é SaaS freemium: Free com cobertura limitada; Pro, como hipótese de trinta e nove dólares por mês, com tempo real e alertas; e Team/API a partir de cento e noventa e nove dólares, com webhooks e integrações. Esses preços ainda serão validados em pilotos pagos.

### Intenção

Não defenda os preços como se já estivessem validados. Mostre que existe uma lógica clara de monetização e uma ordem de validação:

1. traders ativos;
2. cinco usuários recorrentes;
3. piloto pago;
4. expansão para Team/API.

### Transição

> E o próximo passo começa comigo.

---

## Slide 7: Founder, marco e CTA

**Janela:** 2:44-3:00

### Fala

> Construí sozinho o motor, a interface e o deploy. Agora quero cinco traders recorrentes para medir tempo economizado, comparações falsas evitadas e disposição para pagar. O QR está na tela. Escaneiem, testem e falem comigo. Obrigado.

### Intenção

Termine com execução, próximo marco e ação. Depois de **"Obrigado"**, pare. Não acrescente uma nova explicação.

# Script contínuo

> Eu sou Patrick Passos, engenheiro de software e fundador do World Cup Edge. Construí um monitor que compara o consenso esportivo da TxLINE com a cotação top-of-book da Polymarket e verifica o contexto antes de mostrar qualquer diferença.
>
> Para entender por que isso importa, conheça a Maya.
>
> A Maya representa meu cliente inicial: uma trader ativa de mercados de previsão. O objetivo dela é gerar retorno encontrando diferenças antes que o mercado se mova. Mas cada diferença exige conferir regras, o contrato exato, atualidade, liquidez e taxas em cinco etapas. Se ela demora, a cotação muda. Se erra, arrisca capital com uma comparação falsa.
>
> O World Cup Edge transforma esse processo manual em uma checagem única.
>
> O sistema consulta TxLINE e Polymarket em paralelo. Primeiro confirma se é o mesmo jogo, resultado e período. Depois checa atualidade, livro disponível e taxa dinâmica. Só então calcula a diferença e exige confirmação antes de alertar. Se qualquer entrada estiver ausente, antiga ou incompatível, ele falha fechado: não alerta e mostra o motivo.
>
> Agora, esse é o fluxo funcionando no produto.
>
> Esta captura é real e foi feita durante France contra England. A TxLINE mostrava sessenta vírgula quatro por cento e a melhor oferta da Polymarket, oitenta e sete. Os dois feeds estavam ao vivo, mas as verificações de equivalência falharam. Por isso o motor suprimiu a comparação e não inventou um gap. Esse é o fail-closed funcionando em jogo real.
>
> Essa cautela não é apenas texto na interface. Ela está na arquitetura.
>
> O motor não usa LLM para decidir se existe gap, porque esse cálculo precisa ser reproduzível. A TxLINE fornece consenso esportivo em uma arquitetura de proveniência ancorada na Solana. O World Cup Edge normaliza as fontes, verifica equivalência e aplica regras explícitas. A proveniência ajuda a auditar a origem; ela não transforma uma probabilidade em verdade.
>
> E esse valor se transforma em um modelo de negócio simples.
>
> Começamos por traders esportivos ativos como a Maya. O modelo proposto é SaaS freemium: Free com cobertura limitada; Pro, como hipótese de trinta e nove dólares por mês, com tempo real e alertas; e Team/API a partir de cento e noventa e nove dólares, com webhooks e integrações. Esses preços ainda serão validados em pilotos pagos.
>
> E o próximo passo começa comigo.
>
> Construí sozinho o motor, a interface e o deploy. Agora quero cinco traders recorrentes para medir tempo economizado, comparações falsas evitadas e disposição para pagar. O QR está na tela. Escaneiem, testem e falem comigo. Obrigado.

# Versão de emergência: 2 minutos e 30 segundos

Se o tempo for reduzido, mantenha os sete slides e corte as seguintes frases:

## Slide 1

Corte sua formação. Comece com:

> Eu sou Patrick Passos, fundador do World Cup Edge. Construí um monitor que compara TxLINE e Polymarket e verifica o contexto antes de mostrar qualquer diferença.

## Slide 2

Use:

> A Maya representa meu cliente inicial: uma trader ativa que busca retorno encontrando diferenças antes que o mercado se mova. Hoje ela valida regras, contrato, atualidade, liquidez e taxas manualmente. Se demora, perde a cotação; se erra, arrisca capital numa comparação falsa.

## Slide 3

Use:

> O World Cup Edge consulta as fontes, confirma que o contrato é equivalente, inclui a taxa e só alerta quando tudo passa. Qualquer falha suprime o alerta e explica o motivo.

## Slide 4

Use:

> Esta captura é real. A TxLINE mostrava sessenta vírgula quatro por cento e a Polymarket, oitenta e sete. A equivalência falhou, então o motor suprimiu a comparação e não inventou um gap.

## Slide 5

Use:

> O motor é determinístico. A TxLINE fornece consenso em uma arquitetura ancorada na Solana; o World Cup Edge aplica regras reproduzíveis e falha fechado. Proveniência ajuda a auditar a fonte, não garante a probabilidade.

## Slide 6

Use:

> O modelo é freemium: Free, Pro a uma hipótese de trinta e nove dólares e Team/API a partir de cento e noventa e nove. O foco inicial são traders ativos.

## Slide 7

Use:

> Construí o produto sozinho. Agora quero cinco traders recorrentes. O QR está na tela. Testem e falem comigo. Obrigado.

# Mapa de ensaio

## Checkpoints no cronômetro

| Momento | Onde você deve estar |
| :---- | :---- |
| 0:18 | Terminando a apresentação do produto, indo para Maya |
| 0:50 | Terminando a dor comercial, indo para o fluxo |
| 1:20 | Terminando as verificações, indo para a captura real |
| 1:55 | Terminando a captura real, indo para arquitetura |
| 2:22 | Terminando arquitetura, indo para negócio |
| 2:44 | Terminando preços, indo para founder e CTA |
| 3:00 | Palavra final: **Obrigado** |

## Como ensaiar

1. Faça uma leitura sem slides para acertar respiração e pronúncia.
2. Faça uma segunda leitura avançando os slides nos checkpoints.
3. Grave uma terceira tentativa no celular ou OBS.
4. Se passar de 3:05, corte palavras; não acelere.
5. Se ficar abaixo de 2:45, aumente as pausas depois da dor, do veredito e do CTA.

## Palavras que merecem ênfase

- **trader ativa**
- **gerar retorno**
- **cotação muda**
- **arrisca capital**
- **só então**
- **sem comparação válida**
- **determinístico**
- **cinco traders recorrentes**

# Ajuste recomendado no Slide 2

O slide atual usa **"Cinco fontes"**, mas taxas e planilha não são fontes independentes. Para maior precisão, prefira:

> **Cinco etapas. Uma janela curta.**

ou:

> **Cinco telas. Uma janela curta.**

Não é necessário mudar a estrutura visual, apenas a palavra.

# Limites de linguagem durante a fala

- O objetivo da Maya é gerar retorno; o produto não promete retorno.
- O produto mostra o que **merece investigação**; não diz comprar ou vender.
- Use **cotação top-of-book**; não use preço executável.
- Use **diferença de consenso** ou **gap**; não apresente como lucro garantido.
- Proveniência ajuda a auditar publicação e integridade; não prova que a probabilidade está correta.
- A captura é real, mas precisa ser apresentada como um caso em que a equivalência falhou e o alerta foi corretamente suprimido.
