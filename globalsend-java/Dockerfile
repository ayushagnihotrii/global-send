# ==============================================================================
# Multi-stage Dockerfile for GlobalSend Java Web Application
# Deploys Jakarta Servlets 6.0 + JSP 3.1 onto Apache Tomcat 10.1 (JDK 21)
# Compatible with Render, Railway, Fly.io, AWS App Runner, and Docker
# ==============================================================================

# Stage 1: Build the WAR artifact with Maven
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compile and package WAR
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime Container with Apache Tomcat 10.1 & Eclipse Temurin JRE 21
FROM tomcat:10.1-jdk21-temurin

# Clean default webapps
RUN rm -rf /usr/local/tomcat/webapps/ROOT \
           /usr/local/tomcat/webapps/examples \
           /usr/local/tomcat/webapps/docs \
           /usr/local/tomcat/webapps/manager \
           /usr/local/tomcat/webapps/host-manager

# Deploy GlobalSend WAR as ROOT application
COPY --from=builder /workspace/target/globalsend.war /usr/local/tomcat/webapps/ROOT.war

# Create persistent storage directories
RUN mkdir -p /usr/local/tomcat/.data/uploads && chmod -R 777 /usr/local/tomcat/.data

# Default port
ENV PORT=8080
EXPOSE 8080

# Configure Tomcat to listen on $PORT (support for Render, Railway, Heroku)
CMD ["sh", "-c", "sed -i \"s/port=\\\"8080\\\"/port=\\\"${PORT}\\\"/g\" conf/server.xml && bin/catalina.sh run"]
