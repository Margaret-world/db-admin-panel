package com.dbadmin.redis.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class RedisUpsertRequest {

    @NotBlank(message = "key must not be blank")
    private String key;

    @NotBlank(message = "type must not be blank")
    private String type;  // string | hash | list | set | zset

    /** TTL in seconds. -1 = no expiry. */
    private long ttl = -1;

    // type-specific payloads
    private String              stringValue;
    private Map<String, String> hashValue;
    private List<String>        listValue;
    private List<ZsetEntryRequest> zsetValue;

    @Data
    public static class ZsetEntryRequest {
        @NotNull private String member;
        @NotNull private Double score;
    }
}
