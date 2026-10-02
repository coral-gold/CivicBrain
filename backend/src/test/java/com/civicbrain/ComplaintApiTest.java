package com.civicbrain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.civicbrain.admin.Role;
import com.civicbrain.citizen.Citizen;
import com.civicbrain.complaint.ComplaintService;
import com.civicbrain.complaint.ComplaintStatus;
import com.civicbrain.security.JwtService;
import jakarta.servlet.http.Cookie;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Random;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

class ComplaintApiTest extends BaseIntegrationTest {
    @Autowired JwtService jwt;
    @Autowired ComplaintService service;

    // Ward 1: lng 73.0–73.1, Ward 2: lng 73.1–73.2, both lat 18.0–18.1
    static final double IN_W1_LAT = 18.05, IN_W1_LNG = 73.05;
    static final double IN_W2_LAT = 18.05, IN_W2_LNG = 73.15;

    Citizen alice, bob;

    @BeforeEach
    void fixtures() {
        for (int n = 1; n <= 2; n++) {
            double x = 73.0 + (n - 1) * 0.1;
            jdbc.update("insert into wards (number, name, boundary) values (?, ?, ST_Multi(ST_GeomFromText(?, 4326)))",
                    n, "Ward " + n, String.format("POLYGON((%f 18.0, %f 18.0, %f 18.1, %f 18.1, %f 18.0))",
                            x, x + 0.1, x + 0.1, x, x));
        }
        alice = citizen("alice@example.com", true);
        bob = citizen("bob@example.com", true);
    }

    // ---- helpers
    Cookie as(Citizen c) { return sessionFor(c, jwt); }

    Cookie asStaff(com.civicbrain.admin.Admin a) { return new Cookie("cb_session", jwt.issue(a.getId(), a.getRole(), true)); }

    static byte[] jpeg() throws Exception { return image("jpg"); }

    static byte[] image(String fmt) throws Exception {
        var img = new BufferedImage(64, 48, BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < 64; x++) for (int y = 0; y < 48; y++) img.setRGB(x, y, (x * 4) << 16 | (y * 5) << 8);
        var bos = new ByteArrayOutputStream();
        ImageIO.write(img, fmt, bos);
        return bos.toByteArray();
    }

    /** Inserts an EXIF APP1 segment carrying a GPS-like marker right after the JPEG SOI. */
    static byte[] jpegWithExif(String marker) throws Exception {
        byte[] j = jpeg();
        byte[] payload = ("Exif\0\0" + marker).getBytes(StandardCharsets.ISO_8859_1);
        int len = payload.length + 2;
        var bos = new ByteArrayOutputStream();
        bos.write(j, 0, 2);
        bos.write(new byte[] {(byte) 0xFF, (byte) 0xE1, (byte) (len >> 8), (byte) len});
        bos.write(payload);
        bos.write(j, 2, j.length - 2);
        return bos.toByteArray();
    }

    String json(String desc, String cat, double lat, double lng) {
        return "{\"description\":\"" + desc + "\"," + (cat == null ? "" : "\"category\":\"" + cat + "\",")
                + "\"lat\":" + lat + ",\"lng\":" + lng + ",\"address\":\"MG Road\"}";
    }

    ResultActions submit(Citizen c, String data, byte[]... imgs) throws Exception {
        MockMultipartHttpServletRequestBuilder b = multipart("/api/citizen/complaints")
                .file(new MockMultipartFile("data", "", "application/json", data.getBytes(StandardCharsets.UTF_8)));
        for (byte[] i : imgs) b.file(new MockMultipartFile("images", "p.jpg", "image/jpeg", i));
        return mvc.perform(b.cookie(as(c)));
    }

    long create(Citizen c, double lat, double lng, String cat) throws Exception {
        String res = submit(c, json("Large pothole near the bus stop", cat, lat, lng), jpeg())
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.parse(res).read("$.id", Long.class);
    }

    void setStatus(long id, String status) {
        jdbc.update("update complaints set status = ? where id = ?", status, id);
    }

    // ---- wards & categories (FR-M2/M3)

