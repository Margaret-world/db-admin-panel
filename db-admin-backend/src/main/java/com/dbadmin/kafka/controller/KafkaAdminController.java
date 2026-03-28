package com.dbadmin.kafka.controller;

import com.dbadmin.kafka.model.*;
import com.dbadmin.kafka.service.KafkaAdminService;
import com.dbadmin.kafka.service.KafkaMessageService;
import com.dbadmin.model.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Kafka Admin Panel REST API
 *
 * Base path: /api/admin/kafka
 *
 *  GET    /clusters                                         → list all clusters + health
 *  GET    /clusters/{cluster}/topics                        → list topics
 *  GET    /clusters/{cluster}/topics/{topic}                → topic detail + partition offsets
 *  POST   /clusters/{cluster}/topics                        → create topic
 *  DELETE /clusters/{cluster}/topics/{topic}                → delete topic
 *  GET    /clusters/{cluster}/groups                        → list consumer groups
 *  GET    /clusters/{cluster}/groups/{group}                → group detail + lag per partition
 *  GET    /clusters/{cluster}/topics/{topic}/messages       → browse messages
 *  POST   /clusters/{cluster}/messages                      → publish a message
 */
@RestController
@RequestMapping("/api/admin/kafka")
@RequiredArgsConstructor
public class KafkaAdminController {

    private final KafkaAdminService   adminService;
    private final KafkaMessageService messageService;

    // ── Clusters ──────────────────────────────────────────────────────────────

    @GetMapping("/clusters")
    public ApiResponse<List<ClusterInfo>> listClusters() {
        return ApiResponse.ok(adminService.listClusters());
    }

    // ── Topics ────────────────────────────────────────────────────────────────

    @GetMapping("/clusters/{cluster}/topics")
    public ApiResponse<List<TopicInfo>> listTopics(
            @PathVariable("cluster")                              String  cluster,
            @RequestParam(value = "internal", defaultValue = "false") boolean internal) {
        return ApiResponse.ok(adminService.listTopics(cluster, internal));
    }

    @GetMapping("/clusters/{cluster}/topics/{topic}")
    public ApiResponse<TopicInfo> getTopic(
            @PathVariable("cluster") String cluster,
            @PathVariable("topic")   String topic) {
        return ApiResponse.ok(adminService.getTopic(cluster, topic));
    }

    @PostMapping("/clusters/{cluster}/topics")
    public ApiResponse<Void> createTopic(
            @PathVariable("cluster") String cluster,
            @Valid @RequestBody CreateTopicRequest req) {
        adminService.createTopic(cluster, req);
        return ApiResponse.ok("Topic created: " + req.getName(), null);
    }

    @DeleteMapping("/clusters/{cluster}/topics/{topic}")
    public ApiResponse<Void> deleteTopic(
            @PathVariable("cluster") String cluster,
            @PathVariable("topic")   String topic) {
        adminService.deleteTopic(cluster, topic);
        return ApiResponse.ok("Topic deleted: " + topic, null);
    }

    // ── Consumer groups ───────────────────────────────────────────────────────

    @GetMapping("/clusters/{cluster}/groups")
    public ApiResponse<List<ConsumerGroupInfo>> listGroups(
            @PathVariable("cluster") String cluster) {
        return ApiResponse.ok(adminService.listConsumerGroups(cluster));
    }

    @GetMapping("/clusters/{cluster}/groups/{group}")
    public ApiResponse<ConsumerGroupInfo> getGroup(
            @PathVariable("cluster") String cluster,
            @PathVariable("group")   String group) {
        return ApiResponse.ok(adminService.getConsumerGroup(cluster, group));
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    /**
     * GET /clusters/{cluster}/topics/{topic}/messages
     *     ?partition=-1&fromOffset=-1&limit=50
     *
     * partition  = -1 → all partitions
     * fromOffset = -1 → tail (latest - limit)
     */
    @GetMapping("/clusters/{cluster}/topics/{topic}/messages")
    public ApiResponse<List<KafkaMessage>> fetchMessages(
            @PathVariable("cluster")                               String cluster,
            @PathVariable("topic")                                 String topic,
            @RequestParam(value = "partition",   defaultValue = "-1")  int    partition,
            @RequestParam(value = "fromOffset",  defaultValue = "-1")  long   fromOffset,
            @RequestParam(value = "limit",       defaultValue = "50")  int    limit) {
        return ApiResponse.ok(messageService.fetchMessages(cluster, topic, partition, fromOffset, limit));
    }

    /**
     * POST /clusters/{cluster}/messages
     * Body: PublishRequest
     */
    @PostMapping("/clusters/{cluster}/messages")
    public ApiResponse<Map<String, Object>> publish(
            @PathVariable("cluster") String cluster,
            @Valid @RequestBody PublishRequest req) {
        return ApiResponse.ok("Message published", messageService.publish(cluster, req));
    }
}
