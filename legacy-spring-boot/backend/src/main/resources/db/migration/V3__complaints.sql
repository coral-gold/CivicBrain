CREATE TABLE complaints (
    id               BIGSERIAL PRIMARY KEY,
    citizen_id       BIGINT       NOT NULL REFERENCES citizens(id),
    ward_id          BIGINT       REFERENCES wards(id),          -- NULL only if no ward row exists yet
    category_id      BIGINT       REFERENCES complaint_categories(id),
    description      VARCHAR(1000) NOT NULL,
    location         geography(Point, 4326) NOT NULL,
    address          VARCHAR(300),
    status           VARCHAR(20)  NOT NULL DEFAULT 'SUBMITTED',
    priority_score   NUMERIC(5,2),
    priority_factors JSONB,
    merged_into_id   BIGINT       REFERENCES complaints(id),
    me_too_count     INTEGER      NOT NULL DEFAULT 0,
    out_of_ward      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT complaints_status_chk CHECK (status IN
      ('SUBMITTED','ANALYZED','PLANNED','APPROVED','SCHEDULED','IN_PROGRESS','RESOLVED','CLOSED','REOPENED','MERGED','REJECTED'))
);
CREATE INDEX complaints_location_gix ON complaints USING GIST (location);
CREATE INDEX complaints_citizen_idx  ON complaints (citizen_id, created_at DESC);
CREATE INDEX complaints_ward_status_idx ON complaints (ward_id, status, priority_score DESC);

CREATE TABLE complaint_media (
    id           BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT      NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    kind         VARCHAR(10) NOT NULL CHECK (kind IN ('BEFORE','AFTER','REOPEN')),
    storage_key  VARCHAR(80) NOT NULL UNIQUE,
    mime         VARCHAR(40) NOT NULL,
    size_bytes   INTEGER     NOT NULL,
    width        INTEGER,
    height       INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX complaint_media_complaint_idx ON complaint_media (complaint_id);

CREATE TABLE complaint_status_history (
    id           BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT      NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    from_status  VARCHAR(20),
    to_status    VARCHAR(20) NOT NULL,
    actor_type   VARCHAR(10) NOT NULL CHECK (actor_type IN ('CITIZEN','STAFF','SYSTEM')),
    actor_id     BIGINT,
    note         VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX complaint_history_idx ON complaint_status_history (complaint_id, created_at);

CREATE TABLE me_too (
    complaint_id BIGINT      NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id   BIGINT      NOT NULL REFERENCES citizens(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (complaint_id, citizen_id)
);