    @Test
    void wardUploadIsSuperAdminOnlyAndDrivesWardCount() throws Exception {
        jdbc.update("truncate wards cascade");
        var root = staff("root@example.com", Role.SUPER_ADMIN, null);
        var officer = staff("o@example.com", Role.OFFICER, 1);
        String gj = """
                {"type":"FeatureCollection","features":[
                 {"type":"Feature","properties":{"number":1,"name":"Alpha","population":1000},
                  "geometry":{"type":"Polygon","coordinates":[[[73,18],[73.1,18],[73.1,18.1],[73,18.1],[73,18]]]}},
                 {"type":"Feature","properties":{"number":2,"name":"Beta"},
                  "geometry":{"type":"MultiPolygon","coordinates":[[[[73.1,18],[73.2,18],[73.2,18.1],[73.1,18.1],[73.1,18]]]]}}]}""";
        var file = new MockMultipartFile("file", "wards.geojson", "application/geo+json", gj.getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/admin/wards/upload").file(file).cookie(asStaff(officer))).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/admin/wards/upload").file(file).cookie(as(alice))).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/admin/wards/upload").file(file).cookie(asStaff(root))).andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(2));
        mvc.perform(multipart("/api/admin/wards/upload").file(file).cookie(asStaff(root))).andExpect(jsonPath("$.updated").value(2));
        mvc.perform(get("/api/public/config")).andExpect(jsonPath("$.wardCount").value(2));
        mvc.perform(get("/api/admin/wards").cookie(asStaff(officer))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));

        var bad = new MockMultipartFile("file", "w.geojson", "application/json", "{\"type\":\"Feature\"}".getBytes());
        mvc.perform(multipart("/api/admin/wards/upload").file(bad).cookie(asStaff(root))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.file").exists());
        var selfIntersect = """
                {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"number":3,"name":"X"},
                 "geometry":{"type":"Point","coordinates":[73,18]}}]}""";
        mvc.perform(multipart("/api/admin/wards/upload").file(new MockMultipartFile("file", "w.json", "application/json", selfIntersect.getBytes()))
                .cookie(asStaff(root))).andExpect(status().isBadRequest());
    }

    @Test
    void categoriesArePublicToReadAndSuperAdminToWrite() throws Exception {
        mvc.perform(get("/api/public/categories")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(6));
        var admin = staff("a@example.com", Role.ADMIN, null);
        var root = staff("root@example.com", Role.SUPER_ADMIN, null);
        String body = "{\"code\":\"TREES\",\"nameEn\":\"Trees\",\"nameMr\":\"झाडे\",\"nameHi\":\"पेड़\",\"slaHours\":96,\"active\":true}";
        mvc.perform(post("/api/admin/categories").cookie(asStaff(admin)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/categories").cookie(asStaff(root)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/admin/categories").cookie(asStaff(root)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/categories").cookie(asStaff(root)).contentType(MediaType.APPLICATION_JSON)
                .content(body.replace("96", "0").replace("TREES", "T2"))).andExpect(status().isBadRequest());
    }

    // ---- submission (FR-C1, C2, C8)

    @Test
    void submitAssignsWardFromGpsAndStoresReencodedImagesWithoutExif() throws Exception {
        long id = create(alice, IN_W2_LAT, IN_W2_LNG, "ROAD");   // alice's profile ward is 1, GPS says ward 2
        assertThat(jdbc.queryForObject("select w.number from complaints c join wards w on w.id = c.ward_id where c.id = ?", Integer.class, id)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select out_of_ward from complaints where id = ?", Boolean.class, id)).isFalse();
        assertThat(jdbc.queryForObject("select count(*) from complaint_status_history where complaint_id = ? and to_status = 'SUBMITTED' and from_status is null", Integer.class, id)).isEqualTo(1);

        submit(alice, json("Pothole with hidden gps data", null, IN_W1_LAT, IN_W1_LNG), jpegWithExif("GPSSECRET-12.34N"), image("png"))
                .andExpect(status().isCreated());
        var keys = jdbc.queryForList("select storage_key from complaint_media where complaint_id = 2", String.class);
        assertThat(keys).hasSize(2).allMatch(k -> k.matches("[a-f0-9]{32}\\.jpg"));
        for (String k : keys) {
            byte[] stored = java.nio.file.Files.readAllBytes(java.nio.file.Path.of("target/test-uploads", k));
            assertThat(new String(stored, StandardCharsets.ISO_8859_1)).doesNotContain("GPSSECRET").doesNotContain("Exif");
            assertThat(ImageIO.read(new java.io.ByteArrayInputStream(stored))).isNotNull();
        }
    }

    @Test
    void outsideAllWardsFallsBackToProfileWardAndIsFlagged() throws Exception {
        long id = create(alice, 19.5, 75.5, null);
        assertThat(jdbc.queryForObject("select w.number from complaints c join wards w on w.id = c.ward_id where c.id = ?", Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select out_of_ward from complaints where id = ?", Boolean.class, id)).isTrue();
    }

    @Test
    void imageRulesAreEnforced() throws Exception {
        String data = json("Large pothole near the bus stop", null, IN_W1_LAT, IN_W1_LNG);
        // > 5 MB
        byte[] big = new byte[5 * 1024 * 1024 + 10];
        new Random(1).nextBytes(big);
        big[0] = (byte) 0xFF; big[1] = (byte) 0xD8; big[2] = (byte) 0xFF;
        submit(alice, data, big).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.images").exists());
        // wrong content: a text file claiming to be image/jpeg
        submit(alice, data, "<script>alert(1)</script> not an image at all".getBytes()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.images").exists());
        // magic bytes OK but garbage body
        byte[] fake = new byte[200];
        fake[0] = (byte) 0xFF; fake[1] = (byte) 0xD8; fake[2] = (byte) 0xFF;
        submit(alice, data, fake).andExpect(status().isBadRequest());
        // count rules
        submit(alice, data).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.images").exists());
        submit(alice, data, jpeg(), jpeg(), jpeg(), jpeg()).andExpect(status().isBadRequest());
        submit(alice, data, jpeg(), jpeg(), jpeg()).andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("select count(*) from complaints", Integer.class)).isEqualTo(1);
    }

    @Test
    void fieldValidation() throws Exception {
        submit(alice, json("short", null, IN_W1_LAT, IN_W1_LNG), jpeg()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.description").exists());
        submit(alice, json("Large pothole near the bus stop", null, 91, 73), jpeg()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.lat").exists());
        submit(alice, json("Large pothole near the bus stop", "NOPE", IN_W1_LAT, IN_W1_LNG), jpeg()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.category").exists());
        submit(alice, "{not json", jpeg()).andExpect(status().isBadRequest());
    }

    @Test
    void citizenIsLimitedToTenComplaintsPerDay() throws Exception {
        for (int i = 0; i < ComplaintService.MAX_PER_DAY; i++) create(alice, IN_W1_LAT, IN_W1_LNG, null);
        submit(alice, json("One more pothole than allowed", null, IN_W1_LAT, IN_W1_LNG), jpeg())
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        create(bob, IN_W1_LAT, IN_W1_LNG, null);   // limit is per citizen
    }

    @Test
    void anonymousAndStaffCannotUseCitizenEndpoints() throws Exception {
        mvc.perform(get("/api/citizen/complaints")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/citizen/complaints").cookie(asStaff(staff("a@example.com", Role.ADMIN, null)))).andExpect(status().isForbidden());
    }

    // ---- list / detail / IDOR (NFR-S2)

    @Test
    void listIsPaginatedFilteredAndOwnerOnly() throws Exception {
        for (int i = 0; i < 3; i++) create(alice, IN_W1_LAT, IN_W1_LNG, null);
        long bobs = create(bob, IN_W1_LAT, IN_W1_LNG, null);
        setStatus(2, "RESOLVED");
        mvc.perform(get("/api/citizen/complaints?size=2").cookie(as(alice))).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3)).andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(2));
        mvc.perform(get("/api/citizen/complaints?status=RESOLVED").cookie(as(alice))).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(2));
        mvc.perform(get("/api/citizen/complaints?status=BOGUS").cookie(as(alice))).andExpect(status().isBadRequest());
        assertThat(bobs).isEqualTo(4);
    }

    @Test
    void otherCitizensCannotReadOrActOnAComplaint() throws Exception {
        long id = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        setStatus(id, "RESOLVED");
        mvc.perform(get("/api/citizen/complaints/" + id).cookie(as(bob))).andExpect(status().isNotFound());
        mvc.perform(post("/api/citizen/complaints/" + id + "/confirm").cookie(as(bob))).andExpect(status().isNotFound());
        mvc.perform(multipart("/api/citizen/complaints/" + id + "/reopen")
                .file(new MockMultipartFile("data", "", "application/json", "{\"reason\":\"still broken\"}".getBytes()))
                .file(new MockMultipartFile("image", "a.jpg", "image/jpeg", jpeg())).cookie(as(bob))).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("select status from complaints where id = ?", String.class, id)).isEqualTo("RESOLVED");
        mvc.perform(get("/api/citizen/complaints/" + id).cookie(as(alice))).andExpect(status().isOk())
                .andExpect(jsonPath("$.history[0].to").value("SUBMITTED")).andExpect(jsonPath("$.images.length()").value(1));
    }

    @Test
    void detailMediaUrlsAreSignedAndExpire() throws Exception {
        long id = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        String url = com.jayway.jsonpath.JsonPath.read(mvc.perform(get("/api/citizen/complaints/" + id).cookie(as(alice)))
                .andReturn().getResponse().getContentAsString(), "$.images[0].url");
        var ok = mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_JPEG)).andReturn();
        assertThat(ok.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        mvc.perform(get(url.replaceAll("sig=.{6}", "sig=000000"))).andExpect(status().isNotFound());
        mvc.perform(get(url.replaceAll("exp=\\d+", "exp=1"))).andExpect(status().isNotFound());
        String key = url.substring("/api/media/".length(), url.indexOf('?'));
        mvc.perform(get("/api/media/" + key + "?exp=" + Long.MAX_VALUE + "&sig=abc")).andExpect(status().isNotFound());
        mvc.perform(get("/api/media/..%2F..%2Fetc%2Fpasswd?exp=1&sig=x")).andExpect(status().is4xxClientError());
    }

    // ---- state machine (SRS §5.2)

    @Test
    void illegalTransitionsReturn409() throws Exception {
        long id = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        mvc.perform(post("/api/citizen/complaints/" + id + "/confirm").cookie(as(alice))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));
        mvc.perform(multipart("/api/citizen/complaints/" + id + "/reopen")
                .file(new MockMultipartFile("data", "", "application/json", "{\"reason\":\"still broken\"}".getBytes()))
                .file(new MockMultipartFile("image", "a.jpg", "image/jpeg", jpeg())).cookie(as(alice)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));
        assertThat(jdbc.queryForObject("select count(*) from complaint_status_history where complaint_id = ?", Integer.class, id)).isEqualTo(1);
    }

    @Test
    void stateMachineMatchesTheSpec() {
        var s = ComplaintStatus.class.getEnumConstants();
        assertThat(ComplaintStatus.SUBMITTED.next()).containsExactlyInAnyOrder(ComplaintStatus.ANALYZED, ComplaintStatus.PLANNED, ComplaintStatus.MERGED, ComplaintStatus.REJECTED);
        assertThat(ComplaintStatus.RESOLVED.next()).containsExactlyInAnyOrder(ComplaintStatus.CLOSED, ComplaintStatus.REOPENED);
        assertThat(ComplaintStatus.REOPENED.next()).containsExactly(ComplaintStatus.PLANNED);
        for (var t : List.of(ComplaintStatus.CLOSED, ComplaintStatus.MERGED, ComplaintStatus.REJECTED)) assertThat(t.next()).isEmpty();
        assertThat(ComplaintStatus.IN_PROGRESS.canMoveTo(ComplaintStatus.CLOSED)).isFalse();
        assertThat(s).hasSize(11);
    }

    @Test
    void rejectionNeedsAReason() throws Exception {
        long id = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        var c = complaintsRepo().findById(id).orElseThrow();
        org.junit.jupiter.api.Assertions.assertThrows(com.civicbrain.common.ApiException.class,
                () -> service.transition(c, ComplaintStatus.REJECTED, com.civicbrain.complaint.StatusHistory.ActorType.STAFF, 1L, " "));
    }

    @Autowired com.civicbrain.complaint.ComplaintRepository complaintsRepo;
    com.civicbrain.complaint.ComplaintRepository complaintsRepo() { return complaintsRepo; }

    // ---- confirm / reopen / auto-close (FR-C6)

    @Test
    void confirmClosesAndReopenReturnsToPlanningWithPhoto() throws Exception {
        long a = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        long b = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        for (long id : new long[] {a, b}) {
            setStatus(id, "RESOLVED");
            jdbc.update("insert into complaint_status_history (complaint_id, from_status, to_status, actor_type) values (?, 'IN_PROGRESS', 'RESOLVED', 'STAFF')", id);
        }
        mvc.perform(get("/api/citizen/complaints/" + a).cookie(as(alice))).andExpect(jsonPath("$.canConfirm").value(true))
                .andExpect(jsonPath("$.reopenUntil").exists());
        mvc.perform(post("/api/citizen/complaints/" + a + "/confirm").cookie(as(alice))).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
        mvc.perform(post("/api/citizen/complaints/" + a + "/confirm").cookie(as(alice))).andExpect(status().isConflict());

        // reopen needs a photo and a reason
        mvc.perform(multipart("/api/citizen/complaints/" + b + "/reopen")
                .file(new MockMultipartFile("data", "", "application/json", "{\"reason\":\"still broken\"}".getBytes())).cookie(as(alice)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.image").exists());
        mvc.perform(multipart("/api/citizen/complaints/" + b + "/reopen")
                .file(new MockMultipartFile("data", "", "application/json", "{\"reason\":\"\"}".getBytes()))
                .file(new MockMultipartFile("image", "a.jpg", "image/jpeg", jpeg())).cookie(as(alice)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.reason").exists());
        mvc.perform(multipart("/api/citizen/complaints/" + b + "/reopen")
                .file(new MockMultipartFile("data", "", "application/json", "{\"reason\":\"Water is still pooling\"}".getBytes()))
                .file(new MockMultipartFile("image", "a.jpg", "image/jpeg", jpeg())).cookie(as(alice)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REOPENED"))
                .andExpect(jsonPath("$.images[?(@.kind=='REOPEN')]").exists())
                .andExpect(jsonPath("$.history[-1:].note").value("Water is still pooling"));
    }

    @Test
    void reopenAfterSevenDaysIsRefusedAndStaleResolvedComplaintsAutoClose() throws Exception {
        long id = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        setStatus(id, "RESOLVED");
        jdbc.update("insert into complaint_status_history (complaint_id, from_status, to_status, actor_type, created_at) values (?, 'IN_PROGRESS', 'RESOLVED', 'STAFF', now() - interval '8 days')", id);
        mvc.perform(multipart("/api/citizen/complaints/" + id + "/reopen")
                .file(new MockMultipartFile("data", "", "application/json", "{\"reason\":\"still broken\"}".getBytes()))
                .file(new MockMultipartFile("image", "a.jpg", "image/jpeg", jpeg())).cookie(as(alice)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REOPEN_WINDOW_CLOSED"));
        long fresh = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        setStatus(fresh, "RESOLVED");
        jdbc.update("insert into complaint_status_history (complaint_id, from_status, to_status, actor_type) values (?, 'IN_PROGRESS', 'RESOLVED', 'STAFF')", fresh);

        assertThat(service.autoCloseResolved()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select status from complaints where id = ?", String.class, id)).isEqualTo("CLOSED");
        assertThat(jdbc.queryForObject("select status from complaints where id = ?", String.class, fresh)).isEqualTo("RESOLVED");
        assertThat(jdbc.queryForObject("select actor_type from complaint_status_history where complaint_id = ? and to_status='CLOSED'", String.class, id)).isEqualTo("SYSTEM");
    }

    // ---- nearby + me too (FR-C3)

    @Test
    void nearbyFindsOpenComplaintsWithin150mOfTheSameCategory() throws Exception {
        long road = create(alice, IN_W1_LAT, IN_W1_LNG, "ROAD");
        create(alice, IN_W1_LAT, IN_W1_LNG, "WATER");
        long far = create(alice, IN_W1_LAT + 0.003, IN_W1_LNG, "ROAD");   // ~333 m away
        long closed = create(alice, IN_W1_LAT, IN_W1_LNG, "ROAD");
        setStatus(closed, "CLOSED");
        // bob stands ~100 m south of the first complaint
        mvc.perform(get("/api/citizen/complaints/nearby?lat=" + (IN_W1_LAT - 0.0009) + "&lng=" + IN_W1_LNG + "&category=ROAD").cookie(as(bob)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(road)).andExpect(jsonPath("$[0].alreadyMeToo").value(false))
                .andExpect(result -> assertThat(((Number) com.jayway.jsonpath.JsonPath.read(
                        result.getResponse().getContentAsString(), "$[0].distanceM")).doubleValue()).isBetween(95.0, 105.0));
        mvc.perform(get("/api/citizen/complaints/nearby?lat=" + IN_W1_LAT + "&lng=" + IN_W1_LNG).cookie(as(bob)))
                .andExpect(jsonPath("$.length()").value(2));   // no category filter: ROAD + WATER within range
        mvc.perform(get("/api/citizen/complaints/nearby?lat=95&lng=73").cookie(as(bob))).andExpect(status().isBadRequest());
        assertThat(far).isPositive();
    }

    @Test
    void meTooCountsOncePerCitizenAndNotOnOwnOrClosedComplaints() throws Exception {
        long id = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        mvc.perform(post("/api/citizen/complaints/" + id + "/me-too").cookie(as(alice))).andExpect(status().isConflict());
        mvc.perform(post("/api/citizen/complaints/" + id + "/me-too").cookie(as(bob))).andExpect(status().isOk())
                .andExpect(jsonPath("$.meTooCount").value(1));
        mvc.perform(post("/api/citizen/complaints/" + id + "/me-too").cookie(as(bob))).andExpect(status().isConflict());
        var carol = citizen("carol@example.com", true);
        mvc.perform(post("/api/citizen/complaints/" + id + "/me-too").cookie(as(carol))).andExpect(jsonPath("$.meTooCount").value(2));
        mvc.perform(post("/api/citizen/complaints/9999/me-too").cookie(as(bob))).andExpect(status().isNotFound());
        setStatus(id, "CLOSED");
        var dave = citizen("dave@example.com", true);
        mvc.perform(post("/api/citizen/complaints/" + id + "/me-too").cookie(as(dave))).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select me_too_count from complaints where id = ?", Integer.class, id)).isEqualTo(2);
    }

    // ---- staff read side: ward scoping (NFR-S2)

    @Test
    void officersOnlySeeTheirOwnWard() throws Exception {
        long w1 = create(alice, IN_W1_LAT, IN_W1_LNG, "ROAD");
        long w2 = create(bob, IN_W2_LAT, IN_W2_LNG, "ROAD");
        jdbc.update("update citizens set phone = '9876543210' where id = ?", alice.getId());
        var officer1 = staff("o1@example.com", Role.OFFICER, 1);
        var admin = staff("admin@example.com", Role.ADMIN, null);
        var unassigned = staff("o3@example.com", Role.OFFICER, null);

        mvc.perform(get("/api/admin/complaints").cookie(asStaff(officer1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].id").value(w1))
                .andExpect(jsonPath("$.items[0].wardNumber").value(1));
        mvc.perform(get("/api/admin/complaints?ward=2").cookie(asStaff(officer1))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/complaints/" + w1).cookie(asStaff(officer1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.citizen.maskedPhone").value("98xxxxxx10"))
                .andExpect(jsonPath("$.citizen.name").value("Test Citizen"))
                .andExpect(jsonPath("$.lat").value(IN_W1_LAT)).andExpect(jsonPath("$.images.length()").value(1));
        mvc.perform(get("/api/admin/complaints/" + w2).cookie(asStaff(officer1))).andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/complaints").cookie(asStaff(unassigned))).andExpect(status().isForbidden());

        mvc.perform(get("/api/admin/complaints").cookie(asStaff(admin))).andExpect(jsonPath("$.total").value(2));
        mvc.perform(get("/api/admin/complaints?ward=2&category=ROAD&status=SUBMITTED").cookie(asStaff(admin)))
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].id").value(w2));
        mvc.perform(get("/api/admin/complaints/" + w2).cookie(asStaff(admin))).andExpect(status().isOk());
    }

    @Test
    void staffQueueIsSortedByPriorityThenAge() throws Exception {
        long low = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        long none = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        long high = create(alice, IN_W1_LAT, IN_W1_LNG, null);
        jdbc.update("update complaints set priority_score = 20 where id = ?", low);
        jdbc.update("update complaints set priority_score = 90 where id = ?", high);
        var admin = staff("admin@example.com", Role.ADMIN, null);
        mvc.perform(get("/api/admin/complaints?sort=priority").cookie(asStaff(admin)))
                .andExpect(jsonPath("$.items[0].id").value(high)).andExpect(jsonPath("$.items[1].id").value(low))
                .andExpect(jsonPath("$.items[2].id").value(none));
    }
}
