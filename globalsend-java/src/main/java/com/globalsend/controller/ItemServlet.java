package com.globalsend.controller;

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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@WebServlet(name = "ItemServlet", urlPatterns = {"/item"})
public class ItemServlet extends HttpServlet {

    private final VaultService vaultService = new VaultService();
    private final ChatService chatService = new ChatService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        User currentUser = (User) session.getAttribute("currentUser");

        String itemId = req.getParameter("id");
        if (itemId == null || itemId.isBlank()) {
            resp.sendRedirect(req.getContextPath() + "/dashboard");
            return;
        }

        Optional<VaultItem> itemOpt = vaultService.getItemDetails(itemId, currentUser.getId());
        if (itemOpt.isEmpty()) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND, "Vault item not found or expired");
            return;
        }

        VaultItem item = itemOpt.get();
        boolean isOwner = item.getUserId().equals(currentUser.getId());

        req.setAttribute("item", item);
        req.setAttribute("isOwner", isOwner);
        req.getRequestDispatcher("/WEB-INF/views/item-detail.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        User currentUser = (User) session.getAttribute("currentUser");

        String itemId = req.getParameter("id");
        String action = req.getParameter("action");

        if (itemId == null || itemId.isBlank()) {
            resp.sendRedirect(req.getContextPath() + "/dashboard");
            return;
        }

        if ("delete".equalsIgnoreCase(action)) {
            vaultService.deleteItem(itemId, currentUser.getId());
            resp.sendRedirect(req.getContextPath() + "/dashboard?success=item_deleted");
        } else if ("toggle-favorite".equalsIgnoreCase(action)) {
            vaultService.toggleFavorite(itemId, currentUser.getId());
            resp.sendRedirect(req.getContextPath() + "/item?id=" + itemId);
        } else if ("toggle-pin".equalsIgnoreCase(action)) {
            vaultService.togglePin(itemId, currentUser.getId());
            resp.sendRedirect(req.getContextPath() + "/item?id=" + itemId);
        } else if ("share".equalsIgnoreCase(action)) {
            String targetUsername = req.getParameter("targetUsername");
            try {
                User targetUser = vaultService.shareItemWithUser(itemId, currentUser.getId(), targetUsername);
                // Also post an item_share message to their direct conversation
                Conversation conv = chatService.openConversationWithUsername(currentUser.getId(), targetUser.getUsername());
                chatService.shareItemInConversation(conv.getId(), currentUser.getId(), targetUser.getId(), itemId);

                resp.sendRedirect(req.getContextPath() + "/item?id=" + itemId + "&success=shared_with_" + URLEncoder.encode(targetUser.getUsername(), StandardCharsets.UTF_8));
            } catch (Exception e) {
                resp.sendRedirect(req.getContextPath() + "/item?id=" + itemId + "&error=" + URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8));
            }
        } else {
            resp.sendRedirect(req.getContextPath() + "/dashboard");
        }
    }
}
