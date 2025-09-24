#!/bin/bash

# Configuration
EC2_USER="ubuntu"
EC2_IP="3.85.207.73"
CONTAINER_NAME="accurack_backend_prod"
HEALTHCHECKS_URL="https://hc-ping.com/c23f4bc8-63c2-448a-aba2-944b3d7e4b4d"

echo "🚀 Deploying monitoring script to EC2..."

# Create the monitoring script on EC2
ssh $EC2_USER@$EC2_IP << 'ENDSSH'
# Create monitoring script
cat > /home/ubuntu/monitor-app.sh << 'EOF'
#!/bin/bash

# Configuration
CONTAINER_NAME="accurack_backend_prod"
CHECK_INTERVAL=300  # Check every 5 minutes
HEALTHCHECKS_URL="https://hc-ping.com/c23f4bc8-63c2-448a-aba2-944b3d7e4b4d"

# Keywords that indicate problems
ERROR_KEYWORDS=("ERROR" "FATAL" "Exception" "crashed" "failed" "500" "timeout" "BadRequest" "Invalid" "Unknown argument")

log_message() {
    echo "[$(date)] $1" >> /var/log/app-monitor.log
}

check_container_health() {
    # Check if container is running
    CONTAINER_STATUS=$(docker ps --filter name=$CONTAINER_NAME --format '{{.Status}}')
    
    if [[ -z "$CONTAINER_STATUS" ]]; then
        log_message "🚨 ALERT: Container '$CONTAINER_NAME' is NOT running!"
        send_alert "Container $CONTAINER_NAME is DOWN!"
        return 1
    fi
    
    # Check recent logs for errors
    RECENT_LOGS=$(docker logs $CONTAINER_NAME --since 5m 2>&1)
    
    for keyword in "${ERROR_KEYWORDS[@]}"; do
        if echo "$RECENT_LOGS" | grep -i "$keyword" > /dev/null; then
            ERROR_LINES=$(echo "$RECENT_LOGS" | grep -i "$keyword" | tail -3)
            log_message "🚨 ALERT: Found '$keyword' in logs: $ERROR_LINES"
            send_alert "Error detected in $CONTAINER_NAME: $keyword"
            return 1
        fi
    done
    
    log_message "✅ Container '$CONTAINER_NAME' is healthy"
    
    # Ping Healthchecks.io to indicate everything is OK
    if [[ -n "$HEALTHCHECKS_URL" ]]; then
        curl -fsS -m 10 --retry 3 "$HEALTHCHECKS_URL" > /dev/null 2>&1
        log_message "📡 Pinged Healthchecks.io"
    fi
    
    return 0
}

send_alert() {
    local message="$1"
    local timestamp=$(date)
    log_message "ALERT: $message"
    
    # Send failure signal to Healthchecks.io
    if [[ -n "$HEALTHCHECKS_URL" ]]; then
        curl -fsS -m 10 --retry 3 "$HEALTHCHECKS_URL/fail" > /dev/null 2>&1
    fi
}

main() {
    log_message "🔍 Starting monitoring for container '$CONTAINER_NAME'..."
    
    while true; do
        check_container_health
        sleep $CHECK_INTERVAL
    done
}

# Run monitoring
main
EOF

# Make it executable
chmod +x /home/ubuntu/monitor-app.sh

# Create systemd service
sudo tee /etc/systemd/system/app-monitor.service > /dev/null << 'EOF'
[Unit]
Description=Application Container Monitor
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
ExecStart=/home/ubuntu/monitor-app.sh
Restart=always
RestartSec=30
StandardOutput=append:/var/log/app-monitor.log
StandardError=append:/var/log/app-monitor.log

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable app-monitor.service
sudo systemctl start app-monitor.service

# Create log file with proper permissions
sudo touch /var/log/app-monitor.log
sudo chown ubuntu:ubuntu /var/log/app-monitor.log

echo "✅ Monitor deployed and started as system service"
echo "📊 Check status: sudo systemctl status app-monitor"
echo "📋 View logs: tail -f /var/log/app-monitor.log"
ENDSSH

echo "🎉 Deployment complete!"
echo ""
echo "To check the monitor status:"
echo "ssh $EC2_USER@$EC2_IP 'sudo systemctl status app-monitor'"
echo ""
echo "To view monitor logs:"
echo "ssh $EC2_USER@$EC2_IP 'tail -f /var/log/app-monitor.log'"
