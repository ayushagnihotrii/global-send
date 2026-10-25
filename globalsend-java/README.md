# GlobalSend &mdash; Advanced Java Enterprise Web Application

> **University End-Term Examination Project &bull; Advanced Java**  
> **Architecture:** Jakarta EE 10 (Servlets 6.0, JSP 3.1) &bull; JDBC & HikariCP &bull; Concurrency (`ScheduledExecutorService`) &bull; Java NIO &bull; MVC & DAO Design Patterns &bull; Apple HIG UI

---

## 1. Executive Summary

**GlobalSend** is a high-performance, private file vault and ephemeral transfer web application. It allows authenticated users to securely store and share text snippets, code notes, bookmarked URLs, and arbitrary binary files (documents, images, videos) with **guaranteed deterministic auto-expiration** and single secret-key cryptography.

This project represents a complete, production-grade Advanced Java web application developed from first principles without heavy third-party web frameworks, strictly fulfilling university curriculum standards and enterprise best practices.

---

## 2. Key Architectural Highlights

* **MVC Architectural Pattern:** Strict decoupling of presentation (JSP / CSS), control flow (Jakarta Servlets), business logic (Service Layer), and persistence (DAO pattern).
* **Dual Database Engine with Zero-Config Failover:**
  * Primary: **MySQL 8.0+** using HikariCP connection pooling and parameterized PreparedStatements.
  * Automatic Failover: **SQLite** (`.data/globalsend.db`) for evaluation on machines without a running MySQL daemon.
* **Java NIO High-Throughput Storage:** Path-traversal-guarded file uploads with streaming byte transfers and MIME autodetection.
* **Autonomous Concurrency Cleaner:** Dedicated background daemon using `ScheduledExecutorService` running periodic cleanup cycles to safely purge expired records and physical disk files.
* **Apple Human Interface Design:** Native iOS 18 / macOS Sequoia aesthetic featuring glassmorphism, fluid micro-interactions, responsive cards, and clean typography.
* **Single Secret-Key Security:** Zero passwords or email recovery requirements. Derives cryptographic hashes via `PBKDF2WithHmacSHA256` with 10,000 iterations and per-user salt.

---

## 3. Technology Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language Runtime** | Java Development Kit (JDK) | 21 LTS | Core programming language & modern Java 21 features |
| **Servlet Specification** | Jakarta Servlet API | 6.0.0 | HTTP Request/Response processing & Filters |
| **View Engine** | Jakarta Server Pages (JSP) & JSTL | 3.1.0 / 3.0.1 | Server-side HTML template rendering |
| **Embedded Server** | Apache Tomcat Embed | 10.1.20 | Standalone, one-click execution without external server |
| **WAR Deployment** | Apache Tomcat / WildFly / GlassFish | 10.1+ | Standard WAR deployment support (`globalsend.war`) |
| **Connection Pool** | HikariCP | 5.1.0 | High-performance JDBC connection pooling |
| **Databases** | MySQL Connector/J & SQLite JDBC | 8.3.0 / 3.45.1 | Enterprise relational storage & portable failover |
| **Concurrency** | `java.util.concurrent` | JDK 21 | Scheduled background threads (`ScheduledExecutorService`) |
| **File I/O** | `java.nio.file` (NIO.2) | JDK 21 | Non-blocking file copy, delete, and path security |
| **Cryptography** | `javax.crypto` (PBKDF2) | JDK 21 | NIST-compliant salted key hashing & constant-time check |
| **Build System** | Apache Maven & Maven Wrapper | 3.9.6 | Dependency management and build automation |
| **Testing** | JUnit Jupiter | 5.10.2 | Unit and integration test suite |

---

## 4. Project Directory Structure

