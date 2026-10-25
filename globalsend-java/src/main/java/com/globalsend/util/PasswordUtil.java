package com.globalsend.util;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.HexFormat;

/**
 * Advanced Java Security Utility.
 * Implements PBKDF2WithHmacSHA256 key derivation with per-user salt and constant-time comparison.
 */
public final class PasswordUtil {

    private static final int ITERATIONS = 10000;
    private static final int KEY_LENGTH = 256;
    private static final int SALT_BYTES = 16;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private PasswordUtil() {}

    /**
     * Hashes a secret key with a freshly generated cryptographically secure random salt.
     * Output format: iterations:hexSalt:hexHash
     */
    public static String hashSecretKey(String secretKey) {
        if (secretKey == null || secretKey.trim().isEmpty()) {
            throw new IllegalArgumentException("Secret key cannot be empty");
        }
        byte[] salt = new byte[SALT_BYTES];
        SECURE_RANDOM.nextBytes(salt);

        byte[] hash = pbkdf2(secretKey.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
        return ITERATIONS + ":" + HexFormat.of().formatHex(salt) + ":" + HexFormat.of().formatHex(hash);
    }

    /**
     * Verifies a candidate secret key against a stored salted hash using constant-time comparison.
     */
    public static boolean verifySecretKey(String secretKey, String storedHash) {
        if (secretKey == null || storedHash == null) return false;
        String[] parts = storedHash.split(":");
        if (parts.length != 3) return false;

        try {
            int iterations = Integer.parseInt(parts[0]);
            byte[] salt = HexFormat.of().parseHex(parts[1]);
            byte[] expectedHash = HexFormat.of().parseHex(parts[2]);

            byte[] actualHash = pbkdf2(secretKey.toCharArray(), salt, iterations, expectedHash.length * 8);
            return MessageDigest.isEqual(expectedHash, actualHash);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Generates a unique display fingerprint from the secret key (SHA-256 first 16 hex chars).
     */
    public static String generateKeyFingerprint(String secretKey) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(secretKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return "SHA256:" + HexFormat.of().formatHex(digest).substring(0, 16);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private static byte[] pbkdf2(char[] password, byte[] salt, int iterations, int keyLength) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, keyLength);
            SecretKeyFactory skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return skf.generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new RuntimeException("PBKDF2 key derivation failed", e);
        }
    }
}
