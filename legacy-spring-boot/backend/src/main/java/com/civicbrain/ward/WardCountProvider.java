package com.civicbrain.ward;

import com.civicbrain.config.AppProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** WARD_COUNT is derived from uploaded ward boundaries (FR-M2); an env fallback applies until then. */
@Component
public class WardCountProvider {
    private final JdbcTemplate jdbc;
    private final int fallback;

    public WardCountProvider(JdbcTemplate jdbc, AppProperties props) {
        this.jdbc = jdbc;
        this.fallback = props.wardCountFallback();
    }

    public int wardCount() {
        Integer max = jdbc.queryForObject("select max(number) from wards", Integer.class);
        return max == null ? fallback : max;
    }
}
