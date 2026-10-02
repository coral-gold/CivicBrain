package com.civicbrain.storage;

import java.util.Optional;

/** Abstraction over local disk (dev) and S3-compatible storage (prod, SRS §3). */
public interface FileStorage {
    void put(String key, byte[] data);
    Optional<byte[]> get(String key);
    void delete(String key);
}
