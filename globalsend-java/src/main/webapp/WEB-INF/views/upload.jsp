<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%
    String selectedType = (String) request.getAttribute("selectedType");
    if (selectedType == null) selectedType = "file";
    String error = (String) request.getAttribute("error");
    String titleVal = (String) request.getAttribute("title");
    if (titleVal == null) titleVal = "";
    String tagsVal = (String) request.getAttribute("tags");
    if (tagsVal == null) tagsVal = "";
    request.setAttribute("activePage", "upload");
%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Transfer &mdash; GlobalSend</title>
    <link rel="stylesheet" href="<%= request.getContextPath() %>/assets/css/apple-theme.css">
</head>
<body>
    <jsp:include page="components/navbar.jsp" />

    <main class="container" style="max-width: 720px;">
        <div style="margin-bottom: 24px;">
            <a href="<%= request.getContextPath() %>/dashboard" style="font-size: 13px; color: var(--apple-text-secondary);">
                &larr; Back to Vault
            </a>
            <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin-top: 8px;">
                New Vault Transfer
            </h1>
            <p style="color: var(--apple-text-secondary); font-size: 14px; margin-top: 4px;">
                Encrypted with your secret key. Scheduled for deterministic auto-expiration.
            </p>
        </div>

        <% if (error != null) { %>
            <div class="alert alert-danger"><%= error %></div>
        <% } %>

        <div class="apple-card" style="padding: 32px;">
            <!-- Type Tabs -->
            <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--apple-card-border); padding-bottom: 16px;">
                <button type="button" id="tab-file" class="btn <%= "file".equals(selectedType) ? "btn-primary" : "btn-secondary" %>" onclick="switchType('file')">
                    📁 Upload File
                </button>
                <button type="button" id="tab-text" class="btn <%= "text".equals(selectedType) ? "btn-primary" : "btn-secondary" %>" onclick="switchType('text')">
                    📝 Text Note
                </button>
                <button type="button" id="tab-link" class="btn <%= "link".equals(selectedType) ? "btn-primary" : "btn-secondary" %>" onclick="switchType('link')">
                    🔗 Web Link
                </button>
            </div>

            <form action="<%= request.getContextPath() %>/upload" method="POST" enctype="multipart/form-data">
                <input type="hidden" id="itemType" name="itemType" value="<%= selectedType %>">

                <div class="form-group">
                    <label class="form-label" for="title">Title / Name</label>
                    <input type="text" id="title" name="title" class="form-control" 
                           placeholder="Optional descriptive title" value="<%= titleVal %>">
                </div>

                <!-- FILE INPUT SECTION -->
                <div id="section-file" style="<%= "file".equals(selectedType) ? "" : "display: none;" %>">
                    <div class="form-group">
                        <label class="form-label">Select File to Upload</label>
                        <div id="drop-zone" style="border: 2px dashed var(--apple-card-border); border-radius: var(--apple-radius-md); padding: 40px 20px; text-align: center; cursor: pointer; transition: var(--apple-transition);"
                             onclick="document.getElementById('file-input').click()">
                            <div style="font-size: 36px; margin-bottom: 8px;">☁️</div>
                            <p style="font-weight: 600; font-size: 15px;">Click to browse or drag & drop file here</p>
                            <p style="color: var(--apple-text-secondary); font-size: 13px; margin-top: 4px;">
                                Max size: 50MB &bull; Images, documents, archives, videos
                            </p>
                            <p id="file-name-display" style="font-weight: 600; color: var(--apple-blue); margin-top: 12px;"></p>
                        </div>
                        <input type="file" id="file-input" name="file" style="display: none;">
                    </div>
                </div>

                <!-- TEXT INPUT SECTION -->
                <div id="section-text" style="<%= "text".equals(selectedType) ? "" : "display: none;" %>">
                    <div class="form-group">
                        <label class="form-label" for="content">Note Content / Code / Secret</label>
                        <textarea id="content" name="content" class="form-control" placeholder="Write or paste your confidential text here..."></textarea>
                    </div>
                </div>

                <!-- LINK INPUT SECTION -->
                <div id="section-link" style="<%= "link".equals(selectedType) ? "" : "display: none;" %>">
                    <div class="form-group">
                        <label class="form-label" for="url">Target URL</label>
                        <input type="url" id="url" name="url" class="form-control" placeholder="https://example.com/confidential-document">
                    </div>
                </div>

                <!-- EXPIRATION SELECTOR -->
                <div class="form-group" style="margin-top: 24px;">
                    <label class="form-label" for="duration">Auto-Expiration Lifetime</label>
                    <select id="duration" name="duration" class="form-control">
                        <option value="15m">15 Minutes (Ephemeral)</option>
                        <option value="1h">1 Hour</option>
                        <option value="6h">6 Hours</option>
                        <option value="24h" selected>24 Hours (Standard)</option>
                        <option value="3d">3 Days</option>
                        <option value="7d">7 Days</option>
                    </select>
                    <small style="color: var(--apple-text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        The background <code>ScheduledExecutorService</code> thread automatically purges this item when expired.
                    </small>
                </div>

                <!-- TAGS -->
                <div class="form-group">
                    <label class="form-label" for="tags">Tags (Optional)</label>
                    <input type="text" id="tags" name="tags" class="form-control" 
                           placeholder="e.g. work, java, report (comma separated)" value="<%= tagsVal %>">
                </div>

                <div style="display: flex; gap: 12px; margin-top: 32px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1; padding: 12px;">
                        Save to Vault
                    </button>
                    <a href="<%= request.getContextPath() %>/dashboard" class="btn btn-secondary" style="padding: 12px 24px;">
                        Cancel
                    </a>
                </div>
            </form>
        </div>
    </main>

    <script>
        function switchType(type) {
            document.getElementById('itemType').value = type;
            ['file', 'text', 'link'].forEach(t => {
                document.getElementById('section-' + t).style.display = (t === type) ? 'block' : 'none';
                const tab = document.getElementById('tab-' + t);
                if (t === type) {
                    tab.classList.add('btn-primary');
                    tab.classList.remove('btn-secondary');
                } else {
                    tab.classList.remove('btn-primary');
                    tab.classList.add('btn-secondary');
                }
            });
        }
    </script>
    <jsp:include page="components/footer.jsp" />
</body>
</html>
