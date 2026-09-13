# Exame Instrutor

Aplicação web (sem instalação, sem servidor) para estudar e simular o exame do curso de instrutor de condução. Funciona em qualquer telemóvel, tablet ou computador, com um simples link.

Banco de **1000 perguntas reais**, organizadas em 5 matérias:

| Matéria | Perguntas |
|---|---|
| Mecânica/Técnica Automóvel | 300 |
| Direito Rodoviário | 257 |
| Psicologia | 179 |
| Pedagogia | 142 |
| Segurança Rodoviária | 122 |

## Funcionalidades

- **Exame simulado**: 100 perguntas por tentativa, com a mesma proporção entre matérias que o banco todo (30 Mecânica, 26 Direito, 18 Psicologia, 14 Pedagogia, 12 Segurança). Sem correção durante o exame — o resultado só aparece no fim, com nota geral, resultado por matéria e a lista de perguntas erradas com explicação.
- **Estudar por matéria**: escolhe uma das 5 matérias e depois um tema específico (ou "todas"), com correção e explicação imediatas a cada resposta.
- **Revisão**: junta automaticamente todas as perguntas em que a última resposta foi errada, para reveres só essas.
- **Estatísticas**: quantas perguntas já praticaste e com que taxa de acerto, por matéria, mais o histórico de todos os exames simulados feitos.

Todo o progresso fica guardado **no próprio dispositivo** (localStorage do navegador) — não há conta, não há servidor, não há dados enviados para lado nenhum. Isto também significa que o progresso não é partilhado entre, por exemplo, o telemóvel e o computador: cada aparelho guarda o seu.

## Publicar no GitHub Pages (acesso por link, em qualquer dispositivo)

1. Cria um repositório novo no GitHub (pode ser privado ou público).
2. Faz upload de **todo o conteúdo desta pasta** para esse repositório (mantendo a estrutura: `index.html`, `css/`, `js/`, `data/`).
   - Mais simples: no GitHub, "Add file" → "Upload files", arrasta tudo.
   - Ou por linha de comandos:
     ```bash
     git init
     git add .
     git commit -m "Exame Instrutor"
     git branch -M main
     git remote add origin https://github.com/<o-teu-utilizador>/<nome-do-repo>.git
     git push -u origin main
     ```
3. No repositório, vai a **Settings → Pages**.
4. Em "Build and deployment", escolhe **Deploy from a branch**, branch `main`, pasta `/ (root)`. Guarda.
5. Passado um ou dois minutos, o GitHub mostra o link, algo como:
   `https://<o-teu-utilizador>.github.io/<nome-do-repo>/`
6. Abre esse link em qualquer telemóvel, tablet ou computador. Podes adicionar à página inicial do telemóvel (Partilhar → "Adicionar ao ecrã principal") para abrir como se fosse uma app.

### Utilização offline

Na primeira visita ao link do GitHub Pages é necessária internet para carregar e guardar a aplicação. Depois de a página carregar completamente, o service worker guarda os ficheiros da aplicação no dispositivo. A partir daí, a aplicação continua disponível sem internet no mesmo navegador/dispositivo. Se limpares os dados do site ou usares outro dispositivo, será necessário abrir o link online uma vez novamente.

## Correr localmente (sem GitHub)

Basta abrir o ficheiro `index.html` a fazer duplo clique — os dados das perguntas estão embutidos no ficheiro `data/questions.js`, por isso funciona mesmo sem ligação à internet e sem precisar de um servidor. As duas fontes tipográficas (Space Grotesk, Source Sans 3) vêm da Google Fonts; sem internet, a aplicação usa uma fonte do sistema em alternativa — nada deixa de funcionar.

## Estrutura de ficheiros

```
index.html          página única da aplicação
css/style.css        estilos
js/app.js            toda a lógica (exame, prática, revisão, estatísticas)
data/questions.js     banco de 1000 perguntas (gerado a partir do curso original)
```

## Notas

- A aplicação inclui um login por utilizador e password, com sessão temporária de 8 horas guardada apenas no separador atual. As credenciais iniciais são `instrutor` / `AlteraEstaPassword!2026`; altera-as em `js/auth.js` antes de publicar.
- Esta autenticação é apenas client-side e não protege dados contra alguém com acesso ao código-fonte ou às ferramentas do navegador. Para segurança real online, a validação deve ser movida para um backend ou serviço de autenticação (por exemplo, Supabase/Firebase), mantendo as perguntas e o progresso protegidos no servidor.

- A percentagem de 70% usada para colorir o resultado do exame (verde/vermelho) é apenas uma referência visual, **não é a nota oficial de aprovação** do curso — confirma o critério real junto da entidade formadora.
- Para recomeçar do zero num dispositivo (apagar progresso, estatísticas e histórico de exames), usa o botão "Repor todo o progresso" na aba Estatísticas.
