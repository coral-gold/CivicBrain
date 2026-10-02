package com.civicbrain.complaint;

import com.civicbrain.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Public read of active categories; SUPER_ADMIN management (FR-M3, URL rule in SecurityConfig). */
@RestController
public class CategoryController {
    public record CategoryDto(long id, String code, String nameEn, String nameMr, String nameHi, int slaHours,
                              boolean active) {
        static CategoryDto of(ComplaintCategory c) {
            return new CategoryDto(c.getId(), c.getCode(), c.getNameEn(), c.getNameMr(), c.getNameHi(),
                    c.getSlaHours(), c.isActive());
        }
    }

    public record CategoryRequest(
            @Pattern(regexp = "[A-Z][A-Z0-9_]{1,39}", message = "Code must be UPPER_SNAKE_CASE") String code,
            @NotBlank @Size(max = 80) String nameEn,
            @NotBlank @Size(max = 80) String nameMr,
            @NotBlank @Size(max = 80) String nameHi,
            @Min(1) @Max(24 * 365) int slaHours,
            boolean active) {}

    private final ComplaintCategoryRepository repo;

    public CategoryController(ComplaintCategoryRepository repo) { this.repo = repo; }

    @GetMapping("/api/public/categories")
    public List<CategoryDto> active() { return repo.findByActiveTrueOrderById().stream().map(CategoryDto::of).toList(); }

    @GetMapping("/api/admin/categories")
    public List<CategoryDto> all() { return repo.findAll().stream().map(CategoryDto::of).toList(); }

    @PostMapping("/api/admin/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CategoryDto create(@Valid @RequestBody CategoryRequest b) {
        if (b.code() == null) throw ApiException.validation("code", "Code is required");
        if (repo.findAll().stream().anyMatch(c -> c.getCode().equals(b.code()))) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "A category with this code already exists.");
        }
        var c = new ComplaintCategory();
        c.setCode(b.code());
        return CategoryDto.of(repo.save(apply(c, b)));
    }

    @PutMapping("/api/admin/categories/{id}")
    @Transactional
    public CategoryDto update(@PathVariable long id, @Valid @RequestBody CategoryRequest b) {
        return CategoryDto.of(apply(repo.findById(id).orElseThrow(ApiException::notFound), b));   // code is immutable
    }

    private static ComplaintCategory apply(ComplaintCategory c, CategoryRequest b) {
        c.setNameEn(b.nameEn().trim());
        c.setNameMr(b.nameMr().trim());
        c.setNameHi(b.nameHi().trim());
        c.setSlaHours(b.slaHours());
        c.setActive(b.active());
        return c;
    }
}
