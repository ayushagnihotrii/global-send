<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%
    if (session.getAttribute("currentUser") != null) {
        response.sendRedirect(request.getContextPath() + "/dashboard");
    } else {
        request.getRequestDispatcher("/WEB-INF/views/index.jsp").forward(request, response);
    }
%>
