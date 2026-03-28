package com.dbadmin.controller;

import com.dbadmin.model.request.RowRequest;
import com.dbadmin.model.response.ApiResponse;
import com.dbadmin.model.response.ColumnMeta;
import com.dbadmin.model.response.PageResult;
import com.dbadmin.model.response.TableInfo;
import com.dbadmin.service.DbAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * DB Admin Panel REST API — multi-schema edition
 *
 * Base path: /api/admin/db
 *
 *   GET    /schemas                                    → list allowed schemas
 *   GET    /schemas/{schema}/tables                    → list tables in schema
 *   GET    /schemas/{schema}/tables/{table}/schema     → column definitions
 *   GET    /schemas/{schema}/tables/{table}/rows       → paginated rows + search
 *   POST   /schemas/{schema}/tables/{table}/rows       → insert row
 *   PUT    /schemas/{schema}/tables/{table}/rows/{pk}  → update row
 *   DELETE /schemas/{schema}/tables/{table}/rows/{pk}  → delete row
 */
@RestController
@RequestMapping("/api/admin/db")
@RequiredArgsConstructor
public class DbAdminController {

    private final DbAdminService service;

    // ── Schemas ───────────────────────────────────────────────────────────────

    @GetMapping("/schemas")
    public ApiResponse<List<String>> listSchemas() {
        return ApiResponse.ok(service.listSchemas());
    }

    // ── Tables ────────────────────────────────────────────────────────────────

    @GetMapping("/schemas/{schema}/tables")
    public ApiResponse<List<TableInfo>> listTables(
            @PathVariable("schema") String schema) {
        return ApiResponse.ok(service.listTables(schema));
    }

    // ── Structure ─────────────────────────────────────────────────────────────

    @GetMapping("/schemas/{schema}/tables/{table}/schema")
    public ApiResponse<List<ColumnMeta>> getSchema(
            @PathVariable("schema") String schema,
            @PathVariable("table")  String table) {
        return ApiResponse.ok(service.listColumns(schema, table));
    }

    // ── Rows ──────────────────────────────────────────────────────────────────

    @GetMapping("/schemas/{schema}/tables/{table}/rows")
    public ApiResponse<PageResult> listRows(
            @PathVariable("schema")                String schema,
            @PathVariable("table")                 String table,
            @RequestParam(defaultValue = "1")      int    page,
            @RequestParam(defaultValue = "20")     int    pageSize,
            @RequestParam(defaultValue = "")       String search) {
        return ApiResponse.ok(service.listRows(schema, table, page, pageSize, search));
    }

    @PostMapping("/schemas/{schema}/tables/{table}/rows")
    public ApiResponse<Void> insertRow(
            @PathVariable("schema") String schema,
            @PathVariable("table")  String table,
            @Valid @RequestBody RowRequest request) {
        service.insertRow(schema, table, request.getData());
        return ApiResponse.ok("Row inserted successfully", null);
    }

    @PutMapping("/schemas/{schema}/tables/{table}/rows/{pk}")
    public ApiResponse<Void> updateRow(
            @PathVariable("schema") String schema,
            @PathVariable("table")  String table,
            @PathVariable("pk")     String pk,
            @Valid @RequestBody RowRequest request) {
        service.updateRow(schema, table, pk, request.getData());
        return ApiResponse.ok("Row updated successfully", null);
    }

    @DeleteMapping("/schemas/{schema}/tables/{table}/rows/{pk}")
    public ApiResponse<Void> deleteRow(
            @PathVariable("schema") String schema,
            @PathVariable("table")  String table,
            @PathVariable("pk")     String pk) {
        service.deleteRow(schema, table, pk);
        return ApiResponse.ok("Row deleted successfully", null);
    }
}
