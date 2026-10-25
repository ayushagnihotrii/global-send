package com.globalsend.controller;

import com.globalsend.model.User;
import com.globalsend.service.ChatService;
import com.globalsend.service.VaultService;
import com.globalsend.util.JsonUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * RESTful JSON API Servlet.
 * Provides backwards-compatible JSON API endpoints matching the original application architecture.
 */
@WebServlet(name = "ApiServlet", urlPatterns = {"/api/*"})
public class ApiServlet extends HttpServlet {

    private final VaultService vaultService = new VaultService();
    private final ChatService chatService = new ChatService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json;charset=UTF-8");
        HttpSession session = req.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;

        String pathInfo = req.getPathInfo();
        if (pathInfo == null) pathInfo = "";

        if (currentUser == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write(JsonUtil.toJson(Map.of("error", "Unauthorized")));
            return;
        }

        switch (pathInfo) {
            case "/items" -> {
                String type = req.getParameter("type");
                String q = req.getParameter("q");
                var items = vaultService.getUserVaultItems(currentUser.getId(), type, q);
                resp.getWriter().write(JsonUtil.toJson(items));
            }
            case "/user/storage" -> {
                var stats = vaultService.getStorageStats(currentUser.getId());
                resp.getWriter().write(JsonUtil.toJson(stats));
            }
            case "/chats" -> {
                var convs = chatService.getUserConversations(currentUser.getId());
                resp.getWriter().write(JsonUtil.toJson(convs));
            }
            case "/users/search" -> {
                String q = req.getParameter("q");
                var users = chatService.searchUsers(q, currentUser.getId());
                resp.getWriter().write(JsonUtil.toJson(users));
            }
            default -> {
                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                resp.getWriter().write(JsonUtil.toJson(Map.of("error", "API endpoint not found")));
            }
        }
    }
}
