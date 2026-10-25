package com.globalsend.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Centralized Application Configuration Provider.
 * Loads settings from application.properties with intelligent fallbacks.
 */
public final class AppConfig {

    private static final Properties PROPS = new Properties();

    static {
        try (InputStream in = AppConfig.class.getClassLoader().getResourceAsStream("application.properties")) {
            if (in != null) {
                PROPS.load(in);
            }
        } catch (IOException e) {
            System.err.println("[AppConfig] Warning: Could not load application.properties, using defaults. " + e.getMessage());
        }
    }

    private AppConfig() {}

    public static String get(String key, String defaultValue) {
        String sysProp = System.getProperty(key);
        if (sysProp != null && !sysProp.isBlank()) return sysProp;
        String envVal = System.getenv(key.replace('.', '_').toUpperCase());
        if (envVal != null && !envVal.isBlank()) return envVal;
        return PROPS.getProperty(key, defaultValue);
    }

    public static int getInt(String key, int defaultValue) {
        String val = get(key, null);
        if (val == null) return defaultValue;
        try {
            return Integer.parseInt(val.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public static long getLong(String key, long defaultValue) {
        String val = get(key, null);
        if (val == null) return defaultValue;
        try {
            return Long.parseLong(val.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public static int getServerPort() {
        String portEnv = System.getenv("PORT");
        if (portEnv != null && !portEnv.isBlank()) {
            try {
                return Integer.parseInt(portEnv.trim());
            } catch (NumberFormatException ignored) {}
        }
        return getInt("server.port", 8080);
    }

    public static String getDbType() {
        return get("db.type", "auto");
    }

    public static String getMysqlUrl() {
        return get("db.mysql.url", "jdbc:mysql://localhost:3306/globalsend?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8");
    }

    public static String getMysqlUsername() {
        return get("db.mysql.username", "root");
    }

    public static String getMysqlPassword() {
        return get("db.mysql.password", "");
    }

    public static String getSqliteUrl() {
        return get("db.sqlite.url", "jdbc:sqlite:.data/globalsend.db");
    }

    public static String getUploadDir() {
        return get("storage.upload.dir", ".data/uploads");
    }

    public static long getMaxFileSizeBytes() {
        return getLong("storage.max.file.size.bytes", 50 * 1024 * 1024L);
    }

    public static int getExpirationCleanupInterval() {
        return getInt("expiration.cleanup.interval.seconds", 60);
    }
}
