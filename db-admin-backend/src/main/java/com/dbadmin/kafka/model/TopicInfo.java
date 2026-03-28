package com.dbadmin.kafka.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TopicInfo {
    private String            name;
    private int               partitionCount;
    private int               replicationFactor;
    private boolean           internal;
    private List<PartitionInfo> partitions;

    @Data
    @Builder
    public static class PartitionInfo {
        private int    partition;
        private int    leader;
        private long   earliestOffset;
        private long   latestOffset;
        private long   messageCount;       // latestOffset - earliestOffset
        private List<Integer> replicas;
        private List<Integer> isr;         // in-sync replicas
    }
}
