package com.dbadmin.service;

import com.dbadmin.config.DbAdminProperties;
import com.dbadmin.exception.AdminException;
import com.dbadmin.mapper.DbAdminMapper;
import com.dbadmin.model.response.ColumnMeta;
import com.dbadmin.model.response.PageResult;
import com.dbadmin.model.response.TableInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class DbAdminService {

    private final DbAdminMapper    mapper;
    private final DbAdminProperties props;

    // ── Schemas ───────────────────────────────────────────────────────────────

    /**
     * Returns the list of schemas the UI is allowed to see.
     * Cross-checks server-side schemas against the allowlist in config.
     */
    public List<String> listSchemas() {
        return mapper.listSchemas().stream()
                .map(r -> (String) r.get("schemaName"))
                .filter(props::isSchemaAllowed)
                .collect(Collectors.toList());
    }

    // ── Tables ────────────────────────────────────────────────────────────────

    public List<TableInfo> listTables(String schemaName) {
        validateSchema(schemaName);
        return mapper.listTables(schemaName).stream()
                .filter(row -> !props.isTableBlocked((String) row.get("tableName")))
                .map(row -> TableInfo.builder()
                        .tableName((String) row.get("tableName"))
                        .tableComment(nullToEmpty(row.get("tableComment")))
                        .rowCount(toLong(row.get("rowCount")))
                        .engine(nullToEmpty(row.get("engine")))
                        .createTime(nullToEmpty(row.get("createTime")))
                        .build())
                .collect(Collectors.toList());
    }

    // ── Schema (columns) ──────────────────────────────────────────────────────

    public List<ColumnMeta> listColumns(String schemaName, String tableName) {
        validateSchema(schemaName);
        validateTable(schemaName, tableName);
        return mapper.listColumns(schemaName, tableName).stream()
                .map(row -> ColumnMeta.builder()
                        .name((String) row.get("name"))
                        .type((String) row.get("type"))
                        .primaryKey("PRI".equals(row.get("keyType")))
                        .nullable("YES".equals(row.get("nullable")))
                        .defaultValue(nullToEmpty(row.get("defaultValue")))
                        .extra(nullToEmpty(row.get("extra")))
                        .keyType(nullToEmpty(row.get("keyType")))
                        .comment(nullToEmpty(row.get("comment")))
                        .build())
                .collect(Collectors.toList());
    }

    // ── Rows — read ───────────────────────────────────────────────────────────

    public PageResult listRows(String schemaName, String tableName,
                               int page, int pageSize, String search) {
        validateSchema(schemaName);
        validateTable(schemaName, tableName);

        pageSize = Math.min(pageSize, props.getMaxPageSize());
        if (pageSize < 1) pageSize = 20;
        if (page < 1) page = 1;
        long offset = (long) (page - 1) * pageSize;

        long total;
        List<Map<String, Object>> rows;

        if (StringUtils.hasText(search)) {
            String whereClause = buildSearchWhereClause(schemaName, tableName, search.trim());
            total = mapper.countRowsWithSearch(schemaName, tableName, whereClause);
            rows  = mapper.selectRowsWithSearch(schemaName, tableName, whereClause, pageSize, offset);
        } else {
            total = mapper.countRows(schemaName, tableName);
            rows  = mapper.selectRows(schemaName, tableName, pageSize, offset);
        }

        int totalPages = (int) Math.ceil((double) total / pageSize);
        return PageResult.builder()
                .total(total)
                .page(page)
                .pageSize(pageSize)
                .totalPages(totalPages)
                .rows(rows)
                .build();
    }

    // ── Rows — write ──────────────────────────────────────────────────────────

    @Transactional
    public void insertRow(String schemaName, String tableName, Map<String, Object> data) {
        validateSchema(schemaName);
        validateTable(schemaName, tableName);
        if (data == null || data.isEmpty()) throw new AdminException("Row data must not be empty");

        Set<String> validCols = getValidColumnNames(schemaName, tableName);
        Map<String, Object> safe = filterToValidColumns(data, validCols);
        if (safe.isEmpty()) throw new AdminException("No valid columns provided");

        List<String> cols  = new ArrayList<>(safe.keySet());
        List<Object> vals  = cols.stream().map(safe::get).toList();
        String columnsSql  = cols.stream().map(c -> "`" + c + "`").collect(Collectors.joining(", "));
        String valuesSql   = IntStream.range(0, cols.size())
                .mapToObj(i -> "#{values.v" + i + "}").collect(Collectors.joining(", "));

        Map<String, Object> valueMap = new LinkedHashMap<>();
        IntStream.range(0, vals.size()).forEach(i -> valueMap.put("v" + i, vals.get(i)));

        int affected = mapper.insertRow(schemaName, tableName, columnsSql, valuesSql, valueMap);
        if (affected == 0) throw new AdminException("Insert failed — no rows affected");
        log.info("[db-admin] INSERT into {}.{} ({} columns)", schemaName, tableName, cols.size());
    }

    @Transactional
    public void updateRow(String schemaName, String tableName,
                          Object pkValue, Map<String, Object> data) {
        validateSchema(schemaName);
        validateTable(schemaName, tableName);
        if (data == null || data.isEmpty()) throw new AdminException("Row data must not be empty");

        String pkCol = getPrimaryKeyColumn(schemaName, tableName);
        Set<String> validCols = getValidColumnNames(schemaName, tableName);
        Map<String, Object> safe = filterToValidColumns(data, validCols);
        safe.remove(pkCol);
        if (safe.isEmpty()) throw new AdminException("No updatable columns provided");

        String setSql = safe.keySet().stream()
                .map(c -> "`" + c + "`=#{values." + c + "}")
                .collect(Collectors.joining(", "));

        int affected = mapper.updateRow(schemaName, tableName, setSql, pkCol, pkValue, safe);
        if (affected == 0) throw new AdminException("Update failed — row not found or no change");
        log.info("[db-admin] UPDATE {}.{} pk={}", schemaName, tableName, pkValue);
    }

    @Transactional
    public void deleteRow(String schemaName, String tableName, Object pkValue) {
        validateSchema(schemaName);
        validateTable(schemaName, tableName);
        String pkCol   = getPrimaryKeyColumn(schemaName, tableName);
        int affected   = mapper.deleteRow(schemaName, tableName, pkCol, pkValue);
        if (affected == 0) throw new AdminException("Delete failed — row not found");
        log.info("[db-admin] DELETE from {}.{} pk={}", schemaName, tableName, pkValue);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void validateSchema(String schemaName) {
        if (!StringUtils.hasText(schemaName))
            throw new AdminException("Schema name must not be blank");
        if (!props.isSchemaAllowed(schemaName))
            throw new AdminException("Access to schema '" + schemaName + "' is not permitted");
    }

    private void validateTable(String schemaName, String tableName) {
        if (!StringUtils.hasText(tableName))
            throw new AdminException("Table name must not be blank");
        if (props.isTableBlocked(tableName))
            throw new AdminException("Access to table '" + tableName + "' is not permitted");
        if (mapper.tableExists(schemaName, tableName) == 0)
            throw new AdminException("Table '" + schemaName + "." + tableName + "' does not exist");
    }

    private Set<String> getValidColumnNames(String schemaName, String tableName) {
        return mapper.listColumns(schemaName, tableName).stream()
                .map(c -> (String) c.get("name")).collect(Collectors.toSet());
    }

    private String getPrimaryKeyColumn(String schemaName, String tableName) {
        return mapper.listColumns(schemaName, tableName).stream()
                .filter(c -> "PRI".equals(c.get("keyType")))
                .map(c -> (String) c.get("name"))
                .findFirst()
                .orElseThrow(() -> new AdminException(
                        "No primary key found on table '" + schemaName + "." + tableName + "'"));
    }

    private String buildSearchWhereClause(String schemaName, String tableName, String search) {
        String escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        String likeVal = "%" + escaped.replace("'", "\\'") + "%";

        List<String> conditions = mapper.listColumns(schemaName, tableName).stream()
                .filter(c -> isTextCompatible((String) c.get("type")))
                .map(c -> "`" + c.get("name") + "` LIKE '" + likeVal + "'")
                .collect(Collectors.toList());

        return conditions.isEmpty() ? "1=0" : String.join(" OR ", conditions);
    }

    private boolean isTextCompatible(String colType) {
        if (colType == null) return false;
        String t = colType.toLowerCase();
        return t.startsWith("varchar") || t.startsWith("char")
                || t.startsWith("text")  || t.startsWith("tinytext")
                || t.startsWith("mediumtext") || t.startsWith("longtext")
                || t.startsWith("enum")  || t.startsWith("set")
                || t.startsWith("int")   || t.startsWith("bigint")
                || t.startsWith("decimal") || t.startsWith("float")
                || t.startsWith("double") || t.startsWith("date")
                || t.startsWith("datetime") || t.startsWith("timestamp");
    }

    private Map<String, Object> filterToValidColumns(Map<String, Object> data, Set<String> validCols) {
        Map<String, Object> result = new LinkedHashMap<>();
        data.forEach((k, v) -> { if (validCols.contains(k)) result.put(k, v); });
        return result;
    }

    private String nullToEmpty(Object val) { return val == null ? "" : val.toString(); }

    private long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Number n) return n.longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return 0L; }
    }
}