```
globalsend-java/
├── pom.xml                                   # Maven project configuration & dependencies
├── run.bat                                   # One-click launch script for Windows
├── run.sh                                    # One-click launch script for macOS / Linux
├── mvnw.cmd / mvnw                           # Maven Wrapper binaries (zero-install Maven)
├── database/
│   ├── schema.sql                            # Production MySQL 8.0+ DDL schema
│   └── sample-data.sql                       # Demonstration seed accounts and items
├── src/
│   ├── main/
│   │   ├── java/com/globalsend/
│   │   │   ├── Main.java                     # Embedded Tomcat application bootstrap
│   │   │   ├── config/
│   │   │   │   ├── AppConfig.java            # Properties loader with environment override
│   │   │   │   ├── DatabaseConfig.java       # HikariCP pool & MySQL/SQLite dual-engine
│   │   │   │   └── AppContextListener.java   # ServletContextListener lifecycle manager
│   │   │   ├── controller/
│   │   │   │   ├── HomeServlet.java          # Landing page handler (GET /)
│   │   │   │   ├── AuthServlet.java          # Login, Register, Logout controller
│   │   │   │   ├── DashboardServlet.java     # Vault feed, filtering & stats (GET /dashboard)
│   │   │   │   ├── UploadServlet.java        # Multipart file/note upload (POST /upload)
│   │   │   │   ├── FileDownloadServlet.java  # Java NIO file streaming (GET /download)
│   │   │   │   ├── ItemServlet.java          # Item detail, pin, favorite, delete
│   │   │   │   ├── ChatServlet.java          # 1-to-1 secure direct messaging
│   │   │   │   ├── SettingsServlet.java      # User profile & runtime diagnostic view
│   │   │   │   └── ApiServlet.java           # RESTful JSON endpoints (/api/*)
│   │   │   ├── dao/
│   │   │   │   ├── UserDAO.java              # JDBC user queries & storage accounting
│   │   │   │   ├── VaultItemDAO.java         # JDBC vault CRUD, batch purge & filters
│   │   │   │   ├── FileMetadataDAO.java      # JDBC file metadata tracking
│   │   │   │   ├── ChatDAO.java              # JDBC conversations & messages with transactions
│   │   │   │   └── TagDAO.java               # Many-to-many tag junction DAO
│   │   │   ├── model/
│   │   │   │   ├── User.java                 # User account entity
│   │   │   │   ├── VaultItem.java            # Vault item model with expiration math
│   │   │   │   ├── FileMetadata.java         # Physical file tracking entity
│   │   │   │   ├── ChatMessage.java          # Direct messaging entity
│   │   │   │   ├── Conversation.java         # 1-to-1 conversation container
│   │   │   │   ├── Tag.java                  # Category tag entity
│   │   │   │   └── UserStorageStats.java     # Storage quota computation model
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java          # Secret-key authentication & registration
│   │   │   │   ├── VaultService.java         # Core vault business rules & quota validation
│   │   │   │   ├── FileService.java          # Java NIO file storage & streaming download
│   │   │   │   ├── ChatService.java          # Direct message routing & contact search
│   │   │   │   └── FileExpirationService.java# Concurrency ScheduledExecutorService cleaner
│   │   │   ├── filter/
│   │   │   │   ├── AuthFilter.java           # Route protection & session validation
│   │   │   │   ├── LoggingFilter.java        # HTTP request auditing & performance logging
│   │   │   │   └── SecurityHeadersFilter.java# XSS, nosniff, and frame guard headers
│   │   │   └── util/
│   │   │       ├── PasswordUtil.java         # PBKDF2 hashing & SHA-256 fingerprinting
│   │   │       ├── FileUtil.java             # Java NIO safety, Path traversal guard, MIME
│   │   │       ├── ExpirationUtil.java       # Temporal arithmetic & duration parsing
│   │   │       └── JsonUtil.java             # Gson serialization helper
│   │   ├── resources/
│   │   │   ├── application.properties        # Application runtime configuration
│   │   │   └── application.properties.example# Environment configuration template
│   │   └── webapp/
│   │       ├── WEB-INF/
│   │       │   ├── web.xml                   # Jakarta EE 6.0 deployment descriptor
│   │       │   └── views/
│   │       │       ├── index.jsp             # Landing page
│   │       │       ├── login.jsp             # Authentication & Registration view
│   │       │       ├── dashboard.jsp         # User vault dashboard
│   │       │       ├── upload.jsp            # Transfer creation form
│   │       │       ├── item-detail.jsp       # Item details & actions view
│   │       │       ├── chat.jsp              # 1-to-1 direct messaging view
│   │       │       ├── settings.jsp          # Account settings & runtime diagnostic
│   │       │       ├── error.jsp             # Error handling page
│   │       │       └── components/           # Modular navbar, footer, and alerts
│   │       ├── assets/
│   │       │   ├── css/apple-theme.css       # Apple HIG iOS 18 glassmorphic design
│   │       │   └── js/app.js                 # Drag & drop, clipboard copy, toast notifications
│   │       └── index.jsp                     # Root entry point redirect
│   └── test/
│       └── java/com/globalsend/              # JUnit 5 automated test suite
```

