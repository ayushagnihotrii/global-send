package com.globalsend.filter;

import com.globalsend.model.User;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

/**
 * Advanced Java Servlet Filter for session-based authentication and route guarding.
 */
@WebFilter(filterName = "AuthFilter", urlPatterns = {"/*"})
public class AuthFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        String contextPath = httpRequest.getContextPath();
        String relativePath = path.substring(contextPath.length());

        // Static resources and public routes bypass authentication
        if (isPublicRoute(relativePath)) {
            chain.doFilter(request, response);
            return;
        }

        HttpSession session = httpRequest.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;

        if (currentUser == null) {
            // If AJAX / JSON request, return 401 Unauthorized
            String accept = httpRequest.getHeader("Accept");
            if (accept != null && accept.contains("application/json")) {
                httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\"error\": \"Authentication required\"}");
                return;
            }

            // Otherwise redirect to login page with return URL
            httpResponse.sendRedirect(contextPath + "/login?redirect=" + httpRequest.getRequestURI());
            return;
        }

        // User is authenticated, proceed down the filter chain
        chain.doFilter(request, response);
    }

    private boolean isPublicRoute(String path) {
        if (path == null || path.equals("/") || path.equals("/index.jsp")) return true;
        if (path.startsWith("/assets/")) return true;
        if (path.equals("/login") || path.equals("/register") || path.equals("/auth")) return true;
        if (path.equals("/api/auth/login") || path.equals("/api/auth/register")) return true;
        return false;
    }
}
