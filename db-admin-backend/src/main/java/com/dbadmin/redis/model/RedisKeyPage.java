package com.dbadmin.redis.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RedisKeyPage {
    /** Cursor to pass into the next SCAN call. "0" means scan is complete. */
    private String          nextCursor;
    private boolean         complete;      // true when nextCursor == "0"
    private int             count;         // keys in this page
    private long            dbSize;        // total keys in the DB
    private List<RedisKeyInfo> keys;
}
