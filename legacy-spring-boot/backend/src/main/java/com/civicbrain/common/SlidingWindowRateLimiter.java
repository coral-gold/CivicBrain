package com.civicbrain.common;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window limiter. Sufficient for a single API instance; swap for a Redis-backed
 * implementation when running more than one (NFR-S7).
 */
public class SlidingWindowRateLimiter {
    private final int max;
    private final Duration window;
    private final Clock clock;
    private final ConcurrentHashMap<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public SlidingWindowRateLimiter(int max, Duration window, Clock clock) {
        this.max = max;
        this.window = window;
        this.clock = clock;
    }

    /** Records an attempt; returns 0 if allowed, otherwise seconds until a slot frees up. */
    public long tryAcquire(String key) {
        long now = clock.millis();
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() >= window.toMillis()) q.pollFirst();
            if (q.size() >= max) {
                return Math.max(1, (window.toMillis() - (now - q.peekFirst()) + 999) / 1000);
            }
            q.addLast(now);
            return 0;
        }
    }

    public void reset() { hits.clear(); }
}
