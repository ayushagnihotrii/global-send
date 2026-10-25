package com.globalsend.service;

import com.globalsend.dao.UserDAO;
import com.globalsend.model.User;
import com.globalsend.util.PasswordUtil;

import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;

/**
 * Service orchestrating single secret-key user authentication and registration.
 */
public class AuthService {

    private final UserDAO userDAO;

    public AuthService() {
        this.userDAO = new UserDAO();
    }

    public AuthService(UserDAO userDAO) {
        this.userDAO = userDAO;
    }

    /**
     * Authenticates an existing user via username and secret key.
     */
    public Optional<User> authenticate(String username, String secretKey) {
        if (username == null || username.isBlank() || secretKey == null || secretKey.isBlank()) {
            return Optional.empty();
        }

        Optional<User> userOpt = userDAO.findByUsername(username.trim());
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }

        User user = userOpt.get();
        if (PasswordUtil.verifySecretKey(secretKey.trim(), user.getPasswordHash())) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    /**
     * Registers a new user account with secret key hashing.
     */
    public User register(String username, String displayName, String secretKey) {
        if (username == null || username.trim().length() < 3) {
            throw new IllegalArgumentException("Username must be at least 3 characters long");
        }
        if (secretKey == null || secretKey.trim().length() < 6) {
            throw new IllegalArgumentException("Secret key must be at least 6 characters long");
        }

        String cleanUsername = username.trim().toLowerCase();
        if (userDAO.findByUsername(cleanUsername).isPresent()) {
            throw new IllegalStateException("Username '" + cleanUsername + "' is already taken");
        }

        String cleanDisplayName = (displayName != null && !displayName.isBlank()) ? displayName.trim() : username.trim();
        String passwordHash = PasswordUtil.hashSecretKey(secretKey.trim());
        String fingerprint = PasswordUtil.generateKeyFingerprint(secretKey.trim());

        User newUser = new User();
        newUser.setId(UUID.randomUUID().toString());
        newUser.setUsername(cleanUsername);
        newUser.setDisplayUsername(cleanDisplayName);
        newUser.setPasswordHash(passwordHash);
        newUser.setKeyFingerprint(fingerprint);
        newUser.setStorageUsedBytes(0);
        newUser.setCreatedAt(new Timestamp(System.currentTimeMillis()));
        newUser.setUpdatedAt(new Timestamp(System.currentTimeMillis()));

        userDAO.create(newUser);
        return newUser;
    }

    public Optional<User> getUserById(String userId) {
        return userDAO.findById(userId);
    }
}
