package com.globalsend.controller;

import com.globalsend.model.User;
import com.globalsend.model.UserStorageStats;
import com.globalsend.service.VaultService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

@WebServlet(name = "SettingsServlet", urlPatterns = {"/settings"})
public class SettingsServlet extends HttpServlet {

    private final VaultService vaultService = new VaultService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        User currentUser = (User) session.getAttribute("currentUser");

        UserStorageStats stats = vaultService.getStorageStats(currentUser.getId());
        req.setAttribute("stats", stats);
        req.getRequestDispatcher("/WEB-INF/views/settings.jsp").forward(req, resp);
    }
}
