package com.dbadmin.model.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class RowRequest {
    /**
     * Key-value pairs representing column → value.
     * All values are passed as strings; the service layer
     * will coerce them based on the actual column type.
     */
    @NotNull(message = "data must not be null")
    private Map<String, Object> data;
}
