<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="com.globalsend.model.User" %>
<%
    User navUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
    String activePage = (String) request.getAttribute("activePage");
    if (activePage == null) activePage = "";
%>
<header class="apple-header">
    <div class="header-container">
        <a href="<%= request.getContextPath() %>/" class="brand">
            <div class="brand-icon">G</div>
            <span>GlobalSend</span>
        </a>

        <nav class="nav-links">
            <% if (navUser != null) { %>
                <a href="<%= request.getContextPath() %>/dashboard" class="nav-item <%= "dashboard".equals(activePage) ? "active" : "" %>">Vault</a>
                <a href="<%= request.getContextPath() %>/upload" class="nav-item <%= "upload".equals(activePage) ? "active" : "" %>">Upload</a>
                <a href="<%= request.getContextPath() %>/chat" class="nav-item <%= "chat".equals(activePage) ? "active" : "" %>">Direct Chat</a>
                <a href="<%= request.getContextPath() %>/settings" class="nav-item <%= "settings".equals(activePage) ? "active" : "" %>">Settings</a>
            <% } else { %>
                <a href="<%= request.getContextPath() %>/" class="nav-item <%= "home".equals(activePage) ? "active" : "" %>">Home</a>
                <a href="<%= request.getContextPath() %>/login" class="nav-item <%= "login".equals(activePage) ? "active" : "" %>">Sign In</a>
            <% } %>
        </nav>

        <div style="display: flex; align-items: center; gap: 12px;">
            <% if (navUser != null) { %>
                <span class="badge badge-blue">
                    <%= navUser.getDisplayUsername() %>
                </span>
                <a href="<%= request.getContextPath() %>/logout" class="btn btn-secondary" style="padding: 6px 14px; font-size: 13px;">
                    Sign Out
                </a>
            <% } else { %>
                <a href="<%= request.getContextPath() %>/register" class="btn btn-primary" style="padding: 6px 16px; font-size: 13px;">
                    Get Started
                </a>
            <% } %>
        </div>
    </div>
</header>
