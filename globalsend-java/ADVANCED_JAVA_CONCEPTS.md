# Advanced Java Concepts & Architectural Mapping Guide

> **Course:** Advanced Java Programming / Enterprise Java  
> **Project:** GlobalSend Enterprise Web Application  
> **Runtime Target:** Java 21 LTS &bull; Jakarta EE 10 (Servlet 6.0, JSP 3.1) &bull; Apache Tomcat 10.1+

This document serves as an exhaustive academic reference linking each fundamental Advanced Java syllabus topic to its concrete, verified implementation in the GlobalSend codebase.

---

## Concept Mapping Summary Matrix

| # | Advanced Java Syllabus Topic | Core Class / File Location | Design Pattern / Mechanism Used |
| :--- | :--- | :--- | :--- |
| **1** | **Jakarta Servlets 6.0** | `com.globalsend.controller.*` | Front Controller / Request Dispatcher / MultipartConfig |
| **2** | **Jakarta Server Pages (JSP 3.1)** | `src/main/webapp/WEB-INF/views/*.jsp` | Dynamic View Templates, Expression Language, Modular Includes |
| **3** | **JDBC & Connection Pooling** | `com.globalsend.config.DatabaseConfig` | HikariCP DataSource, Dual MySQL & SQLite Engine |
| **4** | **PreparedStatements & SQL Injection Defense** | `com.globalsend.dao.*` | Parameterized Queries with Type-Safe Value Binding |
| **5** | **ACID Transactions (Commit / Rollback)** | `com.globalsend.dao.ChatDAO` | `setAutoCommit(false)`, `commit()`, `rollback()` Exception Safety |
| **6** | **HTTP Session Management** | `AuthServlet.java`, `AuthFilter.java` | Stateful `HttpSession`, Session Invalidation, Attribute Binding |
| **7** | **Servlet Filters & Interceptors** | `com.globalsend.filter.*` | Filter Chain (`AuthFilter`, `LoggingFilter`, `SecurityHeadersFilter`) |
| **8** | **Application Lifecycle Listeners** | `AppContextListener.java` | `@WebListener`, `ServletContextListener` Startup / Teardown |
| **9** | **Concurrency & Thread Pooling** | `FileExpirationService.java` | `ScheduledExecutorService`, Daemon Thread, Fixed-Delay Scheduling |
| **10** | **Java NIO (NIO.2) & Stream I/O** | `FileUtil.java`, `FileService.java` | `Path`, `Files.copy`, Zero-Copy Channel Streaming, Path Traversal Guard |
| **11** | **Cryptography & Security Engineering** | `PasswordUtil.java` | PBKDF2 with HMAC-SHA256, 16-Byte Random Salt, Constant-Time Compare |
| **12** | **Design Patterns & Clean Architecture** | Entire Project Structure | MVC, DAO, Service Layer, Singleton, Factory Method, Builder |

---

## Detailed Topic-by-Topic Breakdown

### 1. Jakarta Servlets 6.0 (`jakarta.servlet.http.HttpServlet`)

