<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%
    boolean isRegister = Boolean.TRUE.equals(request.getAttribute("isRegister"));
    String error = (String) request.getAttribute("error");
    String message = request.getParameter("message");
    String usernameVal = (String) request.getAttribute("username");
    if (usernameVal == null) usernameVal = "";
    String displayNameVal = (String) request.getAttribute("displayName");
    if (displayNameVal == null) displayNameVal = "";
    request.setAttribute("activePage", "login");
%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= isRegister ? "Create Vault" : "Sign In" %> &mdash; GlobalSend</title>
    <link rel="stylesheet" href="<%= request.getContextPath() %>/assets/css/apple-theme.css">
</head>
<body>
    <jsp:include page="components/navbar.jsp" />

    <main class="container" style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 180px);">
        <div class="apple-card" style="width: 100%; max-width: 440px; padding: 36px 32px;">
            <div style="text-align: center; margin-bottom: 28px;">
                <div class="brand-icon" style="width: 48px; height: 48px; margin: 0 auto 16px; font-size: 24px; border-radius: 12px;">G</div>
                <h2 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">
                    <%= isRegister ? "Create GlobalSend Vault" : "Welcome Back" %>
                </h2>
                <p style="color: var(--apple-text-secondary); font-size: 14px; margin-top: 6px;">
                    <%= isRegister ? "Enter your username and pick a master secret key." : "Authenticate using your master secret key." %>
                </p>
            </div>

            <% if (error != null) { %>
                <div class="alert alert-danger"><%= error %></div>
            <% } %>

            <% if ("logged_out".equals(message)) { %>
                <div class="alert alert-success">You have been signed out safely.</div>
            <% } %>

            <form action="<%= request.getContextPath() %><%= isRegister ? "/register" : "/login" %>" method="POST">
                <div class="form-group">
                    <label class="form-label" for="username">Username</label>
                    <input type="text" id="username" name="username" class="form-control" 
                           placeholder="e.g. alice" value="<%= usernameVal %>" required autofocus>
                </div>

                <% if (isRegister) { %>
                    <div class="form-group">
                        <label class="form-label" for="displayName">Display Name (Optional)</label>
                        <input type="text" id="displayName" name="displayName" class="form-control" 
                               placeholder="e.g. Alice Developer" value="<%= displayNameVal %>">
                    </div>
                <% } %>

                <div class="form-group">
                    <label class="form-label" for="secretKey">Master Secret Key</label>
                    <input type="password" id="secretKey" name="secretKey" class="form-control" 
                           placeholder="Your private secret passphrase" required>
                    <small style="display: block; color: var(--apple-text-secondary); font-size: 12px; margin-top: 6px;">
                        <%= isRegister ? "Keep this key safe. There is no email recovery." : "Single-factor cryptographic master key." %>
                    </small>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 15px; margin-top: 8px;">
                    <%= isRegister ? "Create Account & Vault" : "Unlock Vault" %>
                </button>
            </form>

            <div style="margin-top: 24px; text-align: center; border-top: 1px solid var(--apple-card-border); padding-top: 20px;">
                <% if (isRegister) { %>
                    <p style="font-size: 13px; color: var(--apple-text-secondary);">
                        Already have a vault? 
                        <a href="<%= request.getContextPath() %>/login" style="font-weight: 600;">Sign In</a>
                    </p>
                <% } else { %>
                    <p style="font-size: 13px; color: var(--apple-text-secondary);">
                        Don't have a vault yet? 
                        <a href="<%= request.getContextPath() %>/register" style="font-weight: 600;">Create one now</a>
                    </p>
                <% } %>
            </div>

            <!-- Demo Quick Fill Buttons -->
            <div style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.03); border-radius: 12px; text-align: center;">
                <span style="font-size: 11px; font-weight: 600; color: var(--apple-text-secondary); text-transform: uppercase;">Demo One-Click Login</span>
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
                    <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" 
                            onclick="fillCreds('alice', 'alice-secret-key-2026')">Alice</button>
                    <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" 
                            onclick="fillCreds('bob', 'bob-secret-key-2026')">Bob</button>
                    <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" 
                            onclick="fillCreds('professor', 'viva-demo-key-2026')">Professor</button>
                </div>
            </div>
        </div>
    </main>

    <script>
        function fillCreds(u, k) {
            document.getElementById('username').value = u;
            document.getElementById('secretKey').value = k;
        }
    </script>
    <jsp:include page="components/footer.jsp" />
</body>
</html>
