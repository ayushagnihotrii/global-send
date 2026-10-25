<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="com.globalsend.model.User" %>
<%@ page import="com.globalsend.model.VaultItem" %>
<%@ page import="com.globalsend.model.UserStorageStats" %>
<%@ page import="java.util.List" %>
<%
    User user = (User) session.getAttribute("currentUser");
    List<VaultItem> items = (List<VaultItem>) request.getAttribute("items");
    UserStorageStats stats = (UserStorageStats) request.getAttribute("stats");
    String currentType = (String) request.getAttribute("currentType");
    String searchQuery = (String) request.getAttribute("searchQuery");
    String success = request.getParameter("success");
    request.setAttribute("activePage", "dashboard");
%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vault Dashboard &mdash; GlobalSend</title>
    <link rel="stylesheet" href="<%= request.getContextPath() %>/assets/css/apple-theme.css">
</head>
<body>
    <jsp:include page="components/navbar.jsp" />

    <main class="container">
        <!-- Success Alert -->
        <% if ("item_created".equals(success)) { %>
            <div class="alert alert-success">Vault item created successfully and scheduled for auto-expiration.</div>
        <% } else if ("item_deleted".equals(success)) { %>
            <div class="alert alert-success">Vault item and associated disk storage removed successfully.</div>
        <% } %>

        <!-- Storage & Status Top Section -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 28px;">
            <div class="apple-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <span style="font-size: 13px; font-weight: 600; color: var(--apple-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Personal Secure Vault</span>
                    <h1 style="font-size: 26px; font-weight: 700; margin-top: 4px; letter-spacing: -0.02em;">
                        Welcome, <%= user.getDisplayUsername() %>
                    </h1>
                    <p style="color: var(--apple-text-secondary); font-size: 14px; margin-top: 4px;">
                        Fingerprint: <code><%= user.getKeyFingerprint() %></code> &bull; Identity protected by PBKDF2
                    </p>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <a href="<%= request.getContextPath() %>/upload" class="btn btn-primary">
                        + New Transfer
                    </a>
                    <a href="<%= request.getContextPath() %>/chat" class="btn btn-secondary">
                        Direct Chat
                    </a>
                </div>
            </div>

            <div class="apple-card">
                <span style="font-size: 13px; font-weight: 600; color: var(--apple-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Storage Quota</span>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px;">
                    <span style="font-size: 22px; font-weight: 700;"><%= stats.getFormattedUsed() %></span>
                    <span style="font-size: 13px; color: var(--apple-text-secondary);">of <%= stats.getFormattedMax() %></span>
                </div>
                <div class="storage-progress">
                    <div class="storage-bar-fill" style="width: <%= stats.getPercentUsed() %>%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--apple-text-secondary); margin-top: 8px;">
                    <span><%= stats.getActiveItems() %> Active Items</span>
                    <span><%= stats.getPercentUsed() %>% Used</span>
                </div>
            </div>
        </div>

        <!-- Filter & Search Controls Bar -->
        <div class="apple-card" style="padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
            <!-- Category Tabs -->
            <div style="display: flex; gap: 6px; overflow-x: auto;">
                <a href="<%= request.getContextPath() %>/dashboard?type=all" 
                   class="btn <%= "all".equalsIgnoreCase(currentType) ? "btn-primary" : "btn-secondary" %>" style="padding: 6px 14px; font-size: 13px;">All</a>
                <a href="<%= request.getContextPath() %>/dashboard?type=text" 
                   class="btn <%= "text".equalsIgnoreCase(currentType) ? "btn-primary" : "btn-secondary" %>" style="padding: 6px 14px; font-size: 13px;">Notes</a>
                <a href="<%= request.getContextPath() %>/dashboard?type=link" 
                   class="btn <%= "link".equalsIgnoreCase(currentType) ? "btn-primary" : "btn-secondary" %>" style="padding: 6px 14px; font-size: 13px;">Links</a>
                <a href="<%= request.getContextPath() %>/dashboard?type=file" 
                   class="btn <%= "file".equalsIgnoreCase(currentType) ? "btn-primary" : "btn-secondary" %>" style="padding: 6px 14px; font-size: 13px;">Files</a>
                <a href="<%= request.getContextPath() %>/dashboard?type=shared" 
                   class="btn <%= "shared".equalsIgnoreCase(currentType) ? "btn-primary" : "btn-secondary" %>" style="padding: 6px 14px; font-size: 13px;">Shared with Me</a>
            </div>

            <!-- Search Box -->
            <form action="<%= request.getContextPath() %>/dashboard" method="GET" style="display: flex; gap: 8px;">
                <input type="hidden" name="type" value="<%= currentType %>">
                <input type="text" name="q" class="form-control" placeholder="Search title or text..." 
                       value="<%= searchQuery %>" style="padding: 6px 14px; font-size: 13px; width: 220px;">
                <button type="submit" class="btn btn-secondary" style="padding: 6px 14px; font-size: 13px;">Filter</button>
                <% if (!searchQuery.isBlank()) { %>
                    <a href="<%= request.getContextPath() %>/dashboard?type=<%= currentType %>" class="btn btn-secondary" style="padding: 6px 10px; font-size: 13px;">✕</a>
                <% } %>
            </form>
        </div>

        <!-- Vault Items Grid -->
        <% if (items == null || items.isEmpty()) { %>
            <div class="apple-card" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 42px; margin-bottom: 12px;">📦</div>
                <h3 style="font-size: 18px; font-weight: 600;">No items found</h3>
                <p style="color: var(--apple-text-secondary); font-size: 14px; max-width: 400px; margin: 8px auto 20px;">
                    <% if ("shared".equalsIgnoreCase(currentType)) { %>
                        No other users have shared vault transfers with you yet.
                    <% } else { %>
                        Your vault is currently empty or no items match your active filter.
                    <% } %>
                </p>
                <a href="<%= request.getContextPath() %>/upload" class="btn btn-primary">
                    Create First Transfer
                </a>
            </div>
        <% } else { %>
            <div class="dashboard-grid">
                <% for (VaultItem item : items) { %>
                    <div class="item-card">
                        <div>
                            <div class="item-header">
                                <div class="item-type-icon">
                                    <% if ("text".equalsIgnoreCase(item.getType())) { %>📝<% }
                                       else if ("link".equalsIgnoreCase(item.getType())) { %>🔗<% }
                                       else if ("image".equalsIgnoreCase(item.getType())) { %>🖼️<% }
                                       else if ("video".equalsIgnoreCase(item.getType())) { %>🎥<% }
                                       else { %>📄<% } %>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <% if (item.isPinned()) { %>
                                        <span title="Pinned" style="font-size: 14px;">📌</span>
                                    <% } %>
                                    <% if (item.isFavorite()) { %>
                                        <span title="Favorite" style="font-size: 14px;">⭐</span>
                                    <% } %>
                                    <span class="badge <%= item.getRemainingSeconds() < 3600 ? "badge-orange" : "badge-blue" %>">
                                        ⏱️ <%= item.getFormattedRemainingTime() %>
                                    </span>
                                </div>
                            </div>

                            <h3 class="item-title">
                                <a href="<%= request.getContextPath() %>/item?id=<%= item.getId() %>">
                                    <%= item.getTitle() %>
                                </a>
                            </h3>

                            <% if ("link".equalsIgnoreCase(item.getType()) && item.getUrl() != null) { %>
                                <p class="item-preview">
                                    <a href="<%= item.getUrl() %>" target="_blank" rel="noopener noreferrer" style="color: var(--apple-blue); word-break: break-all;">
                                        <%= item.getUrl() %> ↗
                                    </a>
                                </p>
                            <% } else if (item.getContent() != null && !item.getContent().isBlank()) { %>
                                <p class="item-preview"><%= item.getContent() %></p>
                            <% } else if (item.getFileName() != null) { %>
                                <p class="item-preview" style="font-style: italic;">
                                    File: <%= item.getFileName() %> (<%= item.getFormattedFileSize() %>)
                                </p>
                            <% } %>

                            <!-- Tags -->
                            <% if (item.getTags() != null && !item.getTags().isEmpty()) { %>
                                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 10px; margin-bottom: 12px;">
                                    <% for (var tag : item.getTags()) { %>
                                        <span style="font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(0,0,0,0.05); color: var(--apple-text-secondary);">
                                            #<%= tag.getName() %>
                                        </span>
                                    <% } %>
                                </div>
                            <% } %>
                        </div>

                        <div class="item-footer">
                            <span><%= item.getFormattedFileSize() %></span>
                            <div style="display: flex; gap: 8px;">
                                <% if ("text".equalsIgnoreCase(item.getType()) && item.getContent() != null) { %>
                                    <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" data-copy="<%= item.getContent().replace("\"", "&quot;") %>">
                                        Copy
                                    </button>
                                <% } %>
                                <% if (item.getStorageKey() != null) { %>
                                    <a href="<%= request.getContextPath() %>/download?id=<%= item.getId() %>" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;">
                                        Download
                                    </a>
                                <% } %>
                                <a href="<%= request.getContextPath() %>/item?id=<%= item.getId() %>" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;">
                                    Open
                                </a>
                            </div>
                        </div>
                    </div>
                <% } %>
            </div>
        <% } %>
    </main>

    <jsp:include page="components/footer.jsp" />
</body>
</html>
