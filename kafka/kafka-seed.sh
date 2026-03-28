#!/bin/sh
# =============================================================
#  Kafka Test Seed — DB Admin Panel
#  Run after Kafka is healthy:
#    docker exec -i db-admin-kafka sh < kafka-seed.sh
# =============================================================

KAFKA_BIN=/opt/kafka/bin
BROKER=localhost:9092

echo "=============================="
echo " Creating Kafka test topics..."
echo "=============================="

# Helper
create_topic() {
  NAME=$1; PARTITIONS=$2; REPLICATION=$3
  $KAFKA_BIN/kafka-topics.sh --create \
    --bootstrap-server $BROKER \
    --topic $NAME \
    --partitions $PARTITIONS \
    --replication-factor $REPLICATION \
    --if-not-exists
  echo "  ✓ $NAME ($PARTITIONS partitions, RF=$REPLICATION)"
}

# App topics
create_topic "user-events"        3 1
create_topic "order-events"       3 1
create_topic "payment-events"     3 1
create_topic "notification-events" 2 1
create_topic "audit-log"          1 1
create_topic "dead-letter-queue"  1 1

echo "\n=============================="
echo " Publishing seed messages..."
echo "=============================="

publish() {
  TOPIC=$1; KEY=$2; VALUE=$3
  echo "$KEY:$VALUE" | $KAFKA_BIN/kafka-console-producer.sh \
    --bootstrap-server $BROKER \
    --topic $TOPIC \
    --property "parse.key=true" \
    --property "key.separator=:" 2>/dev/null
}

# user-events
publish user-events user:1 '{"eventType":"user.registered","userId":1,"email":"alice@acme.com","timestamp":"2024-06-01T09:00:00Z"}'
publish user-events user:2 '{"eventType":"user.registered","userId":2,"email":"bob@acme.com","timestamp":"2024-06-01T09:05:00Z"}'
publish user-events user:1 '{"eventType":"user.login","userId":1,"ip":"192.168.1.10","timestamp":"2024-06-01T10:00:00Z"}'
publish user-events user:3 '{"eventType":"user.registered","userId":3,"email":"carol@acme.com","timestamp":"2024-06-01T10:30:00Z"}'
publish user-events user:1 '{"eventType":"user.profile_updated","userId":1,"fields":["name","avatar"],"timestamp":"2024-06-01T11:00:00Z"}'
publish user-events user:2 '{"eventType":"user.login","userId":2,"ip":"10.0.0.22","timestamp":"2024-06-01T11:15:00Z"}'

# order-events
publish order-events order:101 '{"eventType":"order.created","orderId":101,"userId":1,"total":1248.00,"currency":"USD","timestamp":"2024-06-01T12:00:00Z"}'
publish order-events order:102 '{"eventType":"order.created","orderId":102,"userId":2,"total":918.00,"currency":"USD","timestamp":"2024-06-01T12:10:00Z"}'
publish order-events order:101 '{"eventType":"order.paid","orderId":101,"paymentId":"pay_abc123","timestamp":"2024-06-01T12:05:00Z"}'
publish order-events order:103 '{"eventType":"order.created","orderId":103,"userId":3,"total":1299.00,"currency":"USD","timestamp":"2024-06-01T13:00:00Z"}'
publish order-events order:102 '{"eventType":"order.paid","orderId":102,"paymentId":"pay_def456","timestamp":"2024-06-01T12:15:00Z"}'
publish order-events order:101 '{"eventType":"order.shipped","orderId":101,"trackingNo":"TRACK-XY-001","timestamp":"2024-06-01T14:00:00Z"}'

# payment-events
publish payment-events pay:abc123 '{"eventType":"payment.captured","paymentId":"pay_abc123","orderId":101,"amount":1248.00,"method":"card","timestamp":"2024-06-01T12:05:00Z"}'
publish payment-events pay:def456 '{"eventType":"payment.captured","paymentId":"pay_def456","orderId":102,"amount":918.00,"method":"card","timestamp":"2024-06-01T12:15:00Z"}'
publish payment-events pay:ghi789 '{"eventType":"payment.failed","paymentId":"pay_ghi789","orderId":103,"reason":"insufficient_funds","timestamp":"2024-06-01T13:05:00Z"}'
publish payment-events pay:jkl012 '{"eventType":"payment.refunded","paymentId":"pay_abc123","amount":49.00,"reason":"item_cancelled","timestamp":"2024-06-01T15:00:00Z"}'

# notification-events
publish notification-events notif:1 '{"type":"email","to":"alice@acme.com","template":"order_confirmed","orderId":101,"timestamp":"2024-06-01T12:06:00Z"}'
publish notification-events notif:2 '{"type":"push","userId":2,"message":"Your order has been confirmed!","timestamp":"2024-06-01T12:16:00Z"}'
publish notification-events notif:3 '{"type":"email","to":"carol@acme.com","template":"payment_failed","orderId":103,"timestamp":"2024-06-01T13:06:00Z"}'
publish notification-events notif:4 '{"type":"sms","phone":"+1-555-0101","message":"Order #101 shipped! Track: TRACK-XY-001","timestamp":"2024-06-01T14:01:00Z"}'

# audit-log
publish audit-log audit:1 '{"actor":"user:1","action":"CREATE","resource":"order:101","ip":"192.168.1.10","timestamp":"2024-06-01T12:00:00Z"}'
publish audit-log audit:2 '{"actor":"user:2","action":"UPDATE","resource":"profile:2","ip":"10.0.0.22","timestamp":"2024-06-01T11:30:00Z"}'
publish audit-log audit:3 '{"actor":"admin:1","action":"DELETE","resource":"comment:7","ip":"172.16.0.5","timestamp":"2024-06-01T10:45:00Z"}'
publish audit-log audit:4 '{"actor":"system","action":"AUTO_EXPIRE","resource":"session:old-token","timestamp":"2024-06-01T08:00:00Z"}'

echo "\n=============================="
echo " Listing created topics:"
echo "=============================="
$KAFKA_BIN/kafka-topics.sh --bootstrap-server $BROKER --list

echo "\nSeed complete!"
