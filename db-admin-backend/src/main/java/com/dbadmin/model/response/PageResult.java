package com.dbadmin.model.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResult {
    private long total;
    private int page;
    private int pageSize;
    private int totalPages;
    private List<Map<String, Object>> rows;
}
