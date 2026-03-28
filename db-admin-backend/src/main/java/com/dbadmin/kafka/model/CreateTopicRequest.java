package com.dbadmin.kafka.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTopicRequest {
    @NotBlank(message = "name must not be blank")
    private String name;

    @Min(value = 1, message = "partitions must be >= 1")
    private int partitions = 1;

    @Min(value = 1, message = "replicationFactor must be >= 1")
    private short replicationFactor = 1;
}
