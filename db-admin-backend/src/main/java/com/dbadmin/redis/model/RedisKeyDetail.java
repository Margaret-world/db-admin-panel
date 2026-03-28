package com.dbadmin.redis.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Full value of a Redis key, shaped by type:
 *
 *  string → stringValue
 *  hash   → hashValue (Map<field,value>)
 *  list   → listValue (List<String>)
 *  set    → listValue (List<String>, unordered)
 *  zset   → zsetValue (List of {member, score})
 */
@Data
@Builder
public class RedisKeyDetail {
    private String              key;
    private String              type;
    private long                ttl;
    private long                size;

    // type-specific payloads — only one will be non-null
    private String              stringValue;
    private Map<String, String> hashValue;
    private List<String>        listValue;
    private List<ZsetEntry>     zsetValue;

    @Data
    @Builder
    public static class ZsetEntry {
        private String member;
        private double score;
    }
}
