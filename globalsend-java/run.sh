#!/bin/bash
# ============================================================================
# GlobalSend Java Web Application - Quick Launch Script (macOS / Linux)
# Advanced Java End-Term Project
# ============================================================================
cd "$(dirname "$0")"

echo "============================================================================"
echo "  GLOBALSEND - ADVANCED JAVA ENTERPRISE WEB APPLICATION"
echo "============================================================================"
echo "  Compiling and launching embedded Tomcat on port 8080..."
echo "  Open in browser: http://localhost:8080/"
echo "============================================================================"

chmod +x ./mvnw
./mvnw compile exec:java
