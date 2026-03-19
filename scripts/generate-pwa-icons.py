#!/usr/bin/env python3
"""
Download PWA icons, resize 500->512, convert to base64, and output the strings.
"""

import urllib.request
import base64
import io

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

ICON_192_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon-192-removebg-preview-ir7DXfMGTNWaYXYgxGntNK5mNnBC5v.png"
ICON_500_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon-512-removebg-preview-6nq1ZevTbayWPxhIzjFinpGacUSSa7.png"

def download_image(url: str) -> bytes:
    """Download image from URL and return bytes."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()

def resize_to_512(img_bytes: bytes) -> bytes:
    """Resize image to 512x512 using PIL."""
    if not HAS_PIL:
        # If PIL not available, return original
        return img_bytes
    
    img = Image.open(io.BytesIO(img_bytes))
    # Resize to 512x512 with high quality
    img_resized = img.resize((512, 512), Image.Resampling.LANCZOS)
    
    output = io.BytesIO()
    img_resized.save(output, format="PNG", optimize=True)
    return output.getvalue()

def to_base64(img_bytes: bytes) -> str:
    """Convert bytes to base64 data URI."""
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    return f"data:image/png;base64,{b64}"

def main():
    print("Downloading 192x192 icon...")
    icon_192_bytes = download_image(ICON_192_URL)
    print(f"  Downloaded {len(icon_192_bytes)} bytes")
    
    print("Downloading 500x500 icon...")
    icon_500_bytes = download_image(ICON_500_URL)
    print(f"  Downloaded {len(icon_500_bytes)} bytes")
    
    if HAS_PIL:
        print("Resizing 500x500 to 512x512...")
        icon_512_bytes = resize_to_512(icon_500_bytes)
        print(f"  Resized to {len(icon_512_bytes)} bytes")
    else:
        print("PIL not available, using original 500x500 image")
        icon_512_bytes = icon_500_bytes
    
    print("\nConverting to base64...")
    b64_192 = to_base64(icon_192_bytes)
    b64_512 = to_base64(icon_512_bytes)
    
    print(f"\n=== 192x192 BASE64 ({len(b64_192)} chars) ===")
    print(b64_192[:200] + "..." if len(b64_192) > 200 else b64_192)
    
    print(f"\n=== 512x512 BASE64 ({len(b64_512)} chars) ===")
    print(b64_512[:200] + "..." if len(b64_512) > 200 else b64_512)
    
    # Write full base64 strings to files for easy copying
    with open("/vercel/share/v0-project/scripts/icon-192-base64.txt", "w") as f:
        f.write(b64_192)
    print("\nWrote full 192x192 base64 to /vercel/share/v0-project/scripts/icon-192-base64.txt")
    
    with open("/vercel/share/v0-project/scripts/icon-512-base64.txt", "w") as f:
        f.write(b64_512)
    print("Wrote full 512x512 base64 to /vercel/share/v0-project/scripts/icon-512-base64.txt")
    
    print("\nDone!")

if __name__ == "__main__":
    main()
