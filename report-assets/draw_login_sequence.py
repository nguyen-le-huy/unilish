from html import escape
from pathlib import Path
import subprocess


OUT_DIR = Path("/Users/nguyenlehuy/Downloads/unilish/report-assets/sequence")
OUT_DIR.mkdir(parents=True, exist_ok=True)
SVG = OUT_DIR / "seq-login-auth.svg"
PNG = OUT_DIR / "seq-login-auth.png"
NODE = "/Users/nguyenlehuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
NODE_PATH = "/Users/nguyenlehuy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"


W, H = 1700, 2120
RED = "#c93535"
BLACK = "#222"
GREY = "#b9b9b9"


participants = [
    ("actor", "Learner / Admin", 95),
    ("view", "LoginPage", 320),
    ("ctrl", "authService", 555),
    ("ctrl", "Auth API\n(/api/auth)", 805),
    ("entity", "Database", 1060),
    ("ext", "Google OAuth", 1315),
    ("view", "Home / Admin CMS", 1580),
]


def text(x, y, s, size=24, weight="400", anchor="middle", italic=False, color=BLACK):
    style = "font-style:italic;" if italic else ""
    return (
        f'<text x="{x}" y="{y}" text-anchor="{anchor}" '
        f'font-family="Arial, sans-serif" font-size="{size}" font-weight="{weight}" '
        f'fill="{color}" style="{style}">{escape(s)}</text>'
    )


def multi_text(x, y, s, size=22, weight="400", anchor="middle", color=BLACK):
    lines = s.split("\n")
    parts = [
        f'<text text-anchor="{anchor}" font-family="Arial, sans-serif" '
        f'font-size="{size}" font-weight="{weight}" fill="{color}">'
    ]
    start = y - (len(lines) - 1) * size * 0.55
    for i, line in enumerate(lines):
        parts.append(f'<tspan x="{x}" y="{start + i * size * 1.15}">{escape(line)}</tspan>')
    parts.append("</text>")
    return "".join(parts)


def actor_icon(x, y, label):
    return (
        f'<circle cx="{x}" cy="{y}" r="15" fill="#e9e8ff" stroke="#8e8eaa" stroke-width="2"/>'
        f'<line x1="{x}" y1="{y+15}" x2="{x}" y2="{y+60}" stroke="{BLACK}" stroke-width="2"/>'
        f'<line x1="{x-34}" y1="{y+34}" x2="{x+34}" y2="{y+34}" stroke="{BLACK}" stroke-width="2"/>'
        f'<line x1="{x}" y1="{y+60}" x2="{x-30}" y2="{y+100}" stroke="{BLACK}" stroke-width="2"/>'
        f'<line x1="{x}" y1="{y+60}" x2="{x+30}" y2="{y+100}" stroke="{BLACK}" stroke-width="2"/>'
        + multi_text(x, y + 133, label, 20)
    )


def lifeline_header(kind, label, x, y=95):
    if kind == "actor":
        return actor_icon(x, y, label)
    if kind == "view":
        shape = (
            f'<line x1="{x}" y1="{y+2}" x2="{x}" y2="{y+65}" stroke="{BLACK}" stroke-width="2"/>'
            f'<circle cx="{x+24}" cy="{y+23}" r="21" fill="#e9e8ff" stroke="#8e8eaa" stroke-width="2"/>'
        )
        stereo = "«view»"
    elif kind == "ctrl":
        shape = f'<circle cx="{x}" cy="{y+25}" r="23" fill="#e9e8ff" stroke="#8e8eaa" stroke-width="2"/><path d="M {x-5} {y+3} q 20 -25 36 0" fill="none" stroke="{BLACK}" stroke-width="2"/>'
        stereo = "«ctrl»"
    elif kind == "entity":
        shape = f'<circle cx="{x}" cy="{y+24}" r="23" fill="#e9e8ff" stroke="#8e8eaa" stroke-width="2"/>'
        stereo = "«entity»"
    else:
        shape = f'<circle cx="{x}" cy="{y+24}" r="23" fill="#e9e8ff" stroke="#8e8eaa" stroke-width="2"/>'
        stereo = "«external»"
    return shape + multi_text(x, y + 78, f"{stereo}\n{label}", 20)


def lifeline_footer(kind, label, x):
    y = H - 190
    if kind == "actor":
        return actor_icon(x, y, label)
    return lifeline_header(kind, label, x, y)


def dashed_lifeline(x, y1=245, y2=H-230):
    return f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke="{GREY}" stroke-width="2" stroke-dasharray="8 8"/>'


def arrow(x1, x2, y, label, dashed=False, return_arrow=False):
    color = RED
    dash = ' stroke-dasharray="7 7"' if dashed else ""
    marker = "url(#arrow-red-left)" if return_arrow else "url(#arrow-red)"
    line = (
        f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="{color}" stroke-width="2" '
        f'marker-end="{marker}"{dash}/>'
    )
    tx = (x1 + x2) / 2
    return line + text(tx, y - 12, label, 18, color=BLACK)