---

## 5. Quick Start & Execution Guide

### Option A: One-Click Quick Launch (Recommended for Viva)

Double-click `run.bat` (Windows) or execute `./run.sh` (macOS / Linux) inside the `globalsend-java` folder:

```bash
cd globalsend-java
./run.bat
```

This compiles the project and launches the embedded Tomcat server on `http://localhost:8080/`.

### Option B: Maven Command Line

Using the included portable Maven Wrapper:

```bash
cd globalsend-java
./mvnw compile exec:java
```

### Option C: Deploying WAR to External Apache Tomcat

To generate a standalone deployable WAR file:

```bash
./mvnw clean package -DskipTests
```

The resulting `target/globalsend.war` can be copied directly to the `webapps/` folder of any standalone **Apache Tomcat 10.1+** installation.

---

## 6. Pre-Seeded Demonstration Accounts

For convenient evaluation and demonstration, the database comes pre-configured with the following test credentials:

| Username | Display Name | Master Secret Key | Role |
| :--- | :--- | :--- | :--- |
| `alice` | Alice Developer | `alice-secret-key-2026` | Test User 1 (Active items & notes) |
| `bob` | Bob Engineer | `bob-secret-key-2026` | Test User 2 (Direct Chat contact) |
| `professor` | Prof. Advanced Java | `viva-demo-key-2026` | Evaluator Account |

*(Tip: On the Sign In page, click any of the "Demo One-Click Login" pills at the bottom to automatically populate credentials!)*

---

## 7. Advanced Java Syllabus Topics Covered

| Topic | Implementation Location | Demonstration in Viva |
| :--- | :--- | :--- |
| **Jakarta Servlets** | `com.globalsend.controller.*` | Request lifecycle, `doGet`, `doPost`, `@MultipartConfig`, status codes |
| **Jakarta Server Pages** | `src/main/webapp/WEB-INF/views/` | JSTL expressions, scriptlets, modular `<jsp:include>`, dynamic HTML |
| **JDBC & Connection Pooling** | `com.globalsend.config.DatabaseConfig` | HikariCP pool, `PreparedStatement`, `ResultSet`, dual MySQL/SQLite |
| **Transactions (Commit/Rollback)** | `ChatDAO.java` (`conn.setAutoCommit(false)`) | Atomicity across message insertion and conversation timestamp update |
| **Servlet Filters** | `com.globalsend.filter.*` | Chained `LoggingFilter`, `AuthFilter`, and `SecurityHeadersFilter` |
| **Application Lifecycle Listeners** | `AppContextListener.java` | `@WebListener` startup/shutdown orchestration |
| **Concurrency & Background Threads** | `FileExpirationService.java` | Periodic background daemon using `ScheduledExecutorService` |
| **Java NIO (NIO.2)** | `FileUtil.java`, `FileService.java` | Path traversal guard, zero-copy `Files.copy`, streaming downloads |
| **Session Management** | `AuthServlet.java`, `AuthFilter.java` | `HttpSession`, session timeout, attribute binding, safe invalidation |
| **Security & Cryptography** | `PasswordUtil.java` | `PBKDF2WithHmacSHA256`, 16-byte salt, constant-time `MessageDigest.isEqual` |
| **Design Patterns** | Entire codebase | MVC, DAO, Service Layer, Singleton, Factory, Builder |
| **Modern Java 21 Features** | Entire codebase | Records, Pattern Matching switch expressions, try-with-resources |

---

## 8. Database Setup (Optional for MySQL)

If you wish to run with MySQL:

1. Create database and tables:
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/sample-data.sql
   ```
2. Verify connection properties in `src/main/resources/application.properties`.
3. If MySQL is not running, the application **automatically detects it and initializes a local SQLite database** without throwing errors!
