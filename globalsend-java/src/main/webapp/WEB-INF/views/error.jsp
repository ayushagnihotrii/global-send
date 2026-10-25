<%@ page contentType="text/html;charset=UTF-8" language="java" isErrorPage="true" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error &mdash; GlobalSend</title>
    <link rel="stylesheet" href="<%= request.getContextPath() %>/assets/css/apple-theme.css">
</head>
<body>
    <jsp:include page="components/navbar.jsp" />

    <main class="container" style="display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 180px);">
        <div class="apple-card" style="text-align: center; max-width: 480px; padding: 40px 32px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h2 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">An Error Occurred</h2>
            <p style="color: var(--apple-text-secondary); font-size: 14px; margin: 12px auto 24px; line-height: 1.5;">
                The requested resource could not be found or an unexpected error was encountered.
            </p>
            <div style="display: flex; justify-content: center; gap: 12px;">
                <a href="<%= request.getContextPath() %>/dashboard" class="btn btn-primary">
                    Return to Vault
                </a>
                <a href="<%= request.getContextPath() %>/" class="btn btn-secondary">
                    Home
                </a>
            </div>
        </div>
    </main>

    <jsp:include page="components/footer.jsp" />
</body>
</html>
