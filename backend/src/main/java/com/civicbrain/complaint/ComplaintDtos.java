package com.civicbrain.complaint;

import com.civicbrain.citizen.Citizen;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ComplaintDtos {
    private ComplaintDtos() {}

    public record CreateComplaintRequest(
            @NotBlank(message = "Describe the problem")
            @Size(min = 10, max = 1000, message = "Description must be 10–1000 characters") String description,
            @Size(max = 40) String category,
            @NotNull(message = "Location is required")
            @DecimalMin(value = "-90", message = "Invalid latitude") @DecimalMax(value = "90", message = "Invalid latitude") Double lat,
            @NotNull(message = "Location is required")
            @DecimalMin(value = "-180", message = "Invalid longitude") @DecimalMax(value = "180", message = "Invalid longitude") Double lng,
            @Size(max = 300, message = "Address is too long") String address) {}

    public record ReopenRequest(
            @NotBlank(message = "Tell us what is still wrong")
            @Size(min = 5, max = 500, message = "Reason must be 5–500 characters") String reason) {}

    public record CategoryRef(String code, String name) {}

    public record ImageDto(long id, String kind, String url) {}

    public record HistoryDto(String from, String to, String actorType, String note, Instant at) {}

    public record ComplaintSummary(long id, String status, CategoryRef category, String description, String address,
                                   int meTooCount, Instant createdAt) {}

    public record ComplaintDetail(long id, String status, CategoryRef category, String description, String address,
                                  double lat, double lng, int meTooCount, boolean outOfWard, Instant createdAt,
                                  Instant updatedAt, List<ImageDto> images, List<HistoryDto> history,
                                  boolean canConfirm, Instant reopenUntil) {}

    public record NearbyDto(long id, String description, String address, String status, String categoryCode,
                            int meTooCount, long distanceM, Instant createdAt, boolean alreadyMeToo) {}

    public record MeTooResponse(int meTooCount) {}

    public record CreatedResponse(long id, String status, boolean outOfWard) {}

    // ---- staff views ----
    public record CitizenRef(String name, String maskedPhone) {
        public static CitizenRef of(Citizen c) {
            return new CitizenRef(c.getFullName(), mask(c.getPhone()));
        }

        /** SRS §8.2: 98xxxxxx10 */
        static String mask(String phone) {
            if (phone == null || phone.length() != 10) return null;
            return phone.substring(0, 2) + "xxxxxx" + phone.substring(8);
        }
    }

    public record StaffSummary(long id, String status, CategoryRef category, String description, String address,
                               Integer wardNumber, BigDecimal priorityScore, int meTooCount, boolean outOfWard,
                               Instant createdAt) {}

    public record StaffDetail(StaffSummary summary, CitizenRef citizen, double lat, double lng, List<ImageDto> images,
                              List<HistoryDto> history) {}
}
