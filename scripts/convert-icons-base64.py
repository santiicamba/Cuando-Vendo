#!/usr/bin/env python3
"""
Convert PNG icons to base64 for embedding in PWA manifest and meta tags
"""

import base64
import urllib.request
from pathlib import Path
import json

# Icon URLs
icon_512_url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon-512-removebg-preview-4SfFzGsDqn5nyhbb8Qr5WF01eOIZPb.png"
icon_192_url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon-192-removebg-preview-DRZuTkK7AM92mPkkNTqfOK5gCuYb4H.png"

def fetch_and_convert_to_base64(url):
    """Download image and return base64 encoded string"""
    try:
        with urllib.request.urlopen(url) as response:
            data = response.read()
        return base64.b64encode(data).decode('utf-8')
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return None

print("Converting icons to base64...")

# Download and convert 512x512 icon
print("Downloading 512x512 icon (will be used as-is in manifest, scaled by browser for 512x512 entry)")
base64_512 = fetch_and_convert_to_base64(icon_512_url)
if base64_512:
    print(f"✓ 512x512 icon: {len(base64_512)} chars")

# Download and convert 192x192 icon
print("Downloading 192x192 icon...")
base64_192 = fetch_and_convert_to_base64(icon_192_url)
if base64_192:
    print(f"✓ 192x192 icon: {len(base64_192)} chars")

# Output manifest entries
if base64_512 and base64_192:
    print("\n" + "="*80)
    print("Use the following in manifest.json inside 'icons' array:")
    print("="*80)
    manifest_entry = {
        "icons": [
            {
                "src": f"data:image/png;base64,{base64_192}",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": f"data:image/png;base64,{base64_512}",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": f"data:image/png;base64,{base64_192}",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable"
            },
            {
                "src": f"data:image/png;base64,{base64_512}",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ]
    }
    print(json.dumps(manifest_entry, indent=2))
    
    print("\n" + "="*80)
    print("Use the following for apple-touch-icon meta tag in layout.tsx:")
    print("="*80)
    apple_tag = f'<link rel="apple-touch-icon" href="data:image/png;base64,{base64_192}" />'
    print(apple_tag)
    
    # Write to output files for reference
    Path('public/icons').mkdir(parents=True, exist_ok=True)
    
    with open('scripts/icon-base64-manifest.json', 'w') as f:
        json.dump(manifest_entry, f, indent=2)
    print(f"\n✓ Saved manifest entries to scripts/icon-base64-manifest.json")
    
    with open('scripts/icon-base64-apple-tag.txt', 'w') as f:
        f.write(apple_tag)
    print(f"✓ Saved apple-touch-icon tag to scripts/icon-base64-apple-tag.txt")
