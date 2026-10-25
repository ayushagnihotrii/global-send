<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="com.globalsend.model.User" %>
<%@ page import="com.globalsend.model.UserStorageStats" %>
<%@ page import="com.globalsend.config.DatabaseConfig" %>
<%
    User currentUser = (User) session.getAttribute("currentUser");
    UserStorageStats stats = (UserStorageStats) request.getAttribute("stats");
    request.setAttribute("activePage", "settings");
%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account & Settings &mdash; GlobalSend</title>
    <link rel="stylesheet" href="<%= request.getContextPath() %>/assets/css/apple-theme.css">
</head>
<body>
    <jsp:include page="components/navbar.jsp" />

    <main class="container" style="max-width: 800px;">
        <div style="margin-bottom: 24px;">
            <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">Settings & Profile</h1>
            <p style="color: var(--apple-text-secondary); font-size: 14px; margin-top: 4px;">
                Cryptographic security parameters and runtime architecture.
            </p>
        </div>

        <!-- User Identity Card -->
        <div class="apple-card" style="margin-bottom: 24px;">
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Identity & Security</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <label class="form-label">Username</label>
                    <div style="font-size: 15px; font-weight: 600;">@<%= currentUser.getUsername() %></div>
                </div>
                <div>
                    <label class="form-label">Display Name</label>
                    <div style="font-size: 15px; font-weight: 600;"><%= currentUser.getDisplayUsername() %></div>
                </div>
            </div>

            <div style="margin-top: 20px;">
                <label class="form-label">Key Cryptographic Fingerprint (SHA-256)</label>
                <code style="display: inline-block; padding: 8px 12px; background: rgba(0,0,0,0.05); border-radius: 8px; font-size: 14px; color: var(--apple-blue); font-weight: 600;">
                    <%= currentUser.getKeyFingerprint() %>
                </code>
                <small style="display: block; color: var(--apple-text-secondary); font-size: 12px; margin-top: 6px;">
                    This fingerprint is deterministic and publicly verifiable without revealing your master secret key.
                </small>
            </div>
        </div>

        <!-- Storage Card -->
        <div class="apple-card" style="margin-bottom: 24px;">
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Storage Allocation</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <span style="font-size: 20px; font-weight: 700;"><%= stats.getFormattedUsed() %></span>
                <span style="font-size: 13px; color: var(--apple-text-secondary);">Max Quota: <%= stats.getFormattedMax() %></span>
            </div>

            <div class="storage-progress">
                <div class="storage-bar-fill" style="width: <%= stats.getPercentUsed() %>%;"></div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; text-align: center;">
                <div style="background: rgba(0,0,0,0.03); padding: 12px; border-radius: 12px;">
                    <div style="font-size: 18px; font-weight: 700;"><%= stats.getTotalItems() %></div>
                    <div style="font-size: 12px; color: var(--apple-text-secondary);">Total Items</div>
                </div>
                <div style="background: rgba(0,0,0,0.03); padding: 12px; border-radius: 12px;">
                    <div style="font-size: 18px; font-weight: 700; color: var(--apple-green);"><%= stats.getActiveItems() %></div>
                    <div style="font-size: 12px; color: var(--apple-text-secondary);">Active Items</div>
                </div>
                <div style="background: rgba(0,0,0,0.03); padding: 12px; border-radius: 12px;">
                    <div style="font-size: 18px; font-weight: 700; color: var(--apple-orange);"><%= stats.getExpiredItems() %></div>
                    <div style="font-size: 12px; color: var(--apple-text-secondary);">Expired Items</div>
                </div>
            </div>
        </div>

        <!-- Enterprise Runtime Card -->
        <div class="apple-card">
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Runtime & Advanced Java Architecture</h3>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr style="border-bottom: 1px solid var(--apple-card-border);">
                    <td style="padding: 10px 0; color: var(--apple-text-secondary);">Java Specification</td>
                    <td style="padding: 10px 0; font-weight: 600; text-align: right;"><%= System.getProperty("java.version") %> (<%= System.getProperty("java.vendor") %>)</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--apple-card-border);">
                    <td style="padding: 10px 0; color: var(--apple-text-secondary);">Servlet Specification</td>
                    <td style="padding: 10px 0; font-weight: 600; text-align: right;">Jakarta Servlet 6.0 / JSP 3.1</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--apple-card-border);">
                    <td style="padding: 10px 0; color: var(--apple-text-secondary);">JDBC Connection Pool</td>
                    <td style="padding: 10px 0; font-weight: 600; text-align: right;">HikariCP 5.1.0</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--apple-card-border);">
                    <td style="padding: 10px 0; color: var(--apple-text-secondary);">Active Database Engine</td>
                    <td style="padding: 10px 0; font-weight: 600; text-align: right;">
                        <span class="badge badge-green"><%= DatabaseConfig.getActiveDriverType() %></span>
                    </td>
                </tr>
                <tr style="border-bottom: 1px solid var(--apple-card-border);">
                    <td style="padding: 10px 0; color: var(--apple-text-secondary);">File Storage Engine</td>
                    <td style="padding: 10px 0; font-weight: 600; text-align: right;">Java NIO (Channel & Path Traversal Guard)</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: var(--apple-text-secondary);">Background Cleaner Thread</td>
                    <td style="padding: 10px 0; font-weight: 600; text-align: right;">ScheduledExecutorService (60s tick)</td>
                </tr>
            </table>
        </div>
    </main>

    <jsp:include page="components/footer.jsp" />
</body>
</html>
