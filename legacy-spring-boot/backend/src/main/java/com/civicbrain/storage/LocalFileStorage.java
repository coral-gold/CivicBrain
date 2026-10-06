package com.civicbrain.storage;

import com.civicbrain.config.AppProperties;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class LocalFileStorage implements FileStorage {
    static final Pattern KEY = Pattern.compile("[a-f0-9]{32}\\.jpg");
    private final Path root;

    public LocalFileStorage(AppProperties props) {
        this.root = Path.of(props.storageDir()).toAbsolutePath().normalize();
    }

    @Override
    public void put(String key, byte[] data) {
        try {
            Files.createDirectories(root);
            Files.write(resolve(key), data);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public Optional<byte[]> get(String key) {
        try {
            Path p = resolve(key);
            return Files.exists(p) ? Optional.of(Files.readAllBytes(p)) : Optional.empty();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Keys are server-generated random names; anything else is refused so no path can escape the root. */
    private Path resolve(String key) {
        if (!KEY.matcher(key).matches()) throw new IllegalArgumentException("bad storage key");
        return root.resolve(key);
    }
}
