package com.dbadmin.kafka.config;

import com.dbadmin.config.DbAdminProperties;
import com.dbadmin.config.DbAdminProperties.KafkaClusterConfig;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.config.SaslConfigs;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Properties;
import java.util.UUID;

/**
 * Builds short-lived Kafka clients for a named cluster.
 * All clients are created on-demand and closed by the caller (try-with-resources).
 */
@Component
@RequiredArgsConstructor
public class KafkaClientFactory {

    private final DbAdminProperties props;

    // ── AdminClient ───────────────────────────────────────────────────────────

    public AdminClient adminClient(String clusterId) {
        KafkaClusterConfig cfg = props.getCluster(clusterId);
        Properties p = baseProps(cfg);
        p.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, "10000");
        p.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, "15000");
        return AdminClient.create(p);
    }

    // ── KafkaConsumer ─────────────────────────────────────────────────────────

    public KafkaConsumer<String, String> consumer(String clusterId) {
        KafkaClusterConfig cfg = props.getCluster(clusterId);
        Properties p = baseProps(cfg);
        p.put(ConsumerConfig.GROUP_ID_CONFIG, "db-admin-panel-" + UUID.randomUUID());
        p.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,   StringDeserializer.class.getName());
        p.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        p.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG,        "earliest");
        p.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,       "false");
        p.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG,         "100");
        p.put(ConsumerConfig.REQUEST_TIMEOUT_MS_CONFIG,       "10000");
        p.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG,       "10000");
        return new KafkaConsumer<>(p);
    }

    // ── KafkaProducer ─────────────────────────────────────────────────────────

    public KafkaProducer<String, String> producer(String clusterId) {
        KafkaClusterConfig cfg = props.getCluster(clusterId);
        Properties p = baseProps(cfg);
        p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,   StringSerializer.class.getName());
        p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        p.put(ProducerConfig.ACKS_CONFIG,                   "all");
        p.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG,     "10000");
        p.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG,    "15000");
        return new KafkaProducer<>(p);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Properties baseProps(KafkaClusterConfig cfg) {
        Properties p = new Properties();
        p.put(CommonClientConfigs.BOOTSTRAP_SERVERS_CONFIG, cfg.getBootstrapServers());
        p.put(CommonClientConfigs.SECURITY_PROTOCOL_CONFIG,
                StringUtils.hasText(cfg.getSecurityProtocol()) ? cfg.getSecurityProtocol() : "PLAINTEXT");

        if (StringUtils.hasText(cfg.getSaslMechanism())) {
            p.put(SaslConfigs.SASL_MECHANISM, cfg.getSaslMechanism());
            p.put(SaslConfigs.SASL_JAAS_CONFIG,
                    "org.apache.kafka.common.security.plain.PlainLoginModule required " +
                    "username=\"" + cfg.getSaslUsername() + "\" " +
                    "password=\"" + cfg.getSaslPassword() + "\";");
        }
        return p;
    }
}
