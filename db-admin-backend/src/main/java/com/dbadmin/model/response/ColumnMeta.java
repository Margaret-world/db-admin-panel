package com.dbadmin.model.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ColumnMeta {
    /** Column name */
    private String name;
    /** MariaDB data type, e.g. varchar(100) */
    private String type;
    /** Whether this column is a primary key */
    private boolean primaryKey;
    /** Nullable */
    private boolean nullable;
    /** Default value (may be null) */
    private String defaultValue;
    /** Extra info, e.g. "auto_increment" */
    private String extra;
    /** Key type: PRI, MUL, UNI or empty */
    private String keyType;
    /** Comment from INFORMATION_SCHEMA */
    private String comment;
}
