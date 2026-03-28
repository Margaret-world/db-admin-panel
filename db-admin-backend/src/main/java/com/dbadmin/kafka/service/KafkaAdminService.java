package com.dbadmin.kafka.service;

import com.dbadmin.config.DbAdminProperties;
import com.dbadmin.exception.AdminException;
import com.dbadmin.kafka.config.KafkaClientFactory;
import com.dbadmin.kafka.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.TopicPartitionInfo;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaAdminService {

    private final KafkaClientFactory      factory;
    private final DbAdminProperties       props;

    private static final int TIMEOUT_SEC = 10;
    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.systemDefault());

    // ── Clusters ──────────────────────────────────────────────────────────────

    public List<ClusterInfo> listClusters() {
        return props.getKafkaClusters().entrySet().stream()
                .map(e -> probeCluster(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    private ClusterInfo probeCluster(String id, DbAdminProperties.KafkaClusterConfig cfg) {
        try (AdminClient admin = factory.adminClient(id)) {
            DescribeClusterResult dcr = admin.describeCluster();
            int brokers   = dcr.nodes().get(TIMEOUT_SEC, TimeUnit.SECONDS).size();
            int topics    = admin.listTopics().names().get(TIMEOUT_SEC, TimeUnit.SECONDS).size();
            String ctrlId = String.valueOf(dcr.controller().get(TIMEOUT_SEC, TimeUnit.SECONDS).id());
            return ClusterInfo.builder()
                    .clusterId(id).label(cfg.getLabel())
                    .bootstrapServers(cfg.getBootstrapServers())
                    .connected(true).brokerCount(brokers)
                    .topicCount(topics).controllerId(ctrlId)
                    .build();
        } catch (Exception e) {
            log.warn("[kafka-admin] Cannot reach cluster '{}': {}", id, e.getMessage());
            return ClusterInfo.builder()
                    .clusterId(id).label(cfg.getLabel())
                    .bootstrapServers(cfg.getBootstrapServers())
                    .connected(false).brokerCount(0).topicCount(0).controllerId("—")
                    .build();
        }
    }

    // ── Topics ────────────────────────────────────────────────────────────────

    public List<TopicInfo> listTopics(String clusterId, boolean includeInternal) {
        try (AdminClient admin = factory.adminClient(clusterId)) {
            ListTopicsOptions opts = new ListTopicsOptions().listInternal(includeInternal);
            Set<String> names = admin.listTopics(opts).names().get(TIMEOUT_SEC, TimeUnit.SECONDS);

            Map<String, TopicDescription> descs =
                    admin.describeTopics(names).allTopicNames().get(TIMEOUT_SEC, TimeUnit.SECONDS);

            // Get offsets for all partitions in one batch
            List<TopicPartition> allTps = descs.values().stream()
                    .flatMap(td -> td.partitions().stream()
                            .map(p -> new TopicPartition(td.name(), p.partition())))
                    .collect(Collectors.toList());

            Map<TopicPartition, Long> earliest = getOffsets(clusterId, allTps, true);
            Map<TopicPartition, Long> latest   = getOffsets(clusterId, allTps, false);

            return descs.values().stream()
                    .map(td -> buildTopicInfo(td, earliest, latest))
                    .sorted(Comparator.comparing(TopicInfo::getName))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new AdminException("Failed to list topics: " + e.getMessage());
        }
    }

    public TopicInfo getTopic(String clusterId, String topic) {
        try (AdminClient admin = factory.adminClient(clusterId)) {
            Map<String, TopicDescription> descs =
                    admin.describeTopics(List.of(topic)).allTopicNames()
                            .get(TIMEOUT_SEC, TimeUnit.SECONDS);
            TopicDescription td = descs.get(topic);
            if (td == null) throw new AdminException("Topic not found: " + topic);

            List<TopicPartition> tps = td.partitions().stream()
                    .map(p -> new TopicPartition(topic, p.partition()))
                    .collect(Collectors.toList());

            return buildTopicInfo(td,
                    getOffsets(clusterId, tps, true),
                    getOffsets(clusterId, tps, false));
        } catch (AdminException ae) { throw ae; }
        catch (Exception e) { throw new AdminException("Failed to describe topic: " + e.getMessage()); }
    }

    public void createTopic(String clusterId, CreateTopicRequest req) {
        try (AdminClient admin = factory.adminClient(clusterId)) {
            NewTopic nt = new NewTopic(req.getName(), req.getPartitions(), req.getReplicationFactor());
            admin.createTopics(List.of(nt)).all().get(TIMEOUT_SEC, TimeUnit.SECONDS);
            log.info("[kafka-admin] Created topic '{}' on cluster '{}'", req.getName(), clusterId);
        } catch (Exception e) {
            throw new AdminException("Failed to create topic: " + e.getMessage());
        }
    }

    public void deleteTopic(String clusterId, String topic) {
        try (AdminClient admin = factory.adminClient(clusterId)) {
            admin.deleteTopics(List.of(topic)).all().get(TIMEOUT_SEC, TimeUnit.SECONDS);
            log.info("[kafka-admin] Deleted topic '{}' from cluster '{}'", topic, clusterId);
        } catch (Exception e) {
            throw new AdminException("Failed to delete topic: " + e.getMessage());
        }
    }

    // ── Consumer groups ───────────────────────────────────────────────────────

    public List<ConsumerGroupInfo> listConsumerGroups(String clusterId) {
        try (AdminClient admin = factory.adminClient(clusterId)) {
            List<String> groupIds = admin.listConsumerGroups().all()
                    .get(TIMEOUT_SEC, TimeUnit.SECONDS).stream()
                    .map(ConsumerGroupListing::groupId)
                    .collect(Collectors.toList());

            if (groupIds.isEmpty()) return List.of();

            Map<String, ConsumerGroupDescription> descs =
                    admin.describeConsumerGroups(groupIds).all()
                            .get(TIMEOUT_SEC, TimeUnit.SECONDS);

            return descs.values().stream()
                    .map(d -> buildGroupInfo(admin, d))
                    .sorted(Comparator.comparing(ConsumerGroupInfo::getGroupId))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new AdminException("Failed to list consumer groups: " + e.getMessage());
        }
    }

    public ConsumerGroupInfo getConsumerGroup(String clusterId, String groupId) {
        try (AdminClient admin = factory.adminClient(clusterId)) {
            ConsumerGroupDescription desc = admin.describeConsumerGroups(List.of(groupId))
                    .all().get(TIMEOUT_SEC, TimeUnit.SECONDS).get(groupId);
            if (desc == null) throw new AdminException("Consumer group not found: " + groupId);
            return buildGroupInfo(admin, desc);
        } catch (AdminException ae) { throw ae; }
        catch (Exception e) { throw new AdminException("Failed to describe consumer group: " + e.getMessage()); }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private TopicInfo buildTopicInfo(TopicDescription td,
                                     Map<TopicPartition, Long> earliest,
                                     Map<TopicPartition, Long> latest) {
        List<TopicInfo.PartitionInfo> parts = td.partitions().stream().map(p -> {
            TopicPartition tp = new TopicPartition(td.name(), p.partition());
            long eo = earliest.getOrDefault(tp, 0L);
            long lo = latest.getOrDefault(tp, 0L);
            return TopicInfo.PartitionInfo.builder()
                    .partition(p.partition())
                    .leader(p.leader() != null ? p.leader().id() : -1)
                    .earliestOffset(eo).latestOffset(lo)
                    .messageCount(Math.max(0, lo - eo))
                    .replicas(p.replicas().stream().map(n -> n.id()).collect(Collectors.toList()))
                    .isr(p.isr().stream().map(n -> n.id()).collect(Collectors.toList()))
                    .build();
        }).collect(Collectors.toList());

        int rf = td.partitions().isEmpty() ? 0 : td.partitions().get(0).replicas().size();
        return TopicInfo.builder()
                .name(td.name()).partitionCount(td.partitions().size())
                .replicationFactor(rf).internal(td.isInternal())
                .partitions(parts).build();
    }

    private ConsumerGroupInfo buildGroupInfo(AdminClient admin, ConsumerGroupDescription desc) {
        List<ConsumerGroupInfo.MemberInfo> members = desc.members().stream()
                .map(m -> ConsumerGroupInfo.MemberInfo.builder()
                        .memberId(m.consumerId()).clientId(m.clientId()).host(m.host())
                        .build())
                .collect(Collectors.toList());

        // Fetch committed offsets + log-end offsets for lag calculation
        List<ConsumerGroupInfo.PartitionLag> lags = new ArrayList<>();
        long totalLag = 0;
        try {
            Map<TopicPartition, OffsetAndMetadata> committed =
                    admin.listConsumerGroupOffsets(desc.groupId())
                            .partitionsToOffsetAndMetadata()
                            .get(TIMEOUT_SEC, TimeUnit.SECONDS);

            if (!committed.isEmpty()) {
                // Get log-end offsets for all committed partitions
                Map<TopicPartition, OffsetSpec> req = new HashMap<>();
                committed.keySet().forEach(tp -> req.put(tp, OffsetSpec.latest()));
                Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> logEnd =
                        admin.listOffsets(req).all().get(TIMEOUT_SEC, TimeUnit.SECONDS);

                for (Map.Entry<TopicPartition, OffsetAndMetadata> e : committed.entrySet()) {
                    TopicPartition tp = e.getKey();
                    long current = e.getValue().offset();
                    long end     = logEnd.containsKey(tp) ? logEnd.get(tp).offset() : current;
                    long lag     = Math.max(0, end - current);
                    totalLag += lag;
                    lags.add(ConsumerGroupInfo.PartitionLag.builder()
                            .topic(tp.topic()).partition(tp.partition())
                            .currentOffset(current).logEndOffset(end).lag(lag)
                            .build());
                }
            }
        } catch (Exception ignored) {}

        lags.sort(Comparator.comparing(ConsumerGroupInfo.PartitionLag::getTopic)
                .thenComparingInt(ConsumerGroupInfo.PartitionLag::getPartition));

        return ConsumerGroupInfo.builder()
                .groupId(desc.groupId())
                .state(desc.state().toString())
                .protocol(desc.partitionAssignor())
                .memberCount(members.size())
                .totalLag(totalLag)
                .members(members)
                .partitionLags(lags)
                .build();
    }

    private Map<TopicPartition, Long> getOffsets(String clusterId,
                                                   List<TopicPartition> tps,
                                                   boolean earliest) {
        if (tps.isEmpty()) return Map.of();
        try (KafkaConsumer<String, String> consumer = factory.consumer(clusterId)) {
            if (earliest) {
                return consumer.beginningOffsets(tps).entrySet().stream()
                        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
            } else {
                return consumer.endOffsets(tps).entrySet().stream()
                        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
            }
        } catch (Exception e) {
            log.warn("[kafka-admin] Could not fetch offsets: {}", e.getMessage());
            return Map.of();
        }
    }
}
