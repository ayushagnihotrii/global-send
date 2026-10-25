package com.globalsend;

import com.globalsend.dao.UserDAO;
import com.globalsend.model.User;
import com.globalsend.service.AuthService;
import com.globalsend.util.PasswordUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class AuthServiceTest {

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(new UserDAO());
    }

    @Test
    void testPasswordHashingAndVerification() {
        String secretKey = "MySuperSecretKey2026";
        String hash = PasswordUtil.hashSecretKey(secretKey);

        assertNotNull(hash);
        assertTrue(hash.contains(":"));
        assertTrue(PasswordUtil.verifySecretKey(secretKey, hash));
        assertFalse(PasswordUtil.verifySecretKey("WrongKey", hash));
    }

    @Test
    void testKeyFingerprintGeneration() {
        String secretKey = "MySuperSecretKey2026";
        String fingerprint = PasswordUtil.generateKeyFingerprint(secretKey);

        assertNotNull(fingerprint);
        assertTrue(fingerprint.startsWith("SHA256:"));
        assertEquals(23, fingerprint.length()); // "SHA256:" (7) + 16 hex chars
    }

    @Test
    void testInvalidRegistrationParameters() {
        assertThrows(IllegalArgumentException.class, () -> {
            authService.register("ab", "Short User", "validkey123");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            authService.register("validuser", "Valid User", "123");
        });
    }
}
