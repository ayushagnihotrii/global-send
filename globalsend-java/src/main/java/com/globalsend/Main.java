package com.globalsend;

import com.globalsend.config.AppConfig;
import org.apache.catalina.Context;
import org.apache.catalina.WebResourceRoot;
import org.apache.catalina.startup.Tomcat;
import org.apache.catalina.webresources.DirResourceSet;
import org.apache.catalina.webresources.StandardRoot;

import java.io.File;

/**
 * GlobalSend Application Launcher.
 * Boots an embedded Apache Tomcat 10.1 server with robust webapp path resolution.
 */
public class Main {

    public static void main(String[] args) throws Exception {
        int port = AppConfig.getServerPort();
        System.out.println("============================================================================");
        System.out.println("  STARTING GLOBALSEND ENTERPRISE JAVA APPLICATION                           ");
        System.out.println("  Configured Port: " + port);
        System.out.println("============================================================================");

        // Find webapp directory flexibly regardless of working directory
        File webappDir = resolveDirectory(
                "src/main/webapp",
                "globalsend-java/src/main/webapp",
                "target/globalsend",
                "globalsend-java/target/globalsend"
        );

        if (webappDir == null || !webappDir.exists()) {
            throw new IllegalStateException("Could not find webapp directory in src/main/webapp or globalsend-java/src/main/webapp");
        }

        System.out.println("[Main] Using webapp root: " + webappDir.getAbsolutePath());

        File baseDir = resolveOrCreateDirectory("temp/tomcat", "globalsend-java/temp/tomcat");
        Tomcat tomcat = new Tomcat();
        tomcat.setPort(port);
        tomcat.setBaseDir(baseDir.getAbsolutePath());

        // Create standard HTTP connector
        tomcat.getConnector();

        Context ctx = tomcat.addWebapp("", webappDir.getAbsolutePath());
        ctx.setParentClassLoader(Main.class.getClassLoader());
        ctx.setSessionTimeout(30);

        // Locate compiled classes directory
        File classesDir = resolveDirectory(
                "target/classes",
                "globalsend-java/target/classes"
        );

        if (classesDir != null && classesDir.exists()) {
            System.out.println("[Main] Mounting classes: " + classesDir.getAbsolutePath());
            WebResourceRoot resources = new StandardRoot(ctx);
            resources.addPreResources(new DirResourceSet(resources, "/WEB-INF/classes",
                    classesDir.getAbsolutePath(), "/"));
            ctx.setResources(resources);
        }

        tomcat.start();
        System.out.println("============================================================================");
        System.out.println("  GLOBALSEND IS RUNNING: http://localhost:" + port + "/");
        System.out.println("  Ready for evaluation and testing.                                         ");
        System.out.println("============================================================================");

        tomcat.getServer().await();
    }

    private static File resolveDirectory(String... candidatePaths) {
        for (String path : candidatePaths) {
            File f = new File(path);
            if (f.exists() && f.isDirectory()) {
                return f.getAbsoluteFile();
            }
        }
        return null;
    }

    private static File resolveOrCreateDirectory(String... candidatePaths) {
        for (String path : candidatePaths) {
            File f = new File(path);
            if (f.exists() || f.mkdirs()) {
                return f.getAbsoluteFile();
            }
        }
        File fallback = new File(System.getProperty("java.io.tmpdir"), "globalsend-tomcat");
        fallback.mkdirs();
        return fallback.getAbsoluteFile();
    }
}
