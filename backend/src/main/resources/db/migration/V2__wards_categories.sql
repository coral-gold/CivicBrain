CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE wards (
    id         BIGSERIAL PRIMARY KEY,
    number     INTEGER      NOT NULL UNIQUE,
    name       VARCHAR(120) NOT NULL,
    boundary   geometry(MultiPolygon, 4326) NOT NULL,
    population INTEGER,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX wards_boundary_gix ON wards USING GIST (boundary);

CREATE TABLE complaint_categories (
    id        BIGSERIAL PRIMARY KEY,
    code      VARCHAR(40)  NOT NULL UNIQUE,
    name_en   VARCHAR(80)  NOT NULL,
    name_mr   VARCHAR(80)  NOT NULL,
    name_hi   VARCHAR(80)  NOT NULL,
    sla_hours INTEGER      NOT NULL CHECK (sla_hours > 0),
    active    BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO complaint_categories (code, name_en, name_mr, name_hi, sla_hours) VALUES
 ('ROAD',        'Road / Pothole',        'रस्ता / खड्डा',          'सड़क / गड्ढा',          72),
 ('WATER',       'Water supply',          'पाणीपुरवठा',             'जल आपूर्ति',            24),
 ('SANITATION',  'Sanitation / Garbage',  'स्वच्छता / कचरा',        'स्वच्छता / कचरा',       48),
 ('DRAINAGE',    'Drainage',              'ड्रेनेज / गटार',          'जल निकासी',             48),
 ('STREETLIGHT', 'Streetlight',           'पथदिवे',                 'स्ट्रीटलाइट',           72),
 ('OTHER',       'Other',                 'इतर',                    'अन्य',                  120);
