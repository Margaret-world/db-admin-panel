package com.dbadmin.model.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TableInfo {
    private String tableName;
    private String tableComment;
    private long rowCount;
    private String engine;
    private String createTime;
}
