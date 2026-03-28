package com.dbadmin.kafka.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

// ── Cluster info ─────────────────────────────────────────────────────────────

@Data
@Builder
public class ClusterInfo {
    public String  clusterId;
    public String  label;
    public String  bootstrapServers;
    public boolean connected;
    public int     brokerCount;
    public int     topicCount;
    public String  controllerId;
}
