package com.dbadmin.kafka.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ConsumerGroupInfo {
    private String            groupId;
    private String            state;          // Stable, Empty, Dead, etc.
    private String            protocol;
    private int               memberCount;
    private long              totalLag;
    private List<MemberInfo>  members;
    private List<PartitionLag> partitionLags;

    @Data
    @Builder
    public static class MemberInfo {
        private String memberId;
        private String clientId;
        private String host;
    }

    @Data
    @Builder
    public static class PartitionLag {
        private String topic;
        private int    partition;
        private long   currentOffset;
        private long   logEndOffset;
        private long   lag;
    }
}
