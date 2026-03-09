CREATE TABLE matches (
    match_id VARCHAR(50) PRIMARY KEY,

    user_id_a VARCHAR(50),
    user_id_b VARCHAR(50),

    topic VARCHAR(50),
    difficulty VARCHAR(50),

    status VARCHAR(20) NOT NULL,

    proposal_expiry TIMESTAMP,

    session_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_matches_status
ON matches(status);

CREATE INDEX idx_matches_expiry
ON matches(proposal_expiry);

CREATE INDEX idx_matches_topic_difficulty
ON matches(topic, difficulty);

CREATE TABLE match_events (
    event_id VARCHAR(50) PRIMARY KEY,

    match_id VARCHAR(50),

    event_type VARCHAR(50),

    payload JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_match_events_match_id
ON match_events(match_id);