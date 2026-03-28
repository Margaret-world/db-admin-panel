#!/bin/sh
# =============================================================
#  Redis Test Seed — DB Admin Panel
#  Run manually after container starts:
#    docker exec -i db-admin-redis sh < redis-seed.sh
#
#  Seeds db0 (app cache), db1 (sessions), db2 (leaderboard/queues)
# =============================================================

CLI="redis-cli"

echo "=============================="
echo " Seeding Redis test data..."
echo "=============================="

# ── DB 0 : Application cache ──────────────────────────────────
echo "\n[db0] Application cache"
$CLI SELECT 0

# String — simple values
$CLI SET app:version "2.5.1"
$CLI SET app:maintenance "false"
$CLI SET app:base_url "http://localhost:3000"

# String — JSON blobs (common cache pattern)
$CLI SET cache:user:1 '{"id":1,"name":"Alice Chen","email":"alice@acme.com","role":"admin"}'
$CLI EXPIRE cache:user:1 3600

$CLI SET cache:user:2 '{"id":2,"name":"Bob Miller","email":"bob@acme.com","role":"editor"}'
$CLI EXPIRE cache:user:2 3600

$CLI SET cache:user:3 '{"id":3,"name":"Carol Smith","email":"carol@acme.com","role":"viewer"}'
$CLI EXPIRE cache:user:3 1800

# String — counters
$CLI SET counter:page_views  "148392"
$CLI SET counter:api_calls   "29847"
$CLI SET counter:errors_today "12"

# String — feature flags
$CLI SET feature:dark_mode    "true"
$CLI SET feature:beta_editor  "false"
$CLI SET feature:new_checkout "true"
$CLI EXPIRE feature:new_checkout 86400

# Hash — product cache
$CLI HSET cache:product:1 id 1 name "iPhone 15 Pro" price "1199.00" stock "42" category "phones"
$CLI EXPIRE cache:product:1 7200

$CLI HSET cache:product:2 id 2 name "MacBook Air M3" price "1299.00" stock "18" category "laptops"
$CLI EXPIRE cache:product:2 7200

$CLI HSET cache:product:3 id 3 name "USB-C Hub" price "49.00" stock "200" category "accessories"

# Hash — site configuration
$CLI HSET config:site \
  title "My App" \
  theme "dark" \
  locale "en-US" \
  timezone "UTC" \
  items_per_page "20" \
  max_upload_mb "10"

# Hash — rate limiter state per IP
$CLI HSET ratelimit:192.168.1.10 count 43 window_start "1720000000" limit 100
$CLI EXPIRE ratelimit:192.168.1.10 60

$CLI HSET ratelimit:10.0.0.22 count 8 window_start "1720000010" limit 100
$CLI EXPIRE ratelimit:10.0.0.22 60

# List — recent activity feed (newest first)
$CLI RPUSH feed:activity \
  "user:1 logged in" \
  "user:2 updated profile" \
  "user:1 created order:105" \
  "user:3 viewed product:1" \
  "user:4 deleted comment:7" \
  "user:2 exported report" \
  "user:5 changed password" \
  "admin reset user:6"

# List — job queue (FIFO)
$CLI RPUSH queue:email_jobs \
  '{"to":"alice@acme.com","subject":"Order confirmed","template":"order_confirm"}' \
  '{"to":"bob@acme.com","subject":"Password reset","template":"pwd_reset"}' \
  '{"to":"carol@acme.com","subject":"Welcome!","template":"welcome"}'

# List — error log ring buffer
$CLI RPUSH log:errors \
  "[2024-06-01 09:12:03] NullPointerException in OrderService.java:142" \
  "[2024-06-01 10:05:44] Connection timeout to payment gateway" \
  "[2024-06-01 11:30:21] Invalid JWT token from 203.0.113.5" \
  "[2024-06-01 12:00:00] Disk usage warning: 87% on /var/data"

# Set — online users
$CLI SADD online:users user:1 user:2 user:5 user:7
$CLI EXPIRE online:users 300

# Set — product categories (tags)
$CLI SADD tags:product:1 "new-arrival" "bestseller" "featured"
$CLI SADD tags:product:2 "bestseller" "sale"
$CLI SADD tags:product:3 "featured"

# Set — permission flags per role
$CLI SADD perms:admin  "read" "write" "delete" "manage_users" "export"
$CLI SADD perms:editor "read" "write"
$CLI SADD perms:viewer "read"

