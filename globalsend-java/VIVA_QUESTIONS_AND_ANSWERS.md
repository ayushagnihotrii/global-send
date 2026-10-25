# GlobalSend &mdash; Comprehensive Viva Examination Questions & Answers

This guide contains the most critical viva questions examiners ask regarding Enterprise and Advanced Java web applications, along with rigorous, technically articulate answers specifically mapped to the GlobalSend codebase.

---

## 1. Servlet & JSP Architecture

### Q1: What is the lifecycle of a Jakarta Servlet, and how is it managed?
**Answer:**
A Servlet's lifecycle is managed entirely by the servlet container (Apache Tomcat). It consists of four distinct phases:
1. **Loading and Instantiation:** The container loads the servlet class (e.g., `DashboardServlet`) and instantiates it via its default constructor.
2. **Initialization (`init`):** The container calls the `init(ServletConfig config)` method exactly once. This is used for one-time initialization, such as reading configuration parameters.
3. **Request Handling (`service`):** For each incoming client request, the container spawns or allocates a thread from its HTTP connector thread pool and invokes `service(HttpServletRequest, HttpServletResponse)`. The `HttpServlet` base class inspects the HTTP method and delegates to specific handlers like `doGet()` or `doPost()`.
4. **Destruction (`destroy`):** When the container stops or the application is undeployed, it calls `destroy()` to release resources before garbage collection.

In GlobalSend, servlets are configured via `web.xml` and annotations (`@WebServlet`, `@MultipartConfig`), and initialized once on application deployment.

---

### Q2: What is the difference between `RequestDispatcher.forward()` and `HttpServletResponse.sendRedirect()`? Where did you use each in GlobalSend?
**Answer:**
* **`forward(req, resp)` (Server-Side):**
  * Handled entirely within the web server. The client is unaware that another resource is generating the response; the browser URL remains unchanged.
  * Request attributes (`request.setAttribute()`) are preserved across the forward.
  * **Used in GlobalSend:** In `DashboardServlet`, `ItemServlet`, and `ChatServlet` to forward the populated model data to view templates located inside `/WEB-INF/views/` (e.g., `req.getRequestDispatcher("/WEB-INF/views/dashboard.jsp").forward(req, resp);`).
* **`sendRedirect(url)` (Client-Side):**
  * The server sends an HTTP 302 Found response with a `Location` header back to the browser. The browser initiates an entirely new HTTP GET request to that URL, updating the address bar.
  * Any previous request-scoped attributes are lost (though `HttpSession` attributes persist).
  * **Used in GlobalSend:** In `AuthServlet`, `UploadServlet`, and `ItemServlet` following state-altering POST operations to implement the **Post-Redirect-Get (PRG)** pattern, which prevents duplicate submissions when a user refreshes the page.

---

### Q3: Why are your JSP files stored inside `/WEB-INF/views/` instead of directly under the webapp root?
**Answer:**
Under the Jakarta Servlet specification, files placed inside the `/WEB-INF/` directory are **protected by the container** and cannot be requested directly by a client using a browser URL (e.g., typing `http://localhost:8080/WEB-INF/views/dashboard.jsp` returns an HTTP 404).

This guarantees that:
1. Users cannot bypass authentication filters and controllers to view incomplete or unpopulated templates.
2. Every request must be validated, processed, and enriched with business data by its designated Servlet before rendering.

---

## 2. JDBC & Connection Pooling

### Q4: Why did you use HikariCP rather than standard `DriverManager.getConnection()`?
**Answer:**
`DriverManager.getConnection()` creates a brand-new physical socket connection to the database on every single invocation. This involves:
* TCP handshake overhead.
* SSL/TLS negotiation.
* Database user authentication.
* Session initialization on the database server.

Under concurrent web traffic, opening and closing physical connections for every HTTP request causes severe latency spikes and can quickly exhaust database connection limits.

**HikariCP** maintains a pre-allocated pool of active connections (configured via `DatabaseConfig.java` with `maximumPoolSize=10` and `minimumIdle=2`). When a DAO calls `dataSource.getConnection()`, it borrows an existing, established connection in sub-millisecond time. When the DAO closes the connection via try-with-resources, the connection is returned to the pool rather than physically closed.

---

### Q5: How does GlobalSend protect against SQL Injection attacks?
**Answer:**
GlobalSend enforces a strict policy: **100% of database queries use `java.sql.PreparedStatement` with parameterized placeholders (`?`)**. Not a single query uses string concatenation for user parameters.

When a `PreparedStatement` is created:
1. The SQL query structure is sent to the database engine and pre-compiled.
2. Values are bound using type-safe methods (`ps.setString()`, `ps.setLong()`, `ps.setTimestamp()`).
3. The database engine treats the bound parameters strictly as literal values, never as executable SQL tokens, completely neutralizing SQL injection attempts such as `' OR '1'='1`.

---

### Q6: How do you manage ACID transactions in your application? Give an example from your code.
**Answer:**
In `ChatDAO.java`, sending a direct message requires two database operations:
1. Inserting the new message into the `messages` table.
2. Updating the `updated_at` timestamp in the `conversations` table so the chat thread moves to the top of both users' lists.

To guarantee atomicity and consistency, we manually control transaction boundaries:
```java
Connection conn = DatabaseConfig.getConnection();
try {
    conn.setAutoCommit(false); // Begin transaction
    
    psMsg.executeUpdate();     // Step 1
    psConv.executeUpdate();    // Step 2
    
    conn.commit();             // Commit atomically
} catch (SQLException ex) {
    conn.rollback();           // Roll back both operations on failure
    throw ex;
} finally {
    conn.setAutoCommit(true);  // Restore default state
    conn.close();
}
```
If the server crashes or the second query fails, the entire transaction is rolled back, preventing orphaned messages or desynchronized timestamps.

