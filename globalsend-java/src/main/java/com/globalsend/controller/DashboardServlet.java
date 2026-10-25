package com.globalsend.controller;

import com.globalsend.model.User;
import com.globalsend.model.UserStorageStats;
import com.globalsend.model.VaultItem;
import com.globalsend.service.VaultService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.List;

@WebServlet(name = "DashboardServlet", urlPatterns = {"/dashboard"})
public class DashboardServlet extends HttpServlet {

    private final VaultService vaultService = new VaultService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        User currentUser = (User) session.getAttribute("currentUser");

        String typeFilter = req.getParameter("type");
        String searchQuery = req.getParameter("q");

        List<VaultItem> items;
        if ("shared".equalsIgnoreCase(typeFilter)) {
            items = vaultService.getItemsSharedWithUser(currentUser.getId());
        } else {
            items = vaultService.getUserVaultItems(currentUser.getId(), typeFilter, searchQuery);
        }

        UserStorageStats stats = vaultService.getStorageStats(currentUser.getId());

        req.setAttribute("items", items);
        req.setAttribute("stats", stats);
        req.setAttribute("currentType", (typeFilter != null && !typeFilter.isBlank()) ? typeFilter : "all");
        req.setAttribute("searchQuery", searchQuery != null ? searchQuery : "");
        req.getRequestDispatcher("/WEB-INF/views/dashboard.jsp").forward(req, resp);
    }
}
