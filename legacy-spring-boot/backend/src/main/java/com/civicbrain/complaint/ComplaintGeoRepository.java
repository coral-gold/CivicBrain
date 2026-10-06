package com.civicbrain.complaint;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** All SQL that touches the PostGIS {@code location} column, plus the me_too table. */
@Repository
public class ComplaintGeoRepository {
    public record LatLng(double lat, double lng) {}
    public record Nearby(long id, String description, String address, String status, String categoryCode,
                         int meTooCount, double distanceM, java.time.Instant createdAt, boolean alreadyMeToo) {}

    private final JdbcTemplate jdbc;

    public ComplaintGeoRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public long insert(long citizenId, Long wardId, Long categoryId, String description, String address,
                       double lat, double lng, boolean outOfWard) {
        var keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement("""
                    insert into complaints (citizen_id, ward_id, category_id, description, address, location, out_of_ward)
                    values (?, ?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
                    """, new String[] {"id"});
            ps.setLong(1, citizenId);
            ps.setObject(2, wardId);
            ps.setObject(3, categoryId);
            ps.setString(4, description);
            ps.setString(5, address);
            ps.setDouble(6, lng);
            ps.setDouble(7, lat);
            ps.setBoolean(8, outOfWard);
            return ps;
        }, keys);
        return keys.getKey().longValue();
    }

    public Optional<LatLng> latLng(long complaintId) {
        return jdbc.query("select ST_Y(location::geometry), ST_X(location::geometry) from complaints where id = ?",
                (rs, i) -> new LatLng(rs.getDouble(1), rs.getDouble(2)), complaintId).stream().findFirst();
    }

    /** FR-C3 geo half: open complaints within {@code radiusM}, same category (if given), last 30 days. */
    public List<Nearby> nearby(double lat, double lng, double radiusM, String categoryCode, long citizenId) {
        return jdbc.query("""
                select c.id, c.description, c.address, c.status, cat.code, c.me_too_count, c.created_at,
                       ST_Distance(c.location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) as dist,
                       exists(select 1 from me_too m where m.complaint_id = c.id and m.citizen_id = ?) as mine
                from complaints c left join complaint_categories cat on cat.id = c.category_id
                where ST_DWithin(c.location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
                  and c.status not in ('CLOSED','MERGED','REJECTED','RESOLVED')
                  and c.created_at > now() - interval '30 days'
                  and (?::text is null or cat.code = ?)
                order by dist limit 20
                """, (rs, i) -> new Nearby(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getString(5), rs.getInt(6), rs.getDouble(8), rs.getTimestamp(7).toInstant(), rs.getBoolean(9)),
                lng, lat, citizenId, lng, lat, radiusM, categoryCode, categoryCode);
    }

    /** Returns true if the vote was recorded (false if this citizen already voted). */
    public boolean addMeToo(long complaintId, long citizenId) {
        int inserted = jdbc.update(
                "insert into me_too (complaint_id, citizen_id) values (?, ?) on conflict do nothing", complaintId, citizenId);
        if (inserted == 0) return false;
        jdbc.update("update complaints set me_too_count = me_too_count + 1, updated_at = now() where id = ?", complaintId);
        return true;
    }

    public int meTooCount(long complaintId) {
        Integer n = jdbc.queryForObject("select me_too_count from complaints where id = ?", Integer.class, complaintId);
        return n == null ? 0 : n;
    }

    public boolean hasMeToo(long complaintId, long citizenId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "select exists(select 1 from me_too where complaint_id = ? and citizen_id = ?)", Boolean.class,
                complaintId, citizenId));
    }
}
