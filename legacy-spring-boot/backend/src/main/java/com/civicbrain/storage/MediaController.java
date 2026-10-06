package com.civicbrain.storage;

import com.civicbrain.common.ApiException;
import java.util.concurrent.TimeUnit;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/media")
public class MediaController {
    private final FileStorage storage;
    private final SignedUrlService signer;

    public MediaController(FileStorage storage, SignedUrlService signer) {
        this.storage = storage;
        this.signer = signer;
    }

    @GetMapping("/{key}")
    public ResponseEntity<byte[]> get(@PathVariable String key, @RequestParam long exp, @RequestParam String sig) {
        if (!key.matches("[a-f0-9]{32}\\.jpg") || !signer.valid(key, exp, sig)) throw ApiException.notFound();
        byte[] data = storage.get(key).orElseThrow(ApiException::notFound);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(data);
    }
}
