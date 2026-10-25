<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="com.globalsend.model.VaultItem" %>
<%@ page import="com.globalsend.model.Tag" %>
<%
    VaultItem item = (VaultItem) request.getAttribute("item");
    boolean isOwner = Boolean.TRUE.equals(request.getAttribute("isOwner"));
    String success = request.getParameter("success");
    String error = request.getParameter("error");
    request.setAttribute("activePage", "dashboard");
%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= item.getTitle() %> &mdash; GlobalSend</title>
    <link rel="stylesheet" href="<%= request.getContextPath() %>/assets/css/apple-theme.css">
</head>
<body>
    <jsp:include page="components/navbar.jsp" />

    <main class="container" style="max-width: 800px;">
        <div style="margin-bottom: 24px;">
            <a href="<%= request.getContextPath() %>/dashboard" style="font-size: 13px; color: var(--apple-text-secondary);">
                &larr; Back to Vault
            </a>
        </div>

        <% if (success != null && success.startsWith("shared_with_")) { %>
            <div class="alert alert-success">
                Successfully shared this item with @<%= success.substring("shared_with_".length()) %>! It has also been posted to your Direct Chat.
            </div>
        <% } %>

        <% if (error != null) { %>
            <div class="alert alert-danger"><%= error %></div>
        <% } %>

        <div class="apple-card" style="padding: 32px; margin-bottom: 24px;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="item-type-icon" style="width: 44px; height: 44px; font-size: 22px;">
                        <% if ("text".equalsIgnoreCase(item.getType())) { %>📝<% }
                           else if ("link".equalsIgnoreCase(item.getType())) { %>🔗<% }
                           else if ("image".equalsIgnoreCase(item.getType())) { %>🖼️<% }
                           else if ("video".equalsIgnoreCase(item.getType())) { %>🎥<% }
                           else { %>📄<% } %>
                    </div>
                    <div>
                        <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">
                            <%= item.getTitle() %>
                        </h1>
                        <span style="font-size: 13px; color: var(--apple-text-secondary);">
                            Category: <strong><%= item.getType().toUpperCase() %></strong>
                            <% if (item.getFileSize() > 0) { %> &bull; <%= item.getFormattedFileSize() %><% } %>
                            <% if (!isOwner) { %> &bull; <span class="badge badge-green">Shared with You</span><% } %>
                        </span>
                    </div>
                </div>

                <div style="text-align: right;">
                    <span class="badge <%= item.getRemainingSeconds() < 3600 ? "badge-orange" : "badge-blue" %>" style="font-size: 13px; padding: 6px 14px;">
                        ⏱️ <%= item.getFormattedRemainingTime() %>
                    </span>
                    <div style="font-size: 11px; color: var(--apple-text-secondary); margin-top: 4px;">
                        Expires at: <%= item.getExpiresAt() %>
                    </div>
                </div>
            </div>

            <!-- Tags -->
            <% if (item.getTags() != null && !item.getTags().isEmpty()) { %>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px;">
                    <% for (Tag tag : item.getTags()) { %>
                        <span class="badge badge-blue">#<%= tag.getName() %></span>
                    <% } %>
                </div>
            <% } %>

            <!-- Content Area -->
            <div style="background: rgba(0,0,0,0.03); border: 1px solid var(--apple-card-border); border-radius: var(--apple-radius-md); padding: 20px; margin-bottom: 28px; word-break: break-word;">
                <% if ("image".equalsIgnoreCase(item.getType())) { %>
                    <div style="text-align: center;">
                        <img src="<%= request.getContextPath() %>/download?id=<%= item.getId() %>&inline=true" 
                             alt="<%= item.getTitle() %>" 
                             style="max-width: 100%; max-height: 450px; border-radius: 12px; box-shadow: var(--apple-shadow-sm);">
                    </div>
                <% } else if ("link".equalsIgnoreCase(item.getType())) { %>
                    <div style="margin-bottom: 12px;">
                        <span class="form-label">Destination URL:</span>
                        <a href="<%= item.getUrl() %>" target="_blank" rel="noopener noreferrer" style="font-size: 16px; font-weight: 600;">
                            <%= item.getUrl() %> ↗
                        </a>
                    </div>
                    <% if (item.getContent() != null && !item.getContent().isBlank()) { %>
                        <div>
                            <span class="form-label">Notes:</span>
                            <p style="white-space: pre-wrap;"><%= item.getContent() %></p>
                        </div>
                    <% } %>
                <% } else if ("text".equalsIgnoreCase(item.getType())) { %>
                    <pre style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; line-height: 1.6;"><%= item.getContent() %></pre>
                <% } else { %>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                        <div>
                            <div style="font-weight: 600; font-size: 15px;"><%= item.getFileName() %></div>
                            <div style="color: var(--apple-text-secondary); font-size: 13px;">MIME: <%= item.getMimeType() %></div>
                        </div>
                        <a href="<%= request.getContextPath() %>/download?id=<%= item.getId() %>" class="btn btn-primary">
                            Download File (<%= item.getFormattedFileSize() %>)
                        </a>
                    </div>
                <% } %>
            </div>

            <!-- Action Buttons Toolbar -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-top: 1px solid var(--apple-card-border); padding-top: 20px;">
                <div style="display: flex; gap: 8px;">
                    <% if ("text".equalsIgnoreCase(item.getType()) && item.getContent() != null) { %>
                        <button class="btn btn-secondary" data-copy="<%= item.getContent().replace("\"", "&quot;") %>">
                            📋 Copy Text
                        </button>
                    <% } else if ("link".equalsIgnoreCase(item.getType()) && item.getUrl() != null) { %>
                        <button class="btn btn-secondary" data-copy="<%= item.getUrl() %>">
                            📋 Copy Link
                        </button>
                    <% } %>

                    <% if (item.getStorageKey() != null) { %>
                        <a href="<%= request.getContextPath() %>/download?id=<%= item.getId() %>" class="btn btn-primary">
                            ⬇️ Download (<%= item.getFormattedFileSize() %>)
                        </a>
                    <% } %>

                    <% if (isOwner) { %>
                        <!-- Toggle Pin Form -->
                        <form action="<%= request.getContextPath() %>/item" method="POST" style="display: inline;">
                            <input type="hidden" name="id" value="<%= item.getId() %>">
                            <input type="hidden" name="action" value="toggle-pin">
                            <button type="submit" class="btn btn-secondary">
                                <%= item.isPinned() ? "📌 Unpin" : "📌 Pin" %>
                            </button>
                        </form>

                        <!-- Toggle Favorite Form -->
                        <form action="<%= request.getContextPath() %>/item" method="POST" style="display: inline;">
                            <input type="hidden" name="id" value="<%= item.getId() %>">
                            <input type="hidden" name="action" value="toggle-favorite">
                            <button type="submit" class="btn btn-secondary">
                                <%= item.isFavorite() ? "⭐ Favorited" : "☆ Favorite" %>
                            </button>
                        </form>
                    <% } %>
                </div>

                <% if (isOwner) { %>
                    <!-- Delete Form -->
                    <form action="<%= request.getContextPath() %>/item" method="POST" onsubmit="return confirm('Permanently remove this item and its physical disk file?');">
                        <input type="hidden" name="id" value="<%= item.getId() %>">
                        <input type="hidden" name="action" value="delete">
                        <button type="submit" class="btn btn-danger">
                            🗑️ Delete
                        </button>
                    </form>
                <% } %>
            </div>
        </div>

        <% if (isOwner) { %>
            <!-- Share With Contact Box -->
            <div class="apple-card" style="padding: 24px;">
                <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Share This Transfer with Another User</h3>
                <p style="color: var(--apple-text-secondary); font-size: 13px; margin-bottom: 16px;">
                    Grant immediate read and download access to another registered GlobalSend user. It will also appear in your Direct Chat.
                </p>

                <form action="<%= request.getContextPath() %>/item" method="POST" style="display: flex; gap: 10px; max-width: 480px;">
                    <input type="hidden" name="id" value="<%= item.getId() %>">
                    <input type="hidden" name="action" value="share">
                    <input type="text" name="targetUsername" class="form-control" placeholder="Recipient username (e.g. bob)" required style="font-size: 14px;">
                    <button type="submit" class="btn btn-primary" style="white-space: nowrap;">
                        Share Transfer
                    </button>
                </form>
            </div>
        <% } %>
    </main>

    <jsp:include page="components/footer.jsp" />
</body>
</html>
