package com.globalsend.controller;

import com.globalsend.model.ChatMessage;
import com.globalsend.model.Conversation;
import com.globalsend.model.User;
import com.globalsend.model.VaultItem;
import com.globalsend.service.ChatService;
import com.globalsend.service.VaultService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.List;

@WebServlet(name = "ChatServlet", urlPatterns = {"/chat"})
public class ChatServlet extends HttpServlet {

    private final ChatService chatService = new ChatService();
    private final VaultService vaultService = new VaultService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        User currentUser = (User) session.getAttribute("currentUser");

        List<Conversation> conversations = chatService.getUserConversations(currentUser.getId());
        req.setAttribute("conversations", conversations);

        // Vault items available for sharing
        List<VaultItem> userVaultItems = vaultService.getUserVaultItems(currentUser.getId(), "all", null);
        req.setAttribute("userVaultItems", userVaultItems);

        String convId = req.getParameter("conv");
        String targetUser = req.getParameter("with");

        Conversation activeConv = null;
        if (targetUser != null && !targetUser.isBlank()) {
            try {
                activeConv = chatService.openConversationWithUsername(currentUser.getId(), targetUser);
                convId = activeConv.getId();
            } catch (Exception e) {
                req.setAttribute("error", e.getMessage());
            }
        } else if (convId != null && !convId.isBlank()) {
            for (Conversation c : conversations) {
                if (c.getId().equals(convId)) {
                    activeConv = c;
                    break;
                }
            }
        } else if (!conversations.isEmpty()) {
            activeConv = conversations.get(0);
            convId = activeConv.getId();
        }

        if (activeConv != null && convId != null) {
            List<ChatMessage> messages = chatService.getConversationMessages(convId, 100);
            req.setAttribute("activeConv", activeConv);
            req.setAttribute("messages", messages);
        }

        req.getRequestDispatcher("/WEB-INF/views/chat.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        User currentUser = (User) session.getAttribute("currentUser");

        String action = req.getParameter("action");
        if ("start".equalsIgnoreCase(action)) {
            String targetUsername = req.getParameter("targetUsername");
            try {
                Conversation conv = chatService.openConversationWithUsername(currentUser.getId(), targetUsername);
                resp.sendRedirect(req.getContextPath() + "/chat?conv=" + conv.getId());
            } catch (Exception e) {
                resp.sendRedirect(req.getContextPath() + "/chat?error=" + java.net.URLEncoder.encode(e.getMessage(), java.nio.charset.StandardCharsets.UTF_8));
            }
        } else if ("share_item".equalsIgnoreCase(action)) {
            String convId = req.getParameter("conversationId");
            String itemId = req.getParameter("itemId");
            String otherUserId = req.getParameter("otherUserId");
            if (convId != null && itemId != null && !itemId.isBlank() && otherUserId != null) {
                chatService.shareItemInConversation(convId, currentUser.getId(), otherUserId, itemId);
            }
            resp.sendRedirect(req.getContextPath() + "/chat?conv=" + convId);
        } else {
            // Send regular text message
            String convId = req.getParameter("conversationId");
            String message = req.getParameter("message");
            if (convId != null && message != null && !message.isBlank()) {
                chatService.sendMessage(convId, currentUser.getId(), message);
            }
            resp.sendRedirect(req.getContextPath() + "/chat?conv=" + convId);
        }
    }
}
