# Movimento RPG — Blazor WebAssembly Standalone

Versão web do projeto `movimento` (Windows Forms, C#/.NET 10), preparada para o **GitHub Pages**.

## Correção adicional — erro CS1069 no Form3.cs

O diagnóstico da versão anterior encontrou `CS1069` em `Game/Form3.cs`, linhas 398 e 399: referências a `System.Drawing.Drawing2D.LineCap.Round`, tipo não disponível no projeto WebAssembly.

Substituí essas duas referências por `LineCap.Round`, o enum próprio definido em `Game/WinFormsCanvasCompat.cs`, que mantém as extremidades arredondadas dos bastões no Canvas do navegador.

Esta versão **não** depende de `System.Drawing.Common` nem de `System.Windows.Forms`. Não instale esses pacotes para tentar resolver o erro de `LineCap`.

## Correções anteriores

- Corrigida a camada `Game/WinFormsCanvasCompat.cs`, que não definia o tipo `LineCap` nem `Pen.StartCap`/`Pen.EndCap`. Esses membros são usados pelo código existente em `Game/Form4.cs` e `Game/Form5.cs` e impediam a compilação.
- O Canvas agora respeita as extremidades arredondadas dos traços (`lineCap`).
- O `.csproj` declara explicitamente `OutputType=Exe`, para simplificar o diagnóstico da inicialização.
- Incluído `DIAGNOSTICAR_COMPILACAO.cmd`, que verifica a disponibilidade do .NET, restaura pacotes e compila, registrando falhas em `diagnostico-compilacao.txt`.

**Limite de verificação:** este ambiente não tem o SDK `.NET` e, portanto, não foi possível executar `dotnet build`. A correção remove incompatibilidades identificadas por inspeção do código, mas não substitui a compilação e os testes no Windows.

### Diagnosticar antes de usar o Visual Studio

1. Extraia o ZIP em uma pasta nova e abra a pasta no Explorador de Arquivos.
2. Dê duplo clique em **`DIAGNOSTICAR_COMPILACAO.cmd`**.
3. Se o resultado for `SUCESSO`, abra `MovimentoWeb.sln` no Visual Studio 2026, marque `MovimentoWeb` como projeto inicial e execute com `Ctrl+F5`.
4. Se o resultado for `FALHA`, abra `diagnostico-compilacao.txt` e procure a **primeira linha com `error`**; envie esse arquivo para análise. O erro de DLL ausente normalmente é consequência de uma falha anterior de compilação.

## O que foi convertido

O projeto original tinha um menu Windows Forms (`Form1`) e quatro modos (`Form2` a `Form5`).
Nesta edição:

- O menu passou para **`Pages/Index.razor`** com abas para os quatro modos.
- As regras originais, incluindo movimentos, combate, seleção de personagens, poderes, animações e cutscenes, foram mantidas em C# (`Game/Form2.cs` a `Game/Form5.cs`).
- As chamadas gráficas do WinForms foram substituídas por uma camada portátil (`Game/WinFormsCanvasCompat.cs`) que envia comandos ao **HTML Canvas 2D** (`wwwroot/js/gameCanvas.js`).
- Os controles funcionam via teclado e botões na própria página (úteis em telas sensíveis ao toque).
- O aplicativo usa **Blazor WebAssembly autônomo**: GitHub Pages hospeda os arquivos estáticos, sem servidor ASP.NET Core ativo ou banco de dados.

> O código desenha personagens e cenários por primitivas gráficas; não precisa de imagens externas. O `Form1` original carregava uma imagem por caminho local (`C:\Users\...`), inacessível pela internet; ela foi substituída por um menu web.

## Abrir e executar no Visual Studio (Windows)

**Requisitos:** Visual Studio **2026 (18.0 ou superior)**, componente **Desenvolvimento para ASP.NET e Web** e **SDK .NET 10**. Visual Studio 2022 não oferece suporte oficial a projetos .NET 10.

1. Extraia o ZIP em uma pasta nova. **Não execute o projeto dentro do ZIP.** Antes de abrir o Visual Studio, rode `DIAGNOSTICAR_COMPILACAO.cmd` para confirmar se a compilação funciona.
2. Abra o arquivo **`MovimentoWeb.sln`** pelo Visual Studio.
3. No Gerenciador de Soluções, clique com o botão direito em **MovimentoWeb** e escolha **Definir como Projeto de Inicialização**.
4. Na barra de execução, selecione o perfil **MovimentoWeb (HTTP)**.
5. Clique em **Compilar → Recompilar Solução** (`Ctrl+Shift+B`) para ver possíveis erros de compilação.
6. Use **Ctrl+F5** para iniciar sem o depurador (recomendado no primeiro teste); depois, se funcionar, use **F5** para depurar e abra `http://localhost:5084` no navegador, se necessário.

O arquivo `Properties/launchSettings.json` configura o servidor de desenvolvimento do Blazor WebAssembly. A pasta `bin/Debug/net10.0/` e `MovimentoWeb.dll` são **resultados da compilação**, portanto não estão dentro do ZIP.

Se surgir erro "Não foi possível localizar MovimentoWeb.dll", abra **Exibir → Lista de Erros** ou **Exibir → Saída → Mostrar saída de: Compilação**. Corrija o primeiro erro de compilação antes de usar F5. Também é possível testar o projeto pelo terminal:

```powershell
dotnet --version
dotnet restore MovimentoWeb.csproj
dotnet build MovimentoWeb.csproj
dotnet run --project MovimentoWeb.csproj --launch-profile "MovimentoWeb (HTTP)"
```

Se `dotnet --version` não exibir uma versão iniciada em `10.`, instale/configure o SDK 10. Se o Visual Studio for 2022, atualize para 2026. Se a compilação passar e a depuração não abrir, feche o Visual Studio, apague as pastas locais `bin`, `obj` e `.vs`, reabra o `.sln` e recompile.

## Execução local

Instale o **.NET SDK 10** (não é preciso Windows), abra esta pasta e execute:

```bash
dotnet restore
dotnet run
```

Abra a URL local exibida no terminal. Para gerar o site estático:

```bash
dotnet publish MovimentoWeb.csproj --configuration Release
```

O site será publicado em `bin/Release/net10.0/publish/wwwroot/`. Para testar a pasta publicada, sirva-a por HTTP; abrir `index.html` via `file://` não funciona com Blazor WebAssembly.

## Publicar no GitHub Pages

O repositório já contém `.github/workflows/pages.yml` para compilar e publicar o site.

1. Crie um repositório no GitHub, por exemplo **`movimento-rpg`**.
2. Envie **o conteúdo desta pasta**, incluindo a pasta oculta `.github`, para a raiz do repositório. Configure a branch como `main` (ou `master`).
3. No repositório, abra **Settings → Pages**.
4. Em **Build and deployment → Source**, selecione **GitHub Actions**.
5. Abra **Actions**, acompanhe o workflow **Publicar Movimento RPG no GitHub Pages** e confira se o deploy terminou com sucesso.

Endereço esperado depois da publicação:

`https://SEU-USUARIO.github.io/movimento-rpg/`

O workflow identifica automaticamente o nome real do repositório e atualiza o `<base href>` necessário para os caminhos do Blazor. Também cria `404.html` e inclui `.nojekyll` para permitir a pasta `_framework`.

Se o repositório se chamar `SEU-USUARIO.github.io`, o site será disponibilizado na raiz: `https://SEU-USUARIO.github.io/`.

## Comandos

| Ação | Jogador 1 | Jogador 2 |
| --- | --- | --- |
| Mover | `W A S D` | `↑ ← ↓ →` |
| Atacar | `F` | `Enter` |
| Poder (modos 03/04) | `Q` | `Shift` |
| Selecionar personagem (modos 03/04) | `A` / `D` | `←` / `→` |
| Confirmar seleção | `F` | `Enter` |

O botão **Reiniciar** restaura o modo atual. Os quatro modos podem ser trocados pelas abas no topo.

## Arquivos principais

```text
DIAGNOSTICAR_COMPILACAO.cmd
MovimentoWeb.sln
MovimentoWeb.csproj
Properties/launchSettings.json
Program.cs
App.razor
_Imports.razor
Pages/Index.razor
Game/
  Form2.cs
  Form3.cs
  Form4.cs
  Form5.cs
  WinFormsCanvasCompat.cs
wwwroot/
  index.html
  .nojekyll
  css/app.css
  js/gameCanvas.js
.github/workflows/pages.yml
```

## Observações técnicas

- Dois jogadores jogam **localmente no mesmo navegador**, não pela internet em computadores separados. Para multijogador online real seria necessário um serviço adicional (incompatível com hospedagem puramente estática no GitHub Pages).
- Cenas e renderização dependem do navegador/Canvas; fontes e quebras de linha podem ficar ligeiramente diferentes do Windows Forms.
- O motor roda a aproximadamente 33 atualizações por segundo, como o timer de 30 ms do original.
- **Compilação não executada neste ambiente:** não há SDK `dotnet` instalado. O workflow no GitHub faz a compilação; se surgir erro no Actions, consulte os logs para localizar a linha.
- Não são necessárias chaves, API externa ou configuração de backend.