# ZSet — top pages by view count
$CLI ZADD stats:top_pages \
  2310 "/docs/getting-started" \
  1540 "/blog/spring-boot" \
  892  "/blog/mybatis-plus" \
  780  "/api-reference" \
  445  "/blog/mariadb-tuning" \
  210  "/pricing" \
  105  "/about"

# ZSet — search autocomplete scores
$CLI ZADD autocomplete:products \
  100 "iPhone 15 Pro" \
  95  "iPhone 15" \
  80  "MacBook Air M3" \
  75  "MacBook Pro" \
  60  "USB-C Hub" \
  45  "Wireless Charger"

echo "[db0] done — $(redis-cli DBSIZE) keys"

# ── DB 1 : Sessions ───────────────────────────────────────────
echo "\n[db1] Sessions"
$CLI SELECT 1

$CLI SET "session:a1b2c3d4-0001" '{"userId":1,"role":"admin","ip":"192.168.1.10","createdAt":"2024-06-01T09:00:00Z"}'
$CLI EXPIRE "session:a1b2c3d4-0001" 604800

$CLI SET "session:e5f6a7b8-0002" '{"userId":2,"role":"editor","ip":"10.0.0.22","createdAt":"2024-06-01T10:30:00Z"}'
$CLI EXPIRE "session:e5f6a7b8-0002" 604800

$CLI SET "session:c9d0e1f2-0003" '{"userId":5,"role":"admin","ip":"172.16.0.5","createdAt":"2024-06-01T08:15:00Z"}'
$CLI EXPIRE "session:c9d0e1f2-0003" 86400

# Hash — extended session metadata
$CLI HSET "session:meta:a1b2c3d4-0001" \
  user_agent "Mozilla/5.0 Chrome/120" \
  last_active "2024-06-01T12:45:00Z" \
  requests_this_session "142" \
  mfa_verified "true"
$CLI EXPIRE "session:meta:a1b2c3d4-0001" 604800

# Set — all active session IDs (for bulk invalidation)
$CLI SADD active:sessions \
  "session:a1b2c3d4-0001" \
  "session:e5f6a7b8-0002" \
  "session:c9d0e1f2-0003"

# ZSet — sessions ordered by last activity (unix ts)
$CLI ZADD sessions:by_activity \
  1719835500 "session:a1b2c3d4-0001" \
  1719831000 "session:e5f6a7b8-0002" \
  1719829200 "session:c9d0e1f2-0003"

echo "[db1] done — $(redis-cli -n 1 DBSIZE) keys"

# ── DB 2 : Leaderboard & pub/sub queues ───────────────────────
echo "\n[db2] Leaderboard & queues"
$CLI SELECT 2

# ZSet — game leaderboard (score = points)
$CLI ZADD leaderboard:global \
  98500 "player:alice" \
  87200 "player:bob" \
  76400 "player:carol" \
  65100 "player:david" \
  54300 "player:eva" \
  43200 "player:frank" \
  32100 "player:grace" \
  21000 "player:henry"

# Hash — player profiles
$CLI HSET player:alice  username "alice"  level 42 wins 317 losses 28  country "US"
$CLI HSET player:bob    username "bob"    level 38 wins 265 losses 51  country "GB"
$CLI HSET player:carol  username "carol"  level 35 wins 198 losses 44  country "DE"
$CLI HSET player:david  username "david"  level 30 wins 154 losses 63  country "KR"

# List — notification queue (pending push notifications)
$CLI RPUSH queue:notifications \
  '{"userId":1,"type":"achievement","message":"Reached level 42!"}' \
  '{"userId":2,"type":"friend_request","message":"carol wants to connect"}' \
  '{"userId":3,"type":"reward","message":"Daily login bonus: 100 coins"}'

# String — daily challenge
$CLI SET challenge:daily '{"date":"2024-06-01","task":"Win 3 matches","reward":500}'
$CLI EXPIREAT challenge:daily 1717286400

# Set — banned players
$CLI SADD players:banned "player:cheater99" "player:hacker42"

# ZSet — weekly top scores (resets every 7 days)
$CLI ZADD leaderboard:weekly \
  12400 "player:alice" \
  9800  "player:carol" \
  8700  "player:bob" \
  7200  "player:eva"
$CLI EXPIRE leaderboard:weekly 604800

echo "[db2] done — $(redis-cli -n 2 DBSIZE) keys"

echo "\n=============================="
echo " Seed complete!"
echo "=============================="
echo "db0: $(redis-cli -n 0 DBSIZE) keys (app cache)"
echo "db1: $(redis-cli -n 1 DBSIZE) keys (sessions)"
echo "db2: $(redis-cli -n 2 DBSIZE) keys (leaderboard)"
