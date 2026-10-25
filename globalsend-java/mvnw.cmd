@REM ----------------------------------------------------------------------------
@REM GlobalSend Maven Wrapper Command Script for Windows
@REM ----------------------------------------------------------------------------
@echo off
setlocal

set "DIR=%~dp0"
set "MAVEN_HOME=%DIR%.mvn\apache-maven-3.9.6"

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
    echo [Maven Wrapper] Downloading portable Apache Maven 3.9.6...
    if not exist "%DIR%.mvn" mkdir "%DIR%.mvn"
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip', '%DIR%.mvn\maven.zip'); Expand-Archive -Path '%DIR%.mvn\maven.zip' -DestinationPath '%DIR%.mvn' -Force; Remove-Item '%DIR%.mvn\maven.zip' -Force"
)

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
    echo Error: Embedded Maven could not be installed at %MAVEN_HOME%
    exit /b 1
)

"%MAVEN_HOME%\bin\mvn.cmd" %*
