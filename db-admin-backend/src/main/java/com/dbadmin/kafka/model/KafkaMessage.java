package com.dbadmin.kafka.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class KafkaMessage {
    private int               partition;
    private long              offset;
    private long              timestamp;
    private String            timestampFormatted;
    private String            key;
    private String            value;
    private Map<String, String> headers;
    private int               valueSize;  // bytes
}
