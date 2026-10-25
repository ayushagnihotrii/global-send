<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<% request.setAttribute("activePage", "home"); %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GlobalSend &mdash; Fast, Private, Auto-Expiring Transfer</title>
    <link rel="stylesheet" href="<%= request.getContextPath() %>/assets/css/apple-theme.css">
</head>
<body>
    <jsp:include page="components/navbar.jsp" />

    <main class="container">
        <section class="hero">
            <div class="hero-pill">
                <span>Enterprise Java 21 &bull; Jakarta Servlets 6.0</span>
            </div>
            <h1>Share anything instantly.<br>Vanishes without a trace.</h1>
            <p>
                GlobalSend is a zero-knowledge private vault and file transfer application.
                Store notes, links, and documents protected by single secret-key cryptography
                with automated lifecycle expiration.
            </p>
            <div class="hero-actions">
                <a href="<%= request.getContextPath() %>/register" class="btn btn-primary" style="padding: 12px 28px; font-size: 16px;">
                    Create Your Vault
                </a>
                <a href="<%= request.getContextPath() %>/login" class="btn btn-secondary" style="padding: 12px 28px; font-size: 16px;">
                    Access with Secret Key
                </a>
            </div>
        </section>

        <!-- University Viva Quick-Access Banner -->
        <div class="apple-card" style="margin-bottom: 40px; border-left: 4px solid var(--apple-blue);">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                <div>
                    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">University Examination / Demo Credentials</h3>
                    <p style="color: var(--apple-text-secondary); font-size: 14px;">
                        Quick test accounts: 
                        <code>alice</code> (key: <code>alice-secret-key-2026</code>) &bull; 
                        <code>bob</code> (key: <code>bob-secret-key-2026</code>) &bull; 
                        <code>professor</code> (key: <code>viva-demo-key-2026</code>)
                    </p>
                </div>
                <a href="<%= request.getContextPath() %>/login" class="btn btn-primary" style="font-size: 13px;">
                    Quick Sign In
                </a>
            </div>
        </div>

        <!-- 3 Feature Columns -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 48px;">
            <div class="apple-card">
                <div class="item-type-icon" style="margin-bottom: 16px; background: rgba(0, 113, 227, 0.12);">
                    🔑
                </div>
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Single Secret Key Auth</h3>
                <p style="color: var(--apple-text-secondary); font-size: 14px; line-height: 1.5;">
                    No passwords, no personal data, no recovery emails. Your secret key generates a unique cryptographic SHA-256 fingerprint verified through PBKDF2 hashing.
                </p>
            </div>

            <div class="apple-card">
                <div class="item-type-icon" style="margin-bottom: 16px; background: rgba(52, 199, 89, 0.12);">
                    ⏱️
                </div>
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Automated Expiration</h3>
                <p style="color: var(--apple-text-secondary); font-size: 14px; line-height: 1.5;">
                    Every vault item expires deterministically. A background <code>ScheduledExecutorService</code> thread automatically purges physical files and database rows.
                </p>
            </div>

            <div class="apple-card">
                <div class="item-type-icon" style="margin-bottom: 16px; background: rgba(88, 86, 214, 0.12);">
                    ⚡
                </div>
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Java NIO File Engine</h3>
                <p style="color: var(--apple-text-secondary); font-size: 14px; line-height: 1.5;">
                    Multipart upload streaming with Path traversal validation and high-throughput byte streaming powered directly by Jakarta EE 10 and Java NIO channels.
                </p>
            </div>
        </div>
    </main>

    <jsp:include page="components/footer.jsp" />
</body>
</html>
