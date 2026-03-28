package com.dbadmin.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@Component
@ConfigurationProperties(prefix = "db-admin")
public class DbAdminProperties {

    /** Hard cap on rows per page */
    private int maxPageSize = 200;

    /** Tables that must never be exposed via the admin panel */
    private List<String> blockedTables = List.of(
            "flyway_schema_history",
            "DATABASECHANGELOG",
            "DATABASECHANGELOGLOCK"
    );

    /**
     * Schemas exposed in the UI dropdown.
     * If empty, falls back to DATABASE() — the schema in the JDBC URL.
     */
    private List<String> allowedSchemas = new ArrayList<>();

    /**
     * Named Kafka clusters.
     * Key = cluster ID (used in API paths), value = cluster config.
     */
    private Map<String, KafkaClusterConfig> kafkaClusters = new LinkedHashMap<>();

    public boolean isTableBlocked(String tableName) {
        return blockedTables.stream()
                .anyMatch(t -> t.equalsIgnoreCase(tableName));
    }

    public boolean isSchemaAllowed(String schemaName) {
        if (allowedSchemas == null || allowedSchemas.isEmpty()) return true;
        return allowedSchemas.stream()
                .anyMatch(s -> s.equalsIgnoreCase(schemaName));
    }

    public KafkaClusterConfig getCluster(String clusterId) {
        KafkaClusterConfig cfg = kafkaClusters.get(clusterId);
        if (cfg == null) throw new IllegalArgumentException("Unknown Kafka cluster: " + clusterId);
        return cfg;
    }

    @Data
    public static class KafkaClusterConfig {
        private String bootstrapServers  = "localhost:9092";
        private String label             = "";
        private String securityProtocol  = "PLAINTEXT";
        private String saslMechanism     = "";
        private String saslUsername      = "";
        private String saslPassword      = "";
    }
}
