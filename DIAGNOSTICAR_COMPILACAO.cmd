@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
set "LOG=%~dp0diagnostico-compilacao.txt"

echo Diagnostico do projeto Movimento RPG Blazor
echo Pasta: %CD%
echo Salvando detalhes em: "%LOG%"
echo.

> "%LOG%" echo ===== MOVIMENTO RPG - DIAGNOSTICO DE COMPILACAO =====
>> "%LOG%" echo Data: %DATE% %TIME%
>> "%LOG%" echo Pasta: %CD%
>> "%LOG%" echo.

where dotnet >nul 2>&1
if errorlevel 1 (
  echo ERRO: comando dotnet nao encontrado.
  >> "%LOG%" echo ERRO: dotnet nao foi encontrado no PATH.
  >> "%LOG%" echo Instale o SDK .NET 10 e o componente ASP.NET e desenvolvimento Web no instalador do Visual Studio.
  goto :falha
)

echo [1/3] Verificando SDKs instalados...
>> "%LOG%" echo ===== DOTNET --LIST-SDKS =====
dotnet --list-sdks >> "%LOG%" 2>&1
>> "%LOG%" echo.

echo [2/3] Restaurando dependencias NuGet...
>> "%LOG%" echo ===== DOTNET RESTORE =====
dotnet restore "MovimentoWeb.csproj" --verbosity minimal >> "%LOG%" 2>&1
if errorlevel 1 goto :falha
>> "%LOG%" echo.

echo [3/3] Compilando projeto...
>> "%LOG%" echo ===== DOTNET BUILD =====
dotnet build "MovimentoWeb.csproj" --configuration Debug --no-restore --verbosity minimal >> "%LOG%" 2>&1
if errorlevel 1 goto :falha

echo.
echo SUCESSO: projeto compilado.
echo Para iniciar: dotnet run --project MovimentoWeb.csproj --launch-profile "MovimentoWeb (HTTP)"
echo Depois, abra http://localhost:5084 no navegador.
>> "%LOG%" echo ===== RESULTADO: SUCESSO =====
goto :fim

:falha
echo.
echo FALHA: verifique o arquivo diagnostico-compilacao.txt.
echo Primeiro erro encontrado:
findstr /i /c:": error " /c:"error NU" /c:"error CS" /c:"error NETSDK" /c:"ERRO:" "%LOG%"
>> "%LOG%" echo ===== RESULTADO: FALHA =====

:fim
echo.
echo Se ainda houver erro, envie o arquivo diagnostico-compilacao.txt.
pause
endlocal
