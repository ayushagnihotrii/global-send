package com.globalsend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.io.File;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Enterprise Database Connection Pool Manager.
 * Utilizes HikariCP for high-performance connection pooling.
 * Supports MySQL 8+ with automated SQLite fallback for local zero-config viva execution.
 */
public final class DatabaseConfig {

    private static HikariDataSource dataSource;
    private static String activeDriverType = "UNKNOWN";

    private DatabaseConfig() {}

    public static synchronized void initialize() {
        if (dataSource != null && !dataSource.isClosed()) {
            return;
        }

        String dbType = AppConfig.getDbType().toLowerCase();
        boolean connected = false;

        if ("auto".equals(dbType) || "mysql".equals(dbType)) {
            try {
                System.out.println("[DatabaseConfig] Attempting MySQL connection via HikariCP...");
                Class.forName("com.mysql.cj.jdbc.Driver");
                HikariConfig config = new HikariConfig();
                config.setDriverClassName("com.mysql.cj.jdbc.Driver");
                config.setJdbcUrl(AppConfig.getMysqlUrl());
                config.setUsername(AppConfig.getMysqlUsername());
                config.setPassword(AppConfig.getMysqlPassword());
                config.setMaximumPoolSize(AppConfig.getInt("db.pool.maxSize", 10));
                config.setMinimumIdle(AppConfig.getInt("db.pool.minIdle", 2));
                config.setConnectionTimeout(3000); // 3 seconds fast failover
                config.setIdleTimeout(30000);
                config.setPoolName("GlobalSend-MySQL-Pool");

                dataSource = new HikariDataSource(config);
                // Test a live connection
                try (Connection conn = dataSource.getConnection()) {
                    activeDriverType = "MYSQL";
                    connected = true;
                    System.out.println("[DatabaseConfig] Successfully connected to MySQL database!");
                }
            } catch (Exception e) {
                System.err.println("[DatabaseConfig] MySQL connection failed: " + e.getMessage());
                if ("mysql".equals(dbType)) {
                    throw new RuntimeException("MySQL connection mandatory by configuration, but failed to connect.", e);
                }
                if (dataSource != null) {
                    dataSource.close();
                    dataSource = null;
                }
            }
        }

        if (!connected) {
            System.out.println("[DatabaseConfig] Initializing SQLite local database fallback (.data/globalsend.db)...");
            try {
                Class.forName("org.sqlite.JDBC");
                // Ensure parent directory exists
                File dataDir = new File(".data");
                if (!dataDir.exists()) {
                    dataDir.mkdirs();
                }

                HikariConfig config = new HikariConfig();
                config.setDriverClassName("org.sqlite.JDBC");
                config.setJdbcUrl(AppConfig.getSqliteUrl());
                config.setMaximumPoolSize(5);
                config.setPoolName("GlobalSend-SQLite-Pool");
                config.addDataSourceProperty("busy_timeout", "10000");

                dataSource = new HikariDataSource(config);
                activeDriverType = "SQLITE";
                System.out.println("[DatabaseConfig] Successfully connected to SQLite database at: " + AppConfig.getSqliteUrl());
            } catch (Exception e) {
                throw new RuntimeException("Failed to initialize database connection pool", e);
            }
        }

        // Initialize schema if tables don't exist
        bootstrapSchema();
    }

    public static Connection getConnection() throws SQLException {
        if (dataSource == null || dataSource.isClosed()) {
            initialize();
        }
        return dataSource.getConnection();
    }

    public static String getActiveDriverType() {
        return activeDriverType;
    }

    public static synchronized void shutdown() {
        if (dataSource != null && !dataSource.isClosed()) {
            System.out.println("[DatabaseConfig] Shutting down HikariCP connection pool...");
            dataSource.close();
            dataSource = null;
        }
    }

    private static void bootstrapSchema() {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            if ("SQLITE".equals(activeDriverType)) {
                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        username TEXT NOT NULL UNIQUE,
                        display_username TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        key_fingerprint TEXT NOT NULL,
                        storage_used_bytes INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """);

                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS items (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        type TEXT NOT NULL,
                        title TEXT NOT NULL,
                        content TEXT,
                        url TEXT,
                        storage_key TEXT,
                        file_name TEXT,
                        mime_type TEXT,
                        file_size INTEGER DEFAULT 0,
                        is_favorite INTEGER DEFAULT 0,
                        is_pinned INTEGER DEFAULT 0,
                        is_archived INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP,
                        expiration_duration_sec INTEGER DEFAULT 86400,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """);

                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS files (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        item_id TEXT NOT NULL,
                        storage_key TEXT NOT NULL,
                        original_filename TEXT NOT NULL,
                        sanitized_filename TEXT NOT NULL,
                        mime_type TEXT NOT NULL,
                        file_size INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
                    );
                """);

                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS tags (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE
                    );
                """);

                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS item_tags (
                        item_id TEXT NOT NULL,
                        tag_id TEXT NOT NULL,
                        PRIMARY KEY (item_id, tag_id),
                        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
                        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                    );
                """);

                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id TEXT PRIMARY KEY,
                        user1_id TEXT NOT NULL,
                        user2_id TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user1_id, user2_id)
                    );
                """);

                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS messages (
                        id TEXT PRIMARY KEY,
                        conversation_id TEXT NOT NULL,
                        sender_id TEXT NOT NULL,
                        content TEXT NOT NULL,
                        message_type TEXT DEFAULT 'text',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """);

                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS item_shares (
                        id TEXT PRIMARY KEY,
                        item_id TEXT NOT NULL,
                        shared_by_user_id TEXT NOT NULL,
                        shared_with_user_id TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
                        FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """);

                stmt.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS user_blocks (
                        id TEXT PRIMARY KEY,
                        blocker_id TEXT NOT NULL,
                        blocked_id TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(blocker_id, blocked_id)
                    );
                """);
            }
            System.out.println("[DatabaseConfig] Database schema verified and ready.");
        } catch (SQLException e) {
            System.err.println("[DatabaseConfig] Schema bootstrap warning: " + e.getMessage());
        }
    }
}
