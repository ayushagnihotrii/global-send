package com.globalsend.controller;

import com.globalsend.model.User;
import com.globalsend.service.FileService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Optional;

/**
 * Controller for high-performance, secure file streaming using Java NIO.
 */
@WebServlet(name = "FileDownloadServlet", urlPatterns = {"/download"})
public class FileDownloadServlet extends HttpServlet {

    private final FileService fileService = new FileService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession();
        User currentUser = (User) session.getAttribute("currentUser");

        String itemId = req.getParameter("id");
        if (itemId == null || itemId.isBlank()) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing item ID parameter");
            return;
        }

        Optional<FileService.DownloadResource> resourceOpt = fileService.getDownloadResource(itemId, currentUser.getId());
        if (resourceOpt.isEmpty()) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND, "File not found or access denied");
            return;
        }

        FileService.DownloadResource res = resourceOpt.get();
        boolean inline = "true".equalsIgnoreCase(req.getParameter("inline"));

        resp.setContentType(res.mimeType());
        resp.setContentLengthLong(res.fileSize());

        String encodedName = URLEncoder.encode(res.originalFilename(), StandardCharsets.UTF_8).replace("+", "%20");
        String disposition = (inline ? "inline" : "attachment") + "; filename=\"" + res.originalFilename().replace("\"", "_") + "\"; filename*=UTF-8''" + encodedName;
        resp.setHeader("Content-Disposition", disposition);

        // Stream file bytes directly using Java NIO zero-copy channel transfer
        Files.copy(res.filePath(), resp.getOutputStream());
    }
}
