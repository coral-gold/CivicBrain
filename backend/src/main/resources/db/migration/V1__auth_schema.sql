-- FROZEN (M1): auth schema. Never edit once applied; add V{n} files instead.

CREATE TABLE citizens (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(254) NOT NULL UNIQUE,          -- stored lower-case
    full_name           VARCHAR(100) NOT NULL,
    phone               VARCHAR(10)  UNIQUE,
    gender              VARCHAR(20),
    date_of_birth       DATE,
    ward_number         INTEGER,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PROFILE_PENDING',
    email_notifications BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT citizens_status_chk CHECK (status IN ('PROFILE_PENDING','ACTIVE','SUSPENDED'))
);

CREATE TABLE admins (
    id                   BIGSERIAL PRIMARY KEY,
    email                VARCHAR(254) NOT NULL UNIQUE,
    full_name            VARCHAR(100) NOT NULL,
    password_hash        VARCHAR(100) NOT NULL,
    role                 VARCHAR(20)  NOT NULL,
    assigned_ward_number INTEGER,                                -- OFFICER scope; NULL for ADMIN/SUPER_ADMIN
    status               VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    failed_attempts      INTEGER      NOT NULL DEFAULT 0,
    locked_until         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT admins_role_chk   CHECK (role IN ('OFFICER','ADMIN','SUPER_ADMIN')),
    CONSTRAINT admins_status_chk CHECK (status IN ('ACTIVE','DISABLED'))
);

CREATE TABLE otp_codes (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(254) NOT NULL,
    purpose     VARCHAR(10)  NOT NULL,                           -- SIGNUP | LOGIN
    name        VARCHAR(100),                                    -- signup only
    code_hash   VARCHAR(64)  NOT NULL,                           -- HMAC-SHA256 hex, never the code
    expires_at  TIMESTAMPTZ  NOT NULL,
    attempts    INTEGER      NOT NULL DEFAULT 0,
    consumed    BOOLEAN      NOT NULL DEFAULT FALSE,             -- used, superseded or locked
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX otp_codes_email_idx ON otp_codes (email, created_at DESC);

CREATE TABLE auth_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    event       VARCHAR(40)  NOT NULL,
    subject     VARCHAR(254),
    ip          VARCHAR(64),
    user_agent  VARCHAR(300),
    detail      VARCHAR(300),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX auth_audit_log_created_idx ON auth_audit_log (created_at DESC);
