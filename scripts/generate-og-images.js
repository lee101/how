// Hexo loads every top-level scripts/ file as JavaScript, so keep the Pillow
// implementation embedded and run it only when this file is called directly.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PYTHON = String.raw`
from pathlib import Path
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = Path.cwd()
POSTS = ROOT / "source" / "_posts"
OUTPUT = ROOT / "source" / "og"
WIDTH, HEIGHT = 1200, 630
INK = "#24292e"
MUTED = "#5f6b73"
BLUE = "#0a66b7"
PALE = "#fafbfc"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def front_matter(post):
    lines = post.read_text(encoding="utf-8").splitlines()
    if lines and lines[0].strip() == "---":
        end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), len(lines))
        header = "\n".join(lines[1:end])
    else:
        end = next((i for i, line in enumerate(lines) if line.strip() == "---"), min(40, len(lines)))
        header = "\n".join(lines[:end])
    values = {}
    for key in ("title", "author"):
        found = re.search(rf"^{key}:\s*(.*?)\s*$", header, re.M)
        if found:
            values[key] = found.group(1).strip().strip("\\\"'")
    values.setdefault("title", post.stem.replace("-", " ").title())
    values.setdefault("author", "Lee Penkman")
    return values

def wrap_title(draw, title, font, max_width):
    lines = []
    line = ""
    for word in title.split():
        candidate = f"{line} {word}".strip()
        if line and draw.textbbox((0, 0), candidate, font=font)[2] > max_width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines

def generate(title, author, destination):
    image = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 10), fill=BLUE)
    draw.rounded_rectangle((76, 72, 1124, 558), radius=22, fill=PALE,
                           outline="#eef2f8", width=2)
    draw.rounded_rectangle((112, 114, 122, 164), radius=5, fill=BLUE)
    draw.ellipse((1020, 96, 1080, 156), fill="#e8f2fb")
    draw.ellipse((1040, 116, 1060, 136), fill=BLUE)
    for size in range(58, 35, -2):
        font = ImageFont.truetype(FONT_BOLD, size)
        lines = wrap_title(draw, title, font, 850)
        line_height = size + 15
        if len(lines) * line_height <= 300:
            break
    y = 190
    for line in lines:
        draw.text((112, y), line, font=font, fill=INK)
        y += line_height
    draw.line((112, 492, 1088, 492), fill="#dfe5eb", width=2)
    draw.text((112, 516), "how.nz", font=ImageFont.truetype(FONT_BOLD, 27), fill=BLUE)
    draw.text((1088, 520), author, font=ImageFont.truetype(FONT_REGULAR, 22),
              fill=MUTED, anchor="ra")
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, format="PNG", optimize=True)
    if destination.stat().st_size >= 150_000:
        raise ValueError(f"Generated image exceeds 150 KB: {destination}")

posts = sorted(POSTS.glob("*.md"))
for post in posts:
    metadata = front_matter(post)
    target = OUTPUT / f"{post.stem}.png"
    generate(metadata["title"], metadata["author"], target)
    print(f"{target.relative_to(ROOT)} ({target.stat().st_size:,} bytes)")
print(f"Generated {len(posts)} OG images.")
`;

if (require.main === module) {
  const result = spawnSync('uv', ['run', '--with', 'pillow', 'python', '-c', PYTHON], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
