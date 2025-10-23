#!/usr/bin/env python3
"""
URL Verification Script for API Documentation
Checks all HTTP(S) links in documentation files for validity
"""

import re
import time
import urllib.request
import urllib.error
import json
from typing import Dict, List, Tuple
from collections import defaultdict

def extract_urls_from_file(filepath: str) -> List[str]:
    """Extract all HTTP(S) URLs from a file"""
    url_pattern = r'https?://[^\s\)"\'\`]+'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    urls = re.findall(url_pattern, content)
    return list(set(urls))  # Remove duplicates

def check_url(url: str, timeout: int = 10) -> Tuple[str, int, str]:
    """
    Check URL status
    Returns: (url, status_code, redirect_url or error_message)
    """
    # Skip template URLs with placeholders
    if any(x in url for x in ['{', '}', '${', '$LOCATION', 'PROJECT_ID', 'TEAM_ID', '[', ']']):
        return (url, -1, "TEMPLATE_URL")

    # Skip example URLs
    if any(x in url for x in ['example.com', 'example123', 'xyzcompany', 'your-server.com']):
        return (url, -1, "EXAMPLE_URL")

    # Clean up URLs with trailing characters
    url = url.rstrip("'\".,;:")

    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.getcode()
            final_url = response.geturl()
            if final_url != url:
                return (url, status, final_url)
            return (url, status, "OK")
    except urllib.error.HTTPError as e:
        return (url, e.code, str(e.reason))
    except urllib.error.URLError as e:
        return (url, -2, str(e.reason))
    except Exception as e:
        return (url, -3, str(e))

def main():
    # Documentation files to check
    doc_files = [
        'docs/api-documentation/axiom-api-docs.md',
        'docs/api-documentation/resend-api-docs.md',
        'docs/api-documentation/google-ai-studio-docs.md',
        'docs/api-documentation/google-vertex-ai-docs.md',
        'docs/api-documentation/vercel-api-docs.md',
        'docs/api-documentation/comet-suno-api-docs.md',
        'docs/api-documentation/fal-ai-docs.md',
        'docs/api-documentation/elevenlabs-api-docs.md',
        'docs/api-documentation/stripe-api-docs.md',
        'docs/api-documentation/supabase-api-docs.md',
        'docs/api-documentation/README.md',
    ]

    # Collect all URLs
    all_urls = set()
    for doc_file in doc_files:
        try:
            urls = extract_urls_from_file(doc_file)
            all_urls.update(urls)
            print(f"✓ Extracted {len(urls)} URLs from {doc_file}")
        except Exception as e:
            print(f"✗ Error reading {doc_file}: {e}")

    print(f"\n📊 Total unique URLs found: {len(all_urls)}")
    print("=" * 80)

    # Categorize URLs
    results = {
        'valid': [],
        'redirected': [],
        'broken': [],
        'template': [],
        'example': [],
        'error': []
    }

    print("\n🔍 Verifying URLs...")
    for i, url in enumerate(sorted(all_urls), 1):
        print(f"[{i}/{len(all_urls)}] Checking {url[:60]}...", end='\r')

        url_clean, status, result = check_url(url)

        if status == -1:
            if result == "TEMPLATE_URL":
                results['template'].append((url_clean, status, result))
            else:
                results['example'].append((url_clean, status, result))
        elif status == 200:
            if result != "OK":
                results['redirected'].append((url_clean, status, result))
            else:
                results['valid'].append((url_clean, status, result))
        elif status >= 400:
            results['broken'].append((url_clean, status, result))
        else:
            results['error'].append((url_clean, status, result))

        time.sleep(0.1)  # Rate limiting

    print("\n" + "=" * 80)

    # Print summary
    print("\n📈 VERIFICATION SUMMARY")
    print("=" * 80)
    print(f"✅ Valid URLs (200 OK):        {len(results['valid'])}")
    print(f"⚠️  Redirected URLs (3xx):      {len(results['redirected'])}")
    print(f"❌ Broken URLs (4xx/5xx):      {len(results['broken'])}")
    print(f"🔧 Template URLs (skipped):    {len(results['template'])}")
    print(f"💡 Example URLs (skipped):     {len(results['example'])}")
    print(f"⚡ Connection Errors:          {len(results['error'])}")

    # Save detailed report
    report = {
        'summary': {
            'total_urls': len(all_urls),
            'valid': len(results['valid']),
            'redirected': len(results['redirected']),
            'broken': len(results['broken']),
            'template': len(results['template']),
            'example': len(results['example']),
            'error': len(results['error'])
        },
        'results': results
    }

    with open('docs/api-documentation/link_verification_results.json', 'w') as f:
        json.dump(report, f, indent=2)

    print("\n💾 Detailed results saved to: docs/api-documentation/link_verification_results.json")

    # Print issues that need attention
    if results['broken']:
        print("\n❌ BROKEN URLS (Need Fixing):")
        print("=" * 80)
        for url, status, msg in results['broken'][:10]:  # Show first 10
            print(f"  [{status}] {url}")
            print(f"       → {msg}\n")

    if results['redirected']:
        print("\n⚠️  REDIRECTED URLS (Consider Updating):")
        print("=" * 80)
        for url, status, new_url in results['redirected'][:10]:  # Show first 10
            print(f"  [{status}] {url}")
            print(f"       → {new_url}\n")

    if results['error']:
        print("\n⚡ CONNECTION ERRORS (Manual Review Needed):")
        print("=" * 80)
        for url, status, msg in results['error'][:10]:  # Show first 10
            print(f"  {url}")
            print(f"       → {msg}\n")

if __name__ == "__main__":
    main()
