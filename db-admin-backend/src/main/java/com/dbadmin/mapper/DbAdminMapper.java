package com.dbadmin.mapper;

import org.apache.ibatis.annotations.*;

import java.util.List;
import java.util.Map;

/**
 * Dynamic DB admin mapper — multi-schema edition.
 *
 * schemaName is validated against the allowed-schemas allowlist in the
 * service layer BEFORE reaching this mapper.
 */
@Mapper
public interface DbAdminMapper {

    // ── Schema discovery ──────────────────────────────────────────────────────

    /** List all available schemas (databases) on the server. */
    @Select("""
            SELECT SCHEMA_NAME AS schemaName
            FROM information_schema.SCHEMATA
            WHERE SCHEMA_NAME NOT IN (
                'information_schema','performance_schema','mysql','sys'
            )
            ORDER BY SCHEMA_NAME
            """)
    List<Map<String, Object>> listSchemas();

    /** List all base tables in the given schema. */
    @Select("""
            SELECT
                t.TABLE_NAME        AS tableName,
                t.TABLE_COMMENT     AS tableComment,
                t.TABLE_ROWS        AS rowCount,
                t.ENGINE            AS engine,
                DATE_FORMAT(t.CREATE_TIME, '%Y-%m-%d %H:%i:%s') AS createTime
            FROM information_schema.TABLES t
            WHERE t.TABLE_SCHEMA = #{schemaName}
              AND t.TABLE_TYPE   = 'BASE TABLE'
            ORDER BY t.TABLE_NAME
            """)
    List<Map<String, Object>> listTables(@Param("schemaName") String schemaName);

    /** Return column metadata for a specific table in a specific schema. */
    @Select("""
            SELECT
                c.COLUMN_NAME       AS name,
                c.COLUMN_TYPE       AS type,
                c.IS_NULLABLE       AS nullable,
                c.COLUMN_DEFAULT    AS defaultValue,
                c.EXTRA             AS extra,
                c.COLUMN_KEY        AS keyType,
                c.COLUMN_COMMENT    AS comment
            FROM information_schema.COLUMNS c
            WHERE c.TABLE_SCHEMA = #{schemaName}
              AND c.TABLE_NAME   = #{tableName}
            ORDER BY c.ORDINAL_POSITION
            """)
    List<Map<String, Object>> listColumns(@Param("schemaName") String schemaName,
                                          @Param("tableName")  String tableName);

    /** Confirm a table exists in the given schema. */
    @Select("""
            SELECT COUNT(*) FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = #{schemaName}
              AND TABLE_TYPE   = 'BASE TABLE'
              AND TABLE_NAME   = #{tableName}
            """)
    int tableExists(@Param("schemaName") String schemaName,
                    @Param("tableName")  String tableName);

    /** Exact row count — no search. */
    @Select("SELECT COUNT(*) FROM `${schemaName}`.`${tableName}`")
    long countRows(@Param("schemaName") String schemaName,
                   @Param("tableName")  String tableName);

    /** Exact row count with dynamic WHERE. */
    @Select("SELECT COUNT(*) FROM `${schemaName}`.`${tableName}` WHERE ${whereClause}")
    long countRowsWithSearch(@Param("schemaName")  String schemaName,
                             @Param("tableName")   String tableName,
                             @Param("whereClause") String whereClause);

    // ── Data read ─────────────────────────────────────────────────────────────

    @Select("SELECT * FROM `${schemaName}`.`${tableName}` LIMIT #{limit} OFFSET #{offset}")
    List<Map<String, Object>> selectRows(@Param("schemaName") String schemaName,
                                          @Param("tableName")  String tableName,
                                          @Param("limit")      int limit,
                                          @Param("offset")     long offset);

    @Select("SELECT * FROM `${schemaName}`.`${tableName}` WHERE ${whereClause} LIMIT #{limit} OFFSET #{offset}")
    List<Map<String, Object>> selectRowsWithSearch(@Param("schemaName")  String schemaName,
                                                    @Param("tableName")   String tableName,
                                                    @Param("whereClause") String whereClause,
                                                    @Param("limit")       int limit,
                                                    @Param("offset")      long offset);

    // ── Data write ────────────────────────────────────────────────────────────

    @Insert("INSERT INTO `${schemaName}`.`${tableName}` (${columnsSql}) VALUES (${valuesSql})")
    @Options(useGeneratedKeys = true, keyColumn = "id")
    int insertRow(@Param("schemaName")  String schemaName,
                  @Param("tableName")   String tableName,
                  @Param("columnsSql")  String columnsSql,
                  @Param("valuesSql")   String valuesSql,
                  @Param("values")      Map<String, Object> values);

    @Update("UPDATE `${schemaName}`.`${tableName}` SET ${setSql} WHERE `${pkCol}` = #{pkValue}")
    int updateRow(@Param("schemaName") String schemaName,
                  @Param("tableName")  String tableName,
                  @Param("setSql")     String setSql,
                  @Param("pkCol")      String pkCol,
                  @Param("pkValue")    Object pkValue,
                  @Param("values")     Map<String, Object> values);

    @Delete("DELETE FROM `${schemaName}`.`${tableName}` WHERE `${pkCol}` = #{pkValue}")
    int deleteRow(@Param("schemaName") String schemaName,
                  @Param("tableName")  String tableName,
                  @Param("pkCol")      String pkCol,
                  @Param("pkValue")    Object pkValue);
}
