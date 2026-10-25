package com.globalsend;

import com.globalsend.util.ExpirationUtil;
import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class VaultServiceTest {

    @Test
    void testDurationParsing() {
        assertEquals(900, ExpirationUtil.parseDurationString("15m"));
        assertEquals(3600, ExpirationUtil.parseDurationString("1h"));
        assertEquals(21600, ExpirationUtil.parseDurationString("6h"));
        assertEquals(86400, ExpirationUtil.parseDurationString("24h"));
        assertEquals(604800, ExpirationUtil.parseDurationString("7d"));
        assertEquals(86400, ExpirationUtil.parseDurationString("invalid"));
    }

    @Test
    void testCalculateExpiresAt() {
        Timestamp expiresAt = ExpirationUtil.calculateExpiresAt(3600);
        assertNotNull(expiresAt);
        long futureSec = expiresAt.toInstant().getEpochSecond();
        long nowSec = Instant.now().getEpochSecond();
        assertTrue(futureSec >= nowSec + 3590 && futureSec <= nowSec + 3610);
    }
}
