package com.globalsend.util;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

public final class ExpirationUtil {

    private ExpirationUtil() {}

    /**
     * Calculates expiration Timestamp given duration in seconds.
     */
    public static Timestamp calculateExpiresAt(int durationSeconds) {
        if (durationSeconds <= 0) {
            durationSeconds = 86400; // default 24h
        }
        return Timestamp.from(Instant.now().plus(durationSeconds, ChronoUnit.SECONDS));
    }

    /**
     * Parses duration string or presets:
     * "15m" -> 900
     * "1h" -> 3600
     * "6h" -> 21600
     * "24h" -> 86400
     * "7d" -> 604800
     */
    public static int parseDurationString(String durationStr) {
        if (durationStr == null || durationStr.isBlank()) {
            return 86400; // Default 24 hours
        }
        durationStr = durationStr.trim().toLowerCase();
        return switch (durationStr) {
            case "15m", "900" -> 900;
            case "1h", "3600" -> 3600;
            case "6h", "21600" -> 21600;
            case "24h", "1d", "86400" -> 86400;
            case "3d", "259200" -> 259200;
            case "7d", "604800" -> 604800;
            default -> {
                try {
                    yield Math.max(60, Integer.parseInt(durationStr));
                } catch (NumberFormatException e) {
                    yield 86400;
                }
            }
        };
    }
}
