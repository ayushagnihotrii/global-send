package com.globalsend.controller;

import com.globalsend.model.User;
import com.globalsend.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.Optional;

/**
 * Controller handling user authentication, registration, and session invalidation.
 */
@WebServlet(name = "AuthServlet", urlPatterns = {"/login", "/register", "/logout"})
public class AuthServlet extends HttpServlet {

    private final AuthService authService = new AuthService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String servletPath = req.getServletPath();

        if ("/logout".equals(servletPath)) {
            HttpSession session = req.getSession(false);
            if (session != null) {
                session.invalidate(); // Jakarta session invalidation
            }
            resp.sendRedirect(req.getContextPath() + "/login?message=logged_out");
            return;
        }

        // If already logged in, redirect to dashboard
        HttpSession session = req.getSession(false);
        if (session != null && session.getAttribute("currentUser") != null) {
            resp.sendRedirect(req.getContextPath() + "/dashboard");
            return;
        }

        boolean isRegister = "/register".equals(servletPath);
        req.setAttribute("isRegister", isRegister);
        req.getRequestDispatcher("/WEB-INF/views/login.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String servletPath = req.getServletPath();

        if ("/logout".equals(servletPath)) {
            HttpSession session = req.getSession(false);
            if (session != null) session.invalidate();
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }

        String username = req.getParameter("username");
        String secretKey = req.getParameter("secretKey");
        String displayName = req.getParameter("displayName");

        try {
            if ("/register".equals(servletPath)) {
                User user = authService.register(username, displayName, secretKey);
                HttpSession session = req.getSession(true);
                session.setAttribute("currentUser", user);
                session.setMaxInactiveInterval(1800); // 30 minutes
                resp.sendRedirect(req.getContextPath() + "/dashboard?welcome=true");
            } else {
                // Login
                Optional<User> userOpt = authService.authenticate(username, secretKey);
                if (userOpt.isPresent()) {
                    HttpSession session = req.getSession(true);
                    session.setAttribute("currentUser", userOpt.get());
                    session.setMaxInactiveInterval(1800);

                    String redirect = req.getParameter("redirect");
                    if (redirect != null && !redirect.isBlank() && redirect.startsWith(req.getContextPath())) {
                        resp.sendRedirect(redirect);
                    } else {
                        resp.sendRedirect(req.getContextPath() + "/dashboard");
                    }
                } else {
                    req.setAttribute("error", "Invalid username or secret key. Please check your credentials.");
                    req.setAttribute("username", username);
                    req.setAttribute("isRegister", false);
                    req.getRequestDispatcher("/WEB-INF/views/login.jsp").forward(req, resp);
                }
            }
        } catch (Exception e) {
            req.setAttribute("error", e.getMessage());
            req.setAttribute("username", username);
            req.setAttribute("displayName", displayName);
            req.setAttribute("isRegister", "/register".equals(servletPath));
            req.getRequestDispatcher("/WEB-INF/views/login.jsp").forward(req, resp);
        }
    }
}
