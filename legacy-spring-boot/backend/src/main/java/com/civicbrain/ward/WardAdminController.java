package com.civicbrain.ward;

import com.civicbrain.common.ApiException;
import java.io.IOException;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/wards")
public class WardAdminController {
    private final WardService wards;

    public WardAdminController(WardService wards) { this.wards = wards; }

    /** Staff may read the list (for filters); the upload is SUPER_ADMIN only (SecurityConfig). */
    @GetMapping
    public List<WardService.WardRef> list() { return wards.list(); }

    @PostMapping("/upload")
    public WardService.UploadResult upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) {
            throw ApiException.validation("file", "Upload a GeoJSON file up to 5 MB.");
        }
        return wards.uploadGeoJson(file.getBytes());
    }
}
