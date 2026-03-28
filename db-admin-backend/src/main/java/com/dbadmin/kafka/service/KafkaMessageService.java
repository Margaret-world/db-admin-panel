package com.dbadmin.kafka.service;

import com.dbadmin.exception.AdminException;
import com.dbadmin.kafka.config.KafkaClientFactory;
import com.dbadmin.kafka.model.KafkaMessage;
import com.dbadmin.kafka.model.PublishRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.Header;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaMessageService {

    private final KafkaClientFactory factory;

    private static final int    MAX_MESSAGES = 100;
    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.systemDefault());

    // ── Browse ────────────────────────────────────────────────────────────────

    /**
     * Fetch up to {@code limit} messages from a topic partition starting at {@code fromOffset}.
     * If partition == -1, reads from all partitions.
     */
    public List<KafkaMessage> fetchMessages(String clusterId, String topic,
                                             int partition, long fromOffset, int limit) {
        int cap = Math.min(limit, MAX_MESSAGES);

        try (KafkaConsumer<String, String> consumer = factory.consumer(clusterId)) {
            List<TopicPartition> tps;
            if (partition >= 0) {
                tps = List.of(new TopicPartition(topic, partition));
            } else {
                // All partitions
                List<org.apache.kafka.common.PartitionInfo> parts = consumer.partitionsFor(topic);
                if (parts == null || parts.isEmpty()) throw new AdminException("Topic not found: " + topic);
                tps = parts.stream()
                        .map(p -> new TopicPartition(topic, p.partition()))
                        .collect(Collectors.toList());
            }

            consumer.assign(tps);

            // Seek
            if (fromOffset < 0) {
                // fromOffset = -1 → seek to end minus cap (tail)
                Map<TopicPartition, Long> ends = consumer.endOffsets(tps);
                for (TopicPartition tp : tps) {
                    long end  = ends.getOrDefault(tp, 0L);
                    long seek = Math.max(0, end - cap);
                    consumer.seek(tp, seek);
                }
            } else {
                for (TopicPartition tp : tps) {
                    consumer.seek(tp, fromOffset);
                }
            }

            // Poll
            List<KafkaMessage> result = new ArrayList<>();
            long deadline = System.currentTimeMillis() + 5000;
            while (result.size() < cap && System.currentTimeMillis() < deadline) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(500));
                if (records.isEmpty()) break;
                for (ConsumerRecord<String, String> r : records) {
                    result.add(toMessage(r));
                    if (result.size() >= cap) break;
                }
            }

            result.sort(Comparator.comparingLong(KafkaMessage::getOffset));
            return result;
        } catch (AdminException ae) { throw ae; }
        catch (Exception e) { throw new AdminException("Failed to fetch messages: " + e.getMessage()); }
    }

    // ── Publish ───────────────────────────────────────────────────────────────

    public Map<String, Object> publish(String clusterId, PublishRequest req) {
        try (KafkaProducer<String, String> producer = factory.producer(clusterId)) {
            ProducerRecord<String, String> record;
            if (req.getPartition() >= 0) {
                record = new ProducerRecord<>(req.getTopic(), req.getPartition(),
                        req.getKey(), req.getValue());
            } else {
                record = new ProducerRecord<>(req.getTopic(), req.getKey(), req.getValue());
            }

            // Add headers
            if (req.getHeaders() != null) {
                req.getHeaders().forEach((k, v) ->
                        record.headers().add(k, v.getBytes(StandardCharsets.UTF_8)));
            }

            RecordMetadata meta = producer.send(record).get();
            log.info("[kafka-admin] Published to {}-{} offset={}", meta.topic(), meta.partition(), meta.offset());

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("topic",     meta.topic());
            result.put("partition", meta.partition());
            result.put("offset",    meta.offset());
            result.put("timestamp", FMT.format(Instant.ofEpochMilli(meta.timestamp())));
            return result;
        } catch (AdminException ae) { throw ae; }
        catch (Exception e) { throw new AdminException("Failed to publish message: " + e.getMessage()); }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private KafkaMessage toMessage(ConsumerRecord<String, String> r) {
        Map<String, String> headers = new LinkedHashMap<>();
        for (Header h : r.headers()) {
            headers.put(h.key(), h.value() == null ? "" : new String(h.value(), StandardCharsets.UTF_8));
        }
        String value     = r.value();
        int    valueSize = value == null ? 0 : value.getBytes(StandardCharsets.UTF_8).length;

        return KafkaMessage.builder()
                .partition(r.partition())
                .offset(r.offset())
                .timestamp(r.timestamp())
                .timestampFormatted(FMT.format(Instant.ofEpochMilli(r.timestamp())))
                .key(r.key())
                .value(value)
                .headers(headers)
                .valueSize(valueSize)
                .build();
    }
}
