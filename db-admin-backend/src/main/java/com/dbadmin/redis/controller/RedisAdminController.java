package com.dbadmin.redis.controller;

import com.dbadmin.model.response.ApiResponse;
import com.dbadmin.redis.model.*;
import com.dbadmin.redis.service.RedisAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Redis Admin Panel REST API
 *
 * Base path: /api/admin/redis
 *
 *   GET    /info                          → key count per DB (db0-db15)
 *   GET    /db/{db}/keys                  → SCAN keys (paginated, with pattern)
 *   GET    /db/{db}/keys/{key}            → full key detail + value
 *   POST   /db/{db}/keys                  → create or overwrite a key
 *   PUT    /db/{db}/keys/{key}/ttl        → update TTL only
 *   DELETE /db/{db}/keys/{key}            → delete a key
 */
@RestController
@RequestMapping("/api/admin/redis")
@RequiredArgsConstructor
public class RedisAdminController {

    private final RedisAdminService service;

    // ── DB info ───────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/redis/info
     * Returns { 0: 42, 1: 0, 2: 7, … } for all 16 DB slots.
     */
    @GetMapping("/info")
    public ApiResponse<Map<Integer, Long>> getDbInfo() {
        return ApiResponse.ok(service.getDbSizes());
    }

    // ── Key scan ──────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/redis/db/{db}/keys
     *     ?pattern=*&cursor=0&count=100
     */
    @GetMapping("/db/{db}/keys")
    public ApiResponse<RedisKeyPage> scanKeys(
            @PathVariable int    db,
            @RequestParam(defaultValue = "*")  String pattern,
            @RequestParam(defaultValue = "0")  String cursor,
            @RequestParam(defaultValue = "100") int   count) {
        return ApiResponse.ok(service.scanKeys(db, pattern, cursor, count));
    }

    // ── Key detail ────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/redis/db/{db}/keys/{key}
     */
    @GetMapping("/db/{db}/keys/{key}")
    public ApiResponse<RedisKeyDetail> getKey(
            @PathVariable int    db,
            @PathVariable String key) {
        return ApiResponse.ok(service.getKeyDetail(db, key));
    }

    // ── Upsert ────────────────────────────────────────────────────────────────

    /**
     * POST /api/admin/redis/db/{db}/keys
     * Body: RedisUpsertRequest
     */
    @PostMapping("/db/{db}/keys")
    public ApiResponse<Void> upsertKey(
            @PathVariable int db,
            @Valid @RequestBody RedisUpsertRequest request) {
        service.upsertKey(db, request);
        return ApiResponse.ok("Key saved successfully", null);
    }

    // ── TTL ───────────────────────────────────────────────────────────────────

    /**
     * PUT /api/admin/redis/db/{db}/keys/{key}/ttl
     * Body: { "ttl": 3600 }   (-1 = no expiry)
     */
    @PutMapping("/db/{db}/keys/{key}/ttl")
    public ApiResponse<Void> updateTtl(
            @PathVariable int    db,
            @PathVariable String key,
            @RequestBody  Map<String, Long> body) {
        long ttl = body.getOrDefault("ttl", -1L);
        service.updateTtl(db, key, ttl);
        return ApiResponse.ok("TTL updated", null);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    /**
     * DELETE /api/admin/redis/db/{db}/keys/{key}
     */
    @DeleteMapping("/db/{db}/keys/{key}")
    public ApiResponse<Void> deleteKey(
            @PathVariable int    db,
            @PathVariable String key) {
        service.deleteKey(db, key);
        return ApiResponse.ok("Key deleted", null);
    }
}