def note_box(y, title, h):
    return (
        f'<rect x="35" y="{y}" width="{W-70}" height="{h}" fill="none" stroke="{BLACK}" stroke-width="2"/>'
        f'<path d="M 35 {y+36} L 130 {y+36} L 160 {y} L 35 {y}" fill="#fff" stroke="{BLACK}" stroke-width="2"/>'
        + text(78, y + 25, "alt", 20, "700")
        + text(190, y + 25, title, 19, "700", anchor="start")
    )


def divider(y, label):
    return (
        f'<line x1="35" y1="{y}" x2="{W-35}" y2="{y}" stroke="{BLACK}" stroke-width="1.5" stroke-dasharray="6 5"/>'
        + text(55, y + 28, label, 18, "700", anchor="start")
    )


def main():
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        '<defs>',
        f'<marker id="arrow-red" markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto"><path d="M0,0 L11,4 L0,8 z" fill="{RED}"/></marker>',
        f'<marker id="arrow-red-left" markerWidth="11" markerHeight="8" refX="10" refY="4" orient="auto"><path d="M0,0 L11,4 L0,8 z" fill="{RED}"/></marker>',
        '</defs>',
        '<rect width="100%" height="100%" fill="#fff"/>',
        text(W/2, 45, "Sequence Diagram - Đăng nhập và phân quyền", 25, "700"),
    ]

    for kind, label, x in participants:
        parts.append(lifeline_header(kind, label, x))
        parts.append(dashed_lifeline(x))

    y = 280
    parts += [
        arrow(95, 320, y, "Mở trang đăng nhập"),
        arrow(320, 555, y + 55, "render LoginPage"),
    ]

    alt1_y = 390
    parts.append(note_box(alt1_y, "[Đăng nhập bằng email/password]", 455))
    parts += [
        arrow(95, 320, alt1_y + 75, "Nhập email, password"),
        arrow(320, 555, alt1_y + 125, "login(email, password)"),
        arrow(555, 805, alt1_y + 175, "POST /auth/login"),
        arrow(805, 1060, alt1_y + 225, "Tìm user theo email"),
        arrow(1060, 805, alt1_y + 275, "Thông tin user", dashed=True),
        arrow(805, 805, alt1_y + 325, "Kiểm tra mật khẩu, trạng thái"),
        arrow(805, 555, alt1_y + 375, "accessToken, refreshToken, role", dashed=True),
        arrow(555, 320, alt1_y + 425, "Lưu token", dashed=True),
    ]

    parts.append(divider(845, "[Đăng nhập bằng Google OAuth]"))
    parts += [
        arrow(95, 320, 905, "Chọn Google Login"),
        arrow(320, 1315, 955, "Mở xác thực Google"),
        arrow(1315, 320, 1005, "Trả credential / authorization code", dashed=True),
        arrow(320, 555, 1055, "loginWithGoogle(credential)"),
        arrow(555, 805, 1105, "POST /auth/google"),
        arrow(805, 1315, 1155, "Xác minh credential"),
        arrow(1315, 805, 1205, "Google user info", dashed=True),
        arrow(805, 1060, 1255, "Tìm hoặc tạo user"),
        arrow(1060, 805, 1305, "Thông tin user", dashed=True),
        arrow(805, 555, 1355, "accessToken, refreshToken, role", dashed=True),
        arrow(555, 320, 1405, "Lưu token", dashed=True),
    ]

    alt2_y = 1480
    parts.append(note_box(alt2_y, "[Phân quyền sau đăng nhập]", 245))
    parts += [
        arrow(320, 555, alt2_y + 70, "getCurrentUser()"),
        arrow(555, 805, alt2_y + 115, "GET /auth/me"),
        arrow(805, 555, alt2_y + 160, "Thông tin user + role", dashed=True),
        arrow(555, 320, alt2_y + 205, "Trả role", dashed=True),
    ]
    parts.append(divider(1610, "[Role = Admin]"))
    parts.append(arrow(320, 1580, 1655, "Điều hướng đến Admin CMS"))
    parts.append(divider(1685, "[Role = Learner]"))
    parts.append(arrow(320, 1580, 1730, "Điều hướng đến Learner Home"))

    for kind, label, x in participants:
        parts.append(lifeline_footer(kind, label, x))

    parts.append("</svg>")
    SVG.write_text("\n".join(parts), encoding="utf-8")

    script = f"""
const sharp = require('sharp');
(async () => {{
  await sharp({str(SVG)!r})
    .resize({{ width: 2200 }})
    .png()
    .toFile({str(PNG)!r});
}})();
"""
    subprocess.run([NODE, "-e", script], check=True, env={"NODE_PATH": NODE_PATH}, cwd=str(OUT_DIR))
    print(PNG)


if __name__ == "__main__":
    main()
