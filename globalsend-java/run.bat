@echo off
REM ============================================================================
REM GlobalSend Java Web Application - Quick Launch Script (Windows)
REM Advanced Java End-Term Project
REM ============================================================================
setlocal
cd /d "%~dp0"

echo ============================================================================
echo   GLOBALSEND - ADVANCED JAVA ENTERPRISE WEB APPLICATION
echo ============================================================================
echo   Compiling and launching embedded Tomcat on port 8080...
echo   Open in browser: http://localhost:8080/
echo ============================================================================

call "%~dp0mvnw.cmd" compile exec:java
if %ERRORLEVEL% neq 0 (
    echo.
    echo Application failed with error code %ERRORLEVEL%.
    pause
)
