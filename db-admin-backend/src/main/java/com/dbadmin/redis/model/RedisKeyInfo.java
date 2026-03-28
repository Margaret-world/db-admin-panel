package com.dbadmin.redis.model;

import lombok.Builder;
import lombok.Data;

/**
 * Metadata for a single Redis key shown in the sidebar list.
 */
@Data
@Builder
public class RedisKeyInfo {
    private String  key;
    private String  type;    // string | hash | list | set | zset | stream
    private long    ttl;     // -1 = no expiry, -2 = key missing
    private long    size;    // length/card/llen depending on type
}
