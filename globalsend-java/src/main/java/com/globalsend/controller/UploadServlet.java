package com.globalsend.controller;

import com.globalsend.model.User;
import com.globalsend.model.VaultItem;
import com.globalsend.service.FileService;
import com.globalsend.service.VaultService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.Part;

import java.io.IOException;

/**
 * Advanced Java Multipart Upload Controller.
 * Manages multipart request streams with Jakarta @MultipartConfig and Java NIO file persistence.
 */
@WebServlet(name = "UploadServlet", urlPatterns = {"/upload"})
@MultipartConfig(
        fileSizeThreshold = 2 * 1024 * 1024,      // 2MB buffer in memory
        maxFileSize = 50 * 1024 * 1024,           // 50MB per file
        maxRequestSize = 60 * 1024 * 1024         // 60MB total request
)
public class UploadServlet extends HttpServlet {

    private final VaultService vaultService = new VaultService();
    private final FileService fileService = new FileService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String defaultType = req.getParameter("type");
        req.setAttribute("selectedType", defaultType != null ? defaultType : "file");
        req.getRequestDispatcher("/WEB-INF/views/upload.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        User currentUser = (User) session.getAttribute("currentUser");

        String itemType = req.getParameter("itemType");
        String title = req.getParameter("title");
        String duration = req.getParameter("duration");
        String tags = req.getParameter("tags");

        try {
            if ("text".equalsIgnoreCase(itemType)) {
                String content = req.getParameter("content");
                vaultService.createTextItem(currentUser.getId(), title, content, duration, tags);
            } else if ("link".equalsIgnoreCase(itemType)) {
                String url = req.getParameter("url");
                String notes = req.getParameter("content");
                vaultService.createLinkItem(currentUser.getId(), title, url, notes, duration, tags);
            } else {
                // File upload via Jakarta Part
                Part filePart = req.getPart("file");
                if (filePart == null || filePart.getSize() <= 0) {
                    throw new IllegalArgumentException("Please select a file to upload");
                }
                fileService.saveUploadedFile(currentUser.getId(), filePart, title, duration, tags);
            }

            resp.sendRedirect(req.getContextPath() + "/dashboard?success=item_created");
        } catch (Exception e) {
            req.setAttribute("error", e.getMessage());
            req.setAttribute("selectedType", itemType != null ? itemType : "file");
            req.setAttribute("title", title);
            req.setAttribute("tags", tags);
            req.getRequestDispatcher("/WEB-INF/views/upload.jsp").forward(req, resp);
        }
    }
}
