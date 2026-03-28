package com.dbadmin.kafka.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class PublishRequest {
    @NotBlank(message = "topic must not be blank")
    private String topic;

    private String key;

    @NotBlank(message = "value must not be blank")
    private String value;

    /** Optional target partition. -1 = let Kafka decide. */
    private int partition = -1;

    /** Optional message headers */
    private Map<String, String> headers;
}
