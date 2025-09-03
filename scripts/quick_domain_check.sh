#!/bin/bash

# Quick domain availability checker - focusing on alternatives
echo "🔍 Quick Domain Check for CloudEZ"
echo "=================================="
echo ""

# Focus on alternative TLDs that are more likely to be available
alternative_domains=(
    "cloudez.app"
    "cloudez.io"
    "cloudez.storage"
    "cloudez.cloud"
    "cloudez.tech"
    "cloudez.digital"
    "cloudez.works"
    "cloudez.site"
    "cloudez.dev"
    "cloudez.net"
    "cloudez.org"
    "cloudez.biz"
    "cloudez.info"
    "cloudez.me"
    "cloudez.co"
    "cloudez.space"
    "cloudez.world"
    "cloudez.online"
    "cloudez.store"
    "cloudez.solutions"
)

echo "Checking alternative TLDs (more likely to be available):"
echo "--------------------------------------------------------"

available_count=0
taken_count=0

for domain in "${alternative_domains[@]}"; do
    # Quick check using nslookup (faster than whois)
    if nslookup "$domain" >/dev/null 2>&1; then
        echo "❌ $domain - TAKEN"
        ((taken_count++))
    else
        echo "✅ $domain - AVAILABLE"
        ((available_count++))
    fi
done

echo ""
echo "=================================="
echo "📊 RESULTS:"
echo "Available: $available_count"
echo "Taken: $taken_count"
echo ""

if [ $available_count -gt 0 ]; then
    echo "🎉 Great news! You have several available options:"
    echo ""
    echo "💡 RECOMMENDATIONS:"
    echo "1. cloudez.app - Modern, app-focused"
    echo "2. cloudez.io - Developer-friendly"
    echo "3. cloudez.storage - Descriptive"
    echo "4. cloudez.cloud - Meta and memorable"
    echo "5. cloudez.tech - Technology focus"
    echo ""
    echo "💰 Pricing typically ranges from $10-30/year for these TLDs"
    echo "vs $15-50/year for .com domains"
else
    echo "😔 All alternative TLDs are taken too."
    echo "Consider:"
    echo "- Adding a word: mycloudez.com, getcloudez.com"
    echo "- Using hyphens: cloud-ez.com, cloud-ez.app"
    echo "- Creative variations: cloudeez.com, cloudiez.com"
fi

echo ""
echo "🔍 To verify availability, visit:"
echo "- Namecheap.com"
echo "- GoDaddy.com"
echo "- Google Domains"
echo "- Cloudflare Domains"
