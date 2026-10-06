package com.civicbrain.ai;

/**
 * Seam for the FastAPI AI service (built in M3). Implementations must never throw into the complaint
 * flow: AI failures degrade gracefully (SRS §8.4) and the listener below also guards against it.
 */
public interface AiClient {
    void analyze(long complaintId);
}
