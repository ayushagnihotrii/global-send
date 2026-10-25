<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="com.globalsend.model.User" %>
<%@ page import="com.globalsend.model.Conversation" %>
<%@ page import="com.globalsend.model.ChatMessage" %>
<%@ page import="com.globalsend.model.VaultItem" %>
<%@ page import="java.util.List" %>
<%
    User currentUser = (User) session.getAttribute("currentUser");
    List<Conversation> conversations = (List<Conversation>) request.getAttribute("conversations");
    Conversation activeConv = (Conversation) request.getAttribute("activeConv");
    List<ChatMessage> messages = (List<ChatMessage>) request.getAttribute("messages");
    List<VaultItem> userVaultItems = (List<VaultItem>) request.getAttribute("userVaultItems");
    String error = (String) request.getAttribute("error");
    request.setAttribute("activePage", "chat");
%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Direct Chat &mdash; GlobalSend</title>
    <link rel="stylesheet" href="<%= request.getContextPath() %>/assets/css/apple-theme.css">
</head>
<body>
    <jsp:include page="components/navbar.jsp" />

    <main class="container">
        <% if (error != null) { %>
            <div class="alert alert-danger"><%= error %></div>
        <% } %>

        <div class="chat-container">
            <!-- Left Sidebar -->
            <aside class="chat-sidebar">
                <div style="padding: 16px 20px; border-bottom: 1px solid var(--apple-card-border);">
                    <h2 style="font-size: 18px; font-weight: 700; letter-spacing: -0.01em;">Direct Messages</h2>
                    
                    <!-- Start New Conversation Form -->
                    <form action="<%= request.getContextPath() %>/chat" method="POST" style="margin-top: 12px; display: flex; gap: 6px;">
                        <input type="hidden" name="action" value="start">
                        <input type="text" name="targetUsername" class="form-control" placeholder="Recipient username..." 
                               required style="padding: 6px 12px; font-size: 13px;">
                        <button type="submit" class="btn btn-primary" style="padding: 6px 14px; font-size: 13px;">Chat</button>
                    </form>
                </div>

                <div style="flex: 1; overflow-y: auto; padding: 8px;">
                    <% if (conversations == null || conversations.isEmpty()) { %>
                        <div style="text-align: center; padding: 40px 16px; color: var(--apple-text-secondary); font-size: 13px;">
                            No conversations yet.<br>Type a username above to start messaging.
                        </div>
                    <% } else { %>
                        <% for (Conversation c : conversations) { 
                            boolean isSelected = activeConv != null && c.getId().equals(activeConv.getId());
                        %>
                            <a href="<%= request.getContextPath() %>/chat?conv=<%= c.getId() %>" 
                               style="display: block; padding: 12px 14px; border-radius: 12px; margin-bottom: 4px; text-decoration: none; color: inherit; transition: var(--apple-transition); background: <%= isSelected ? "var(--apple-blue-light)" : "transparent" %>;">
                                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                                    <strong style="font-size: 14px; color: <%= isSelected ? "var(--apple-blue)" : "inherit" %>;">
                                        <%= c.getOtherDisplayName() != null ? c.getOtherDisplayName() : c.getOtherUsername() %>
                                    </strong>
                                    <span style="font-size: 11px; color: var(--apple-text-secondary);">@<%= c.getOtherUsername() %></span>
                                </div>
                                <div style="font-size: 12px; color: var(--apple-text-secondary); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    <%= c.getLastMessage() != null ? c.getLastMessage() : "No messages yet" %>
                                </div>
                            </a>
                        <% } %>
                    <% } %>
                </div>
            </aside>

            <!-- Right Message Panel -->
            <section class="chat-main">
                <% if (activeConv != null) { %>
                    <!-- Active Chat Header -->
                    <div style="padding: 16px 20px; border-bottom: 1px solid var(--apple-card-border); display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="brand-icon" style="width: 36px; height: 36px; font-size: 16px;">
                                <%= activeConv.getOtherUsername() != null ? activeConv.getOtherUsername().substring(0, 1).toUpperCase() : "U" %>
                            </div>
                            <div>
                                <h3 style="font-size: 16px; font-weight: 600;">
                                    <%= activeConv.getOtherDisplayName() != null ? activeConv.getOtherDisplayName() : activeConv.getOtherUsername() %>
                                </h3>
                                <span style="font-size: 12px; color: var(--apple-text-secondary);">@<%= activeConv.getOtherUsername() %> &bull; End-to-end Session Protected</span>
                            </div>
                        </div>

                        <!-- Quick Share Dropdown / Button -->
                        <% if (userVaultItems != null && !userVaultItems.isEmpty()) { %>
                            <form action="<%= request.getContextPath() %>/chat" method="POST" style="display: flex; gap: 6px; align-items: center;">
                                <input type="hidden" name="action" value="share_item">
                                <input type="hidden" name="conversationId" value="<%= activeConv.getId() %>">
                                <input type="hidden" name="otherUserId" value="<%= activeConv.getOtherUserId() %>">
                                <select name="itemId" class="form-control" style="padding: 4px 10px; font-size: 12px; width: 170px;">
                                    <option value="" disabled selected>Select Item to Share...</option>
                                    <% for (VaultItem v : userVaultItems) { %>
                                        <option value="<%= v.getId() %>"><%= v.getTitle() %></option>
                                    <% } %>
                                </select>
                                <button type="submit" class="btn btn-primary" style="padding: 5px 12px; font-size: 12px;">
                                    Share
                                </button>
                            </form>
                        <% } %>
                    </div>

                    <!-- Messages Scroll Box -->
                    <div class="chat-messages" id="chat-messages">
                        <% if (messages == null || messages.isEmpty()) { %>
                            <div style="text-align: center; margin: auto; color: var(--apple-text-secondary); font-size: 13px;">
                                This is the beginning of your private message history with @<%= activeConv.getOtherUsername() %>.
                            </div>
                        <% } else { %>
                            <% for (ChatMessage msg : messages) { 
                                boolean isSender = msg.getSenderId().equals(currentUser.getId());
                                boolean isItemShare = "item_share".equalsIgnoreCase(msg.getMessageType());
                            %>
                                <% if (isItemShare && msg.getSharedItem() != null) { 
                                    VaultItem shared = msg.getSharedItem();
                                %>
                                    <!-- Rich Shared Item Card in Chat -->
                                    <div style="align-self: <%= isSender ? "flex-end" : "flex-start" %>; max-width: 80%; background: var(--apple-card-bg); border: 1px solid var(--apple-card-border); border-radius: 16px; padding: 14px 18px; box-shadow: var(--apple-shadow-sm); margin: 4px 0;">
                                        <div style="font-size: 11px; color: var(--apple-text-secondary); margin-bottom: 6px; display: flex; justify-content: space-between;">
                                            <span><%= isSender ? "You shared a vault item" : "@" + msg.getSenderUsername() + " shared an item" %></span>
                                            <span class="badge <%= shared.getRemainingSeconds() < 3600 ? "badge-orange" : "badge-blue" %>" style="font-size: 10px; padding: 2px 6px;">
                                                ⏱️ <%= shared.getFormattedRemainingTime() %>
                                            </span>
                                        </div>

                                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                            <div class="item-type-icon" style="width: 32px; height: 32px; font-size: 16px;">
                                                <% if ("text".equalsIgnoreCase(shared.getType())) { %>📝<% }
                                                   else if ("link".equalsIgnoreCase(shared.getType())) { %>🔗<% }
                                                   else if ("image".equalsIgnoreCase(shared.getType())) { %>🖼️<% }
                                                   else if ("video".equalsIgnoreCase(shared.getType())) { %>🎥<% }
                                                   else { %>📄<% } %>
                                            </div>
                                            <div>
                                                <strong style="font-size: 14px; display: block;"><%= shared.getTitle() %></strong>
                                                <span style="font-size: 11px; color: var(--apple-text-secondary);"><%= shared.getType().toUpperCase() %><% if (shared.getFileSize() > 0) { %> &bull; <%= shared.getFormattedFileSize() %><% } %></span>
                                            </div>
                                        </div>

                                        <% if ("text".equalsIgnoreCase(shared.getType()) && shared.getContent() != null) { %>
                                            <p style="font-size: 13px; color: var(--apple-text-secondary); background: rgba(0,0,0,0.03); padding: 8px 12px; border-radius: 8px; margin-bottom: 10px; white-space: pre-wrap;"><%= shared.getContent() %></p>
                                        <% } else if ("link".equalsIgnoreCase(shared.getType()) && shared.getUrl() != null) { %>
                                            <p style="font-size: 13px; margin-bottom: 10px;">
                                                <a href="<%= shared.getUrl() %>" target="_blank" rel="noopener noreferrer" style="color: var(--apple-blue); word-break: break-all;">
                                                    <%= shared.getUrl() %> ↗
                                                </a>
                                            </p>
                                        <% } %>

                                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                            <% if ("text".equalsIgnoreCase(shared.getType()) && shared.getContent() != null) { %>
                                                <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" data-copy="<%= shared.getContent().replace("\"", "&quot;") %>">
                                                    Copy Text
                                                </button>
                                            <% } %>
                                            <% if (shared.getStorageKey() != null) { %>
                                                <a href="<%= request.getContextPath() %>/download?id=<%= shared.getId() %>" class="btn btn-primary" style="padding: 4px 12px; font-size: 11px;">
                                                    ⬇️ Download (<%= shared.getFormattedFileSize() %>)
                                                </a>
                                            <% } %>
                                            <a href="<%= request.getContextPath() %>/item?id=<%= shared.getId() %>" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;">
                                                View
                                            </a>
                                        </div>
                                    </div>
                                <% } else { %>
                                    <!-- Standard Text Bubble -->
                                    <div class="chat-bubble <%= isSender ? "sent" : "received" %>">
                                        <div style="font-size: 11px; opacity: 0.75; margin-bottom: 2px;">
                                            <%= isSender ? "You" : "@" + msg.getSenderUsername() %>
                                        </div>
                                        <div><%= msg.getContent() %></div>
                                    </div>
                                <% } %>
                            <% } %>
                        <% } %>
                    </div>

                    <!-- Input Bar -->
                    <form action="<%= request.getContextPath() %>/chat" method="POST" style="padding: 16px 20px; border-top: 1px solid var(--apple-card-border); display: flex; gap: 10px;">
                        <input type="hidden" name="action" value="send">
                        <input type="hidden" name="conversationId" value="<%= activeConv.getId() %>">
                        <input type="text" name="message" class="form-control" placeholder="Type a message..." required autocomplete="off" style="font-size: 14px;">
                        <button type="submit" class="btn btn-primary" style="padding: 10px 24px;">Send</button>
                    </form>
                <% } else { %>
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--apple-text-secondary); text-align: center; padding: 40px;">
                        <div>
                            <div style="font-size: 42px; margin-bottom: 12px;">💬</div>
                            <h3 style="font-size: 18px; font-weight: 600; color: var(--apple-text-primary);">Select a conversation</h3>
                            <p style="font-size: 14px; margin-top: 4px;">Choose a contact from the sidebar or enter a username to start chatting.</p>
                        </div>
                    </div>
                <% } %>
            </section>
        </div>
    </main>

    <jsp:include page="components/footer.jsp" />
</body>
</html>
