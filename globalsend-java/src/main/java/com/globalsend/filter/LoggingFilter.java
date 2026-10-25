package com.globalsend.filter;

import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/**
 * Filter for HTTP request logging, diagnostic auditing, and performance profiling.
 */
@WebFilter(filterName = "LoggingFilter", urlPatterns = {"/*"})
public class LoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        long startTime = System.currentTimeMillis();
        String uri = req.getRequestURI();
        String method = req.getMethod();

        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            if (!uri.startsWith(req.getContextPath() + "/assets/")) {
                System.out.println(String.format("[HTTP] %-6s %-35s -> %d (%d ms)",
                        method, uri, res.getStatus(), duration));
            }
        }
    }
}
