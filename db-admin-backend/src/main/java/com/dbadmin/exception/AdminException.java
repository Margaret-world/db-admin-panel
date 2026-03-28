package com.dbadmin.exception;

/**
 * Business-level exception thrown by the admin service layer.
 */
public class AdminException extends RuntimeException {
    public AdminException(String message) {
        super(message);
    }
}
