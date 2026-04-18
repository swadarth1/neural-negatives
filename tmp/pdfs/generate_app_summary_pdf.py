from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

out_path = "/Users/swaddi/film-sca/output/pdf/app-summary-one-page.pdf"

c = canvas.Canvas(out_path, pagesize=letter)
width, height = letter

left = 46
right = width - 46
y = height - 46

# Title
c.setFont("Helvetica-Bold", 18)
c.drawString(left, y, "App Summary: Neural Negatives (film-sca)")
y -= 18
c.setStrokeColor(colors.HexColor("#D0D0D0"))
c.setLineWidth(0.8)
c.line(left, y, right, y)
y -= 16


def section(title, lines):
    global y
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#1F2937"))
    c.drawString(left, y, title)
    y -= 13

    c.setFont("Helvetica", 9.6)
    c.setFillColor(colors.black)
    for line in lines:
        if line.startswith("- "):
            c.drawString(left + 8, y, u"\u2022")
            c.drawString(left + 20, y, line[2:])
            y -= 11
        else:
            c.drawString(left, y, line)
            y -= 11
    y -= 6


section("What It Is", [
    "A browser-based interactive 3D photo-exploration experience built with Three.js and Vite.",
    "Users move through a generated branch structure, reveal polaroids, and see location-based discovery stats.",
])

section("Who It Is For", [
    "Primary persona (inferred from code/assets): someone exploring a personal travel/life photo archive in an immersive format.",
    "Explicit target audience statement: Not found in repo.",
])

section("What It Does", [
    "- Loads a photo catalog from /data/photos.json and preloads image textures.",
    "- Renders a 3D scene with first-person movement (W/A/S/D + Space/Shift) and pointer lock controls.",
    "- Places photo-polaroid cards in 3D space and reveals nearest cards with opacity-based culling.",
    "- Flips cards on E interaction, with front image and generated handwritten-style back metadata.",
    "- Plays ambient background audio plus flip and flip-reverse sound effects with mute toggle.",
    "- Tracks discovery stats: photos revealed, unique cities/countries, and cumulative distance via haversine.",
    "- Shows animated loading overlay with progress and tree-like growth visualization.",
])

section("How It Works (Repo-Evidence Architecture)", [
    "Components: index.html UI shell, src/loadingScreen.js overlay/progress, src/main.js 3D runtime, style.css UI styles.",
    "Data flow at runtime: browser fetches /data/photos.json -> main.js preloads /assets/photos/* -> scene graph + HUD update from interactions.",
    "Asset services: local static assets for photos, fonts, and sounds served by Vite (no runtime backend found in repo).",
    "Offline data prep: scripts/importPhotos.js reads EXIF, reverse-geocodes via OpenStreetMap Nominatim, writes data/photos.json.",
    "Deployment/build output: Vite bundles to /dist (npm run build).",
])

section("How To Run (Minimal)", [
    "1. Install deps: npm install",
    "2. Start dev server: npm run dev",
    "3. Open the local URL shown by Vite in your browser.",
    "4. Optional production build: npm run build",
    "Data regeneration command for photos.json is not wired in package scripts: Not found in repo.",
])

c.showPage()
c.save()
print(out_path)
