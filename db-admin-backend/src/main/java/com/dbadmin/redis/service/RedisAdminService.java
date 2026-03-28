package com.dbadmin.redis.service;

import com.dbadmin.exception.AdminException;
import com.dbadmin.redis.model.*;
import io.lettuce.core.KeyScanCursor;
import io.lettuce.core.RedisClient;
import io.lettuce.core.ScanArgs;
import io.lettuce.core.ScoredValue;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisAdminService {

    private final RedisClient redisAdminClient;

    private static final int SCAN_COUNT = 100;

    // ── Connection helper ─────────────────────────────────────────────────────

    /**
     * Opens a short-lived connection to the requested DB index.
     * Caller must close the connection (use try-with-resources).
     */
    private StatefulRedisConnection<String, String> connect(int db) {
        if (db < 0 || db > 15) throw new AdminException("Redis DB index must be 0–15");
        StatefulRedisConnection<String, String> conn = redisAdminClient.connect();
        conn.sync().select(db);
        return conn;
    }

    // ── DB info ───────────────────────────────────────────────────────────────

    /**
     * Returns key count for each DB index 0–15.
     * Uses INFO keyspace so it's a single round-trip.
     */
    public Map<Integer, Long> getDbSizes() {
        try (StatefulRedisConnection<String, String> conn = redisAdminClient.connect()) {
            RedisCommands<String, String> cmd = conn.sync();
            String keyspace = cmd.info("keyspace");
            Map<Integer, Long> result = new LinkedHashMap<>();
            // Populate all 16 DBs with 0 first
            for (int i = 0; i <= 15; i++) result.put(i, 0L);
            // Parse lines like: db0:keys=42,expires=3,avg_ttl=0
            for (String line : keyspace.split("\n")) {
                if (line.startsWith("db")) {
                    try {
                        int idx = Integer.parseInt(line.substring(2, line.indexOf(':')));
                        String keysStr = Arrays.stream(line.split(","))
                                .filter(p -> p.contains("keys="))
                                .findFirst().orElse("keys=0");
                        long keys = Long.parseLong(keysStr.split("=")[1].trim());
                        result.put(idx, keys);
                    } catch (Exception ignored) {}
                }
            }
            return result;
        }
    }

    // ── Key scan ──────────────────────────────────────────────────────────────

    /**
     * SCAN one page of keys matching the pattern in the given DB.
     *
     * @param db      Redis DB index (0-15)
     * @param pattern SCAN match pattern, e.g. "*", "user:*", "session:???"
     * @param cursor  cursor from previous page, "0" to start
     * @param count   hint for SCAN COUNT (actual count may differ)
     */
    public RedisKeyPage scanKeys(int db, String pattern, String cursor, int count) {
        String matchPattern = StringUtils.hasText(pattern) ? pattern : "*";
        int scanCount = Math.min(Math.max(count, 10), 500);

        try (StatefulRedisConnection<String, String> conn = connect(db)) {
            RedisCommands<String, String> cmd = conn.sync();
            long dbSize = cmd.dbsize();

            ScanArgs args = ScanArgs.Builder.matches(matchPattern).limit(scanCount);
            KeyScanCursor<String> result = cmd.scan(
                    io.lettuce.core.ScanCursor.of(cursor == null ? "0" : cursor), args);

            List<RedisKeyInfo> keys = result.getKeys().stream()
                    .map(key -> buildKeyInfo(cmd, key))
                    .collect(Collectors.toList());

            return RedisKeyPage.builder()
                    .nextCursor(result.getCursor())
                    .complete(result.isFinished())
                    .count(keys.size())
                    .dbSize(dbSize)
                    .keys(keys)
                    .build();
        }
    }

    // ── Key detail ────────────────────────────────────────────────────────────

    public RedisKeyDetail getKeyDetail(int db, String key) {
        try (StatefulRedisConnection<String, String> conn = connect(db)) {
            RedisCommands<String, String> cmd = conn.sync();

            String type = cmd.type(key);
            if ("none".equals(type)) throw new AdminException("Key not found: " + key);

            long ttl  = cmd.ttl(key);
            long size = getSize(cmd, key, type);

            RedisKeyDetail.RedisKeyDetailBuilder builder = RedisKeyDetail.builder()
                    .key(key).type(type).ttl(ttl).size(size);

            switch (type) {
                case "string" -> builder.stringValue(cmd.get(key));
                case "hash"   -> builder.hashValue(cmd.hgetall(key));
                case "list"   -> builder.listValue(cmd.lrange(key, 0, 499));  // cap at 500 items
                case "set"    -> builder.listValue(new ArrayList<>(cmd.smembers(key)));
                case "zset"   -> {
                    List<ScoredValue<String>> scored = cmd.zrangeWithScores(key, 0, 499);
                    builder.zsetValue(scored.stream()
                            .map(sv -> RedisKeyDetail.ZsetEntry.builder()
                                    .member(sv.getValue()).score(sv.getScore()).build())
                            .collect(Collectors.toList()));
                }
                default -> builder.stringValue("[type '" + type + "' preview not supported]");
            }

            return builder.build();
        }
    }

    // ── Upsert ────────────────────────────────────────────────────────────────

    public void upsertKey(int db, RedisUpsertRequest req) {
        if (!StringUtils.hasText(req.getKey())) throw new AdminException("key must not be blank");

        try (StatefulRedisConnection<String, String> conn = connect(db)) {
            RedisCommands<String, String> cmd = conn.sync();

            // Delete existing key to allow type changes
            cmd.del(req.getKey());

            switch (req.getType()) {
                case "string" -> {
                    if (req.getStringValue() == null) throw new AdminException("stringValue is required");
                    cmd.set(req.getKey(), req.getStringValue());
                }
                case "hash" -> {
                    if (req.getHashValue() == null || req.getHashValue().isEmpty())
                        throw new AdminException("hashValue must not be empty");
                    cmd.hset(req.getKey(), req.getHashValue());
                }
                case "list" -> {
                    if (req.getListValue() == null || req.getListValue().isEmpty())
                        throw new AdminException("listValue must not be empty");
                    cmd.rpush(req.getKey(), req.getListValue().toArray(new String[0]));
                }
                case "set" -> {
                    if (req.getListValue() == null || req.getListValue().isEmpty())
                        throw new AdminException("listValue (members) must not be empty");
                    cmd.sadd(req.getKey(), req.getListValue().toArray(new String[0]));
                }
                case "zset" -> {
                    if (req.getZsetValue() == null || req.getZsetValue().isEmpty())
                        throw new AdminException("zsetValue must not be empty");
                    req.getZsetValue().forEach(e ->
                            cmd.zadd(req.getKey(), e.getScore(), e.getMember()));
                }
                default -> throw new AdminException("Unsupported type: " + req.getType());
            }

            // Apply TTL
            if (req.getTtl() > 0) {
                cmd.expire(req.getKey(), req.getTtl());
            }

            log.info("[redis-admin] UPSERT db={} key={} type={}", db, req.getKey(), req.getType());
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public long deleteKey(int db, String key) {
        try (StatefulRedisConnection<String, String> conn = connect(db)) {
            long deleted = conn.sync().del(key);
            if (deleted == 0) throw new AdminException("Key not found: " + key);
            log.info("[redis-admin] DELETE db={} key={}", db, key);
            return deleted;
        }
    }

    // ── TTL update ────────────────────────────────────────────────────────────

    public void updateTtl(int db, String key, long ttlSeconds) {
        try (StatefulRedisConnection<String, String> conn = connect(db)) {
            RedisCommands<String, String> cmd = conn.sync();
            if ("none".equals(cmd.type(key))) throw new AdminException("Key not found: " + key);
            if (ttlSeconds < 0) {
                cmd.persist(key);   // remove expiry
            } else {
                cmd.expire(key, ttlSeconds);
            }
            log.info("[redis-admin] TTL db={} key={} ttl={}", db, key, ttlSeconds);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private RedisKeyInfo buildKeyInfo(RedisCommands<String, String> cmd, String key) {
        String type = cmd.type(key);
        long   ttl  = cmd.ttl(key);
        long   size = getSize(cmd, key, type);
        return RedisKeyInfo.builder().key(key).type(type).ttl(ttl).size(size).build();
    }

    private long getSize(RedisCommands<String, String> cmd, String key, String type) {
        try {
            return switch (type) {
                case "string" -> cmd.strlen(key);
                case "hash"   -> cmd.hlen(key);
                case "list"   -> cmd.llen(key);
                case "set"    -> cmd.scard(key);
                case "zset"   -> cmd.zcard(key);
                default       -> 0L;
            };
        } catch (Exception e) {
            return 0L;
        }
    }
}