* **Relevant Files:**
  * [`HomeServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/HomeServlet.java)
  * [`AuthServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/AuthServlet.java)
  * [`DashboardServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/DashboardServlet.java)
  * [`UploadServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/UploadServlet.java)
  * [`FileDownloadServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/FileDownloadServlet.java)
  * [`ItemServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/ItemServlet.java)
  * [`ChatServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/ChatServlet.java)
  * [`SettingsServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/SettingsServlet.java)
  * [`ApiServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/ApiServlet.java)

* **Key Concepts Demonstrated:**
  * **Lifecycle Methods:** Overriding `doGet()` for idempotent read requests and `doPost()` for state-altering operations.
  * **Request Dispatching:** Forwarding control and model data to view templates using `req.getRequestDispatcher("/WEB-INF/views/...").forward(req, resp);`.
  * **HTTP Redirection:** Post-Redirect-Get (PRG) pattern implemented via `resp.sendRedirect(...)` to prevent form resubmission on page refresh.
  * **Multipart Processing:** Configured with `@MultipartConfig` on `UploadServlet` with memory thresholds (`fileSizeThreshold = 2MB`), max file size (`maxFileSize = 50MB`), and reading binary parts via `req.getPart("file")`.
  * **HTTP Status Codes:** Deliberate usage of `200 OK`, `302 Found`, `400 Bad Request`, `401 Unauthorized`, and `404 Not Found`.

---

### 2. Jakarta Server Pages (JSP 3.1)

* **Relevant Files:**
  * [`index.jsp`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/webapp/WEB-INF/views/index.jsp)
  * [`login.jsp`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/webapp/WEB-INF/views/login.jsp)
  * [`dashboard.jsp`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/webapp/WEB-INF/views/dashboard.jsp)
  * [`upload.jsp`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/webapp/WEB-INF/views/upload.jsp)
  * [`item-detail.jsp`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/webapp/WEB-INF/views/item-detail.jsp)
  * [`chat.jsp`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/webapp/WEB-INF/views/chat.jsp)
  * [`settings.jsp`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/webapp/WEB-INF/views/settings.jsp)
  * [`navbar.jsp` & `footer.jsp`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/webapp/WEB-INF/views/components/)

* **Key Concepts Demonstrated:**
  * **Page Directives:** `<%@ page contentType="text/html;charset=UTF-8" language="java" %>` and `<%@ page isErrorPage="true" %>`.
  * **Modular View Composition:** Reusable navigation and footer components dynamically included via `<jsp:include page="components/navbar.jsp" />`.
  * **Protection of Views:** All sensitive JSP templates are located inside `/WEB-INF/views/`, making them inaccessible directly via URL and strictly requiring servlet mediation.
  * **Model Attribute Binding:** Extracting request-scoped attributes populated by controllers: `(List<VaultItem>) request.getAttribute("items")`.

---

### 3. JDBC & HikariCP Connection Pooling

* **Relevant Files:**
  * [`DatabaseConfig.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/config/DatabaseConfig.java)
  * [`schema.sql`](file:///d:/fun%20projects/global%20send/globalsend-java/database/schema.sql)

* **Key Concepts Demonstrated:**
  * **Connection Pooling:** Uses `HikariDataSource` configured with maximum pool size (10 connections), minimum idle connections (2), and connection timeouts.
  * **Thread Safety:** Thread-safe singleton `DatabaseConfig.getConnection()` providing pooled database connections to DAOs.
  * **Resource Lifecycle:** Clean closure of pools during server shutdown via `DatabaseConfig.shutdown()`.
  * **Dual Engine Architecture:** Transparent failover between MySQL and SQLite, ensuring the application runs out of the box regardless of examiner environment.

---

### 4. PreparedStatements & Security Protection

* **Relevant Files:**
  * [`UserDAO.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/dao/UserDAO.java)
  * [`VaultItemDAO.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/dao/VaultItemDAO.java)
  * [`ChatDAO.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/dao/ChatDAO.java)

* **Key Concepts Demonstrated:**
  * **Zero SQL Injection:** Not a single raw string concatenation is used in SQL execution. All user inputs are bound via `ps.setString()`, `ps.setLong()`, `ps.setTimestamp()`, and `ps.setBoolean()`.
  * **Try-With-Resources:** Every JDBC block uses Java 7+ try-with-resources to guarantee deterministic release of `Connection`, `PreparedStatement`, and `ResultSet` handles even in error cases.

---

### 5. ACID Transaction Management

* **Relevant File:**
  * [`ChatDAO.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/dao/ChatDAO.java#L125-L155)

* **Key Concepts Demonstrated:**
  * **Transaction Boundaries:** In `createMessage()`, auto-commit mode is explicitly disabled: `conn.setAutoCommit(false)`.
  * **Multi-Table Atomic Operations:** The message record is inserted into `messages` AND the conversation updated timestamp is updated in `conversations` within the same transaction.
  * **Commit & Rollback:** Upon successful execution, `conn.commit()` commits the changes atomically; if any `SQLException` occurs, `conn.rollback()` restores the database state and re-throws the exception.

---

### 6. HTTP Session Management & Route Guarding

* **Relevant Files:**
  * [`AuthServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/AuthServlet.java)
  * [`AuthFilter.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/filter/AuthFilter.java)

* **Key Concepts Demonstrated:**
  * **Session Creation:** `req.getSession(true)` on successful authentication.
  * **Session State:** Storing authenticated user object: `session.setAttribute("currentUser", user)`.
  * **Inactivity Timeouts:** Programmatically setting max inactive interval to 1800 seconds (30 minutes).
  * **Session Invalidation:** Terminating user session and clearing cookies on logout via `session.invalidate()`.

---

### 7. Servlet Filters & Chained Interception

* **Relevant Files:**
  * [`AuthFilter.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/filter/AuthFilter.java)
  * [`LoggingFilter.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/filter/LoggingFilter.java)
  * [`SecurityHeadersFilter.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/filter/SecurityHeadersFilter.java)

* **Key Concepts Demonstrated:**
  * **Filter Ordering:** Chained filters registered via `web.xml` and `@WebFilter`.
  * **Security Headers Enforcement:** Injects `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, and `X-XSS-Protection` on every response.
  * **Performance Auditing:** `LoggingFilter` calculates request duration using `System.currentTimeMillis()` and prints structured audit logs.
  * **Access Control:** `AuthFilter` intercepts protected URLs (`/dashboard`, `/upload`, `/chat`, `/settings`, `/api/*`) and redirects unauthenticated requests.

---

### 8. Concurrency & Multi-Threading (`ScheduledExecutorService`)

* **Relevant File:**
  * [`FileExpirationService.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/service/FileExpirationService.java)

* **Key Concepts Demonstrated:**
  * **Executor Framework:** Uses `Executors.newSingleThreadScheduledExecutor` with a custom `ThreadFactory` naming daemon threads (`GlobalSend-FileExpirationCleaner`).
  * **Periodic Scheduling:** Uses `scheduleWithFixedDelay(this::runCleanupCycle, 10, intervalSeconds, TimeUnit.SECONDS)`.
  * **Autonomous Sweeper:** Queries expired records (`expires_at <= now`), physically unlinks disk files via Java NIO, restores user storage balances, and deletes database rows.
  * **Graceful Termination:** Shuts down thread pool cleanly on application context destroy (`awaitTermination` with 5-second deadline).

---

### 9. Java NIO.2 (`java.nio.file`)

* **Relevant Files:**
  * [`FileUtil.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/util/FileUtil.java)
  * [`FileService.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/service/FileService.java)
  * [`FileDownloadServlet.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/controller/FileDownloadServlet.java)

* **Key Concepts Demonstrated:**
  * **Path Normalization:** Resolving absolute paths with `normalize().toAbsolutePath()`.
  * **Path Traversal Security:** Checking `targetPath.startsWith(uploadDir.toAbsolutePath())` to prevent directory traversal exploits (`../`).
  * **Streaming Transfers:** Direct byte transfer using `Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING)` and `Files.copy(path, response.getOutputStream())`.
  * **MIME Probing:** Calling `Files.probeContentType(path)` for accurate content-type negotiation.

---

### 10. Cryptography & Security Engineering

* **Relevant File:**
  * [`PasswordUtil.java`](file:///d:/fun%20projects/global%20send/globalsend-java/src/main/java/com/globalsend/util/PasswordUtil.java)

* **Key Concepts Demonstrated:**
  * **Key Derivation Function:** `SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")` with 10,000 iterations and 256-bit output.
  * **Cryptographic Salting:** 16-byte cryptographically secure random salt generated via `java.security.SecureRandom`.
  * **Timing Attack Prevention:** Constant-time hash verification using `java.security.MessageDigest.isEqual()`.
  * **Deterministic Fingerprinting:** Computes SHA-256 digest of secret keys to display verifiable fingerprints without storing or exposing plain credentials.