---

## 3. Session Management & Filters

### Q7: How does HTTP Session Management work in Java, and how does `AuthFilter` use it?
**Answer:**
Because HTTP is a stateless protocol, the servlet container maintains state using an `HttpSession` object associated with a unique cookie called `JSESSIONID`:
1. When a user authenticates in `AuthServlet`, the server invokes `req.getSession(true)`, which generates a cryptographically random session ID and returns a `Set-Cookie: JSESSIONID=...; HttpOnly` header to the browser.
2. In subsequent requests, the browser transmits the cookie back to the server.
3. In `AuthFilter.java`, `doFilter()` checks:
   ```java
   HttpSession session = httpRequest.getSession(false);
   User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
   ```
   If `currentUser` is null and the requested route is protected (`/dashboard`, `/upload`, `/chat`), the filter halts execution and issues a redirect to `/login?redirect=...`.

---

### Q8: What is a Servlet Filter Chain, and what filters are implemented in GlobalSend?
**Answer:**
A Filter Chain is an implementation of the **Intercepting Filter pattern**. Before a request reaches a Servlet (or after the Servlet produces a response), it passes sequentially through a chain of filters:
1. **`SecurityHeadersFilter`:** Injects HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`) to harden the response against clickjacking and MIME-sniffing.
2. **`LoggingFilter`:** Records the HTTP method, request URI, client IP, response status code, and calculates total execution time in milliseconds.
3. **`AuthFilter`:** Inspects session tokens and enforces access control on protected endpoints.

Filters invoke `chain.doFilter(request, response)` to pass control down the chain.

---

## 4. Concurrency & Background Processing

### Q9: Why did you use `ScheduledExecutorService` instead of `java.lang.Thread.sleep()` or `java.util.Timer`?
**Answer:**
* **Why not `Thread.sleep()`:** Calling `Thread.sleep()` inside a request thread blocks the HTTP worker thread, degrading web server capacity. Creating a custom unmanaged thread with an infinite `while(true) { Thread.sleep(...) }` loop lacks proper lifecycle control, error recovery, and thread pool management.
* **Why not `java.util.Timer`:** `Timer` creates only a single thread. If a scheduled task throws an unhandled `RuntimeException`, the entire `Timer` thread terminates permanently and no future tasks ever execute. Furthermore, `Timer` schedules based on system clock rather than relative delays.
* **Why `ScheduledExecutorService` is superior:**
  1. It is part of the `java.util.concurrent` framework, utilizing thread pools with managed worker threads.
  2. In `FileExpirationService.java`, we configure:
     ```java
     scheduler.scheduleWithFixedDelay(this::runCleanupCycle, 10, intervalSeconds, TimeUnit.SECONDS);
     ```
  3. If an individual cleanup cycle encounters an error, the exception is caught, logged, and subsequent scheduled executions continue uninterrupted.
  4. It provides clean lifecycle management: during application shutdown (`AppContextListener.contextDestroyed`), we gracefully terminate the executor via `scheduler.shutdown()` and `awaitTermination()`.

---

## 5. Java NIO & File Management

### Q10: How does Java NIO.2 differ from traditional Java IO (`java.io.File`), and what security precautions did you implement?
**Answer:**
Traditional `java.io.File` has limited error reporting (returns boolean `false` on failure without detailing why), lacks atomic file operations, and uses synchronous stream-based byte copies.

**Java NIO.2 (`java.nio.file`)** introduces:
1. **`Path` and `Files` APIs:** Rich, cross-platform file system operations with comprehensive exception hierarchies (`NoSuchFileException`, `DirectoryNotEmptyException`).
2. **Zero-Copy Streaming:** In `FileDownloadServlet.java`, `Files.copy(path, response.getOutputStream())` allows the operating system kernel to transfer bytes directly from the file system cache to the network socket buffer without copying data into user-space Java heap memory.
3. **Path Traversal Security Validation:** When saving or downloading files based on user-supplied keys, `FileUtil.java` guards against directory traversal attacks (`../../etc/passwd`):
   ```java
   Path targetPath = uploadDir.resolve(storageKey).normalize().toAbsolutePath();
   if (!targetPath.startsWith(uploadDir.toAbsolutePath())) {
       throw new SecurityException("Path Traversal Attack Detected");
   }
   ```

---

## 6. Cryptography & Security

### Q11: Explain how password hashing and fingerprinting work in GlobalSend. Why not use MD5 or plain SHA-256?
**Answer:**
* **Vulnerability of MD5 / SHA-256:** Simple hash algorithms like MD5 or plain SHA-256 are designed to be extremely fast for checksums. Because of this speed, modern GPUs can compute billions of candidate hashes per second, making them trivial to crack using pre-computed rainbow tables and brute force attacks.
* **PBKDF2-HMAC-SHA256 Implementation:**
  1. **Key Stretching:** We use `SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")` with **10,000 iterations**, intentionally making the computation computationally expensive to foil brute-force cracking.
  2. **Cryptographic Salt:** A 16-byte cryptographically secure random salt is generated via `java.security.SecureRandom` for each user. This ensures two users with the exact same passphrase produce completely different stored hashes, defeating rainbow tables.
  3. **Timing-Attack Resistance:** Candidate verification uses `java.security.MessageDigest.isEqual()`, which executes in constant time regardless of how many bytes match, preventing attackers from measuring CPU execution time to guess passwords byte-by-byte.
  4. **Public Fingerprint:** The display fingerprint is derived via `SHA-256(secretKey).substring(0, 16)`. This allows a user to verify their key identity publicly without ever revealing the master secret key.
