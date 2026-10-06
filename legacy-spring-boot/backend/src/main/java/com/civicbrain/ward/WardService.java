package com.civicbrain.ward;

import com.civicbrain.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WardService {
    public record WardRef(long id, int number, String name) {}
    public record UploadResult(int created, int updated) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public WardService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** FR-C2: PostGIS point-in-polygon (ST_Contains). Boundary-touching points are covered too. */
    public Optional<WardRef> findByPoint(double lat, double lng) {
        return jdbc.query("""
                select id, number, name from wards
                where ST_Covers(boundary, ST_SetSRID(ST_MakePoint(?, ?), 4326)) order by number limit 1
                """, (rs, i) -> new WardRef(rs.getLong(1), rs.getInt(2), rs.getString(3)), lng, lat)
                .stream().findFirst();
    }

    public Optional<WardRef> findByNumber(int number) {
        return jdbc.query("select id, number, name from wards where number = ?",
                (rs, i) -> new WardRef(rs.getLong(1), rs.getInt(2), rs.getString(3)), number).stream().findFirst();
    }

    public List<WardRef> list() {
        return jdbc.query("select id, number, name from wards order by number",
                (rs, i) -> new WardRef(rs.getLong(1), rs.getInt(2), rs.getString(3)));
    }

    /** FR-M2: FeatureCollection of (Multi)Polygons with properties {number, name, population?}; upserts by number. */
    @Transactional
    public UploadResult uploadGeoJson(byte[] json) {
        JsonNode root;
        try {
            root = mapper.readTree(json);
        } catch (Exception e) {
            throw ApiException.validation("file", "The file is not valid JSON.");
        }
        JsonNode features = root.path("features");
        if (!"FeatureCollection".equals(root.path("type").asText()) || !features.isArray() || features.isEmpty()) {
            throw ApiException.validation("file", "Expected a GeoJSON FeatureCollection with at least one feature.");
        }
        int created = 0, updated = 0, idx = 0;
        for (JsonNode f : features) {
            idx++;
            String where = "Feature " + idx + ": ";
            JsonNode props = f.path("properties");
            JsonNode geom = f.path("geometry");
            if (!props.path("number").canConvertToInt() || props.path("number").asInt() < 1) {
                throw ApiException.validation("file", where + "properties.number must be a positive integer.");
            }
            String name = props.path("name").asText("").trim();
            if (name.isEmpty() || name.length() > 120) {
                throw ApiException.validation("file", where + "properties.name is required (max 120 chars).");
            }
            String type = geom.path("type").asText();
            if (!type.equals("Polygon") && !type.equals("MultiPolygon")) {
                throw ApiException.validation("file", where + "geometry must be a Polygon or MultiPolygon.");
            }
            Integer population = props.path("population").canConvertToInt() ? props.path("population").asInt() : null;
            int number = props.path("number").asInt();
            boolean existed = Boolean.TRUE.equals(jdbc.queryForObject(
                    "select exists(select 1 from wards where number = ?)", Boolean.class, number));
            try {
                jdbc.update("""
                        insert into wards (number, name, population, boundary)
                        values (?, ?, ?, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)), 3)))
                        on conflict (number) do update
                          set name = excluded.name, population = excluded.population, boundary = excluded.boundary
                        """, number, name, population, geom.toString());
            } catch (DataAccessException e) {
                throw ApiException.validation("file", where + "geometry is not a valid polygon.");
            }
            if (existed) updated++; else created++;
        }
        return new UploadResult(created, updated);
    }
}
