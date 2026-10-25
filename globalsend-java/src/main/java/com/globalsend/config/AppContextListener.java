package com.globalsend.config;

import com.globalsend.service.FileExpirationService;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;

/**
 * Jakarta EE ServletContextListener.
 * Manages enterprise application lifecycle: HikariCP connection pool and background cleaner thread.
 */
@WebListener
public class AppContextListener implements ServletContextListener {

    private FileExpirationService expirationService;

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        System.out.println("===============================================================");
        System.out.println("  GLOBALSEND JAVA WEB APPLICATION INITIALIZING...              ");
        System.out.println("===============================================================");

        // Initialize Database Connection Pool
        DatabaseConfig.initialize();

        // Start background ScheduledExecutorService
        expirationService = new FileExpirationService();
        expirationService.start();
        sce.getServletContext().setAttribute("expirationService", expirationService);

        System.out.println("[AppContextListener] Application startup complete!");
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        System.out.println("[AppContextListener] Application shutting down...");

        if (expirationService != null) {
            expirationService.stop();
        }

        DatabaseConfig.shutdown();
        System.out.println("[AppContextListener] Application shutdown complete.");
    }
}
