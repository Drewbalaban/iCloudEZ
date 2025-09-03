#!/bin/bash

# Domain availability checker for CloudEZ project
echo "🔍 Checking domain availability for CloudEZ project..."
echo "=================================================="
echo ""

# Array of domains to check
domains=(
    "cloudez.com"
    "cloudwise.com"
    "cloudvault.com"
    "cloudsafe.com"
    "cloudprivacy.com"
    "cloudcontrol.com"
    "cloudfortress.com"
    "cloudhaven.com"
    "ezcloud.com"
    "mycloud.com"
    "securecloud.com"
    "privatecloud.com"
    "trustedcloud.com"
    "smartcloud.com"
    "fastcloud.com"
    "simplecloud.com"
    "cloudnest.com"
    "cloudshield.com"
    "cloudlock.com"
    "cloudkey.com"
    "cloudfort.com"
    "cloudcave.com"
    "cloudbox.com"
    "cloudez.app"
    "cloudez.io"
    "cloudez.storage"
    "cloudez.cloud"
    "cloudez.tech"
    "cloudez.digital"
    "cloudez.works"
    "cloudez.site"
)

# Function to check domain availability
check_domain() {
    local domain=$1
    local result
    
    # Use whois to check domain status
    result=$(whois "$domain" 2>/dev/null | grep -E "(No match|Domain not found|NOT FOUND|No Data Found|The queried object does not exist)" | head -1)
    
    if [ -n "$result" ]; then
        echo "✅ $domain - AVAILABLE"
        return 0
    else
        echo "❌ $domain - TAKEN"
        return 1
    fi
}

# Counters
available=0
taken=0

echo "Checking .com domains first (most professional):"
echo "-----------------------------------------------"
for domain in "${domains[@]}"; do
    if [[ $domain == *.com ]]; then
        if check_domain "$domain"; then
            ((available++))
        else
            ((taken++))
        fi
        sleep 1  # Be respectful to whois servers
    fi
done

echo ""
echo "Checking alternative TLDs:"
echo "--------------------------"
for domain in "${domains[@]}"; do
    if [[ $domain != *.com ]]; then
        if check_domain "$domain"; then
            ((available++))
        else
            ((taken++))
        fi
        sleep 1  # Be respectful to whois servers
    fi
done

echo ""
echo "=================================================="
echo "📊 SUMMARY:"
echo "Available domains: $available"
echo "Taken domains: $taken"
echo "Total checked: $((available + taken))"
echo ""
echo "💡 Next steps:"
echo "1. For available .com domains, consider registering quickly"
echo "2. For alternative TLDs, they're usually more affordable"
echo "3. Consider trademark searches before finalizing"
echo "=================================================="
