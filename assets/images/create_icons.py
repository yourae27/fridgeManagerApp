import base64

# Simple 1x1 blue PNG in base64
blue_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=="

# Decode and write to files
with open('icon.png', 'wb') as f:
    f.write(base64.b64decode(blue_png_b64))

with open('adaptive-icon.png', 'wb') as f:
    f.write(base64.b64decode(blue_png_b64))

with open('favicon.png', 'wb') as f:
    f.write(base64.b64decode(blue_png_b64))

with open('splash-icon.png', 'wb') as f:
    f.write(base64.b64decode(blue_png_b64))

print("Created placeholder images!")
