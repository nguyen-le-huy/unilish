from html import escape


SVG_OUT = "/Users/nguyenlehuy/Downloads/unilish/report-assets/unilish-usecase-simple.svg"
W, H = 1000, 1360


def text(x, y, s, size=22, weight="400", anchor="middle", italic=False):
    style = "font-style:italic;" if italic else ""
    return (
        f'<text x="{x}" y="{y}" text-anchor="{anchor}" '
        f'font-family="Arial, sans-serif" font-size="{size}" '
        f'font-weight="{weight}" fill="#222" style="{style}">{escape(s)}</text>'
    )


def wrap(s, width=23):
    words = s.split()
    lines, line = [], ""
    for word in words:
        c = word if not line else f"{line} {word}"
        if len(c) <= width:
            line = c
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def multiline(x, y, s, size=17):
    lines = wrap(s)
    top = y - (len(lines) - 1) * size * 0.55
    spans = []
    for i, line in enumerate(lines):
        spans.append(f'<tspan x="{x}" y="{top + i * size * 1.1}">{escape(line)}</tspan>')
    return f'<text text-anchor="middle" font-family="Arial, sans-serif" font-size="{size}" fill="#222">{"".join(spans)}</text>'


def oval(x, y, s):
    return (
        f'<ellipse cx="{x}" cy="{y}" rx="155" ry="33" fill="#fff" stroke="#555" stroke-width="1.5"/>'
        + multiline(x, y + 6, s)
    )


def actor(x, y, s):
    return (
        f'<circle cx="{x}" cy="{y-45}" r="17" fill="none" stroke="#555" stroke-width="1.4"/>'
        f'<line x1="{x}" y1="{y-28}" x2="{x}" y2="{y+26}" stroke="#555" stroke-width="1.4"/>'
        f'<line x1="{x-32}" y1="{y-6}" x2="{x+32}" y2="{y-6}" stroke="#555" stroke-width="1.4"/>'
        f'<line x1="{x}" y1="{y+26}" x2="{x-31}" y2="{y+73}" stroke="#555" stroke-width="1.4"/>'
        f'<line x1="{x}" y1="{y+26}" x2="{x+31}" y2="{y+73}" stroke="#555" stroke-width="1.4"/>'
        + text(x, y + 113, s, 19)
    )


def arrow(x1, y1, x2, y2):
    return (
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#444" stroke-width="1.3" '
        f'marker-end="url(#arrow)"/>'
    )


def main():
    usecases = [
        "Đăng ký",
        "Đăng nhập",
        "Làm bài kiểm tra đầu vào",
        "Luyện kỹ năng giao tiếp với AI",
        "Học theo khóa học được đề xuất",
        "Học với video YouTube",
        "Quản lý profile",
        "Luyện đề IELTS",
        "Quản lý ngôn ngữ",
        "Quản lý mục tiêu",
        "Quản lý nội dung học",
        "Quản lý user",
        "Quản lý ngân hàng câu hỏi",
        "Quản lý bài kiểm tra đầu vào",
        "Quản lý đề IELTS",
    ]
    ys = [155 + i * 78 for i in range(len(usecases))]
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        '<defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="#444"/></marker></defs>',
        '<rect width="100%" height="100%" fill="#fff"/>',
        text(500, 55, "Use Case - Unilish", 27, "700"),
        '<rect x="255" y="88" width="490" height="1225" fill="none" stroke="#222" stroke-width="1.8"/>',
        text(500, 120, "Unilish", 20, "700"),
        actor(92, 690, "Learner"),
        actor(908, 690, "Admin"),
    ]
    for s, y in zip(usecases, ys):
        parts.append(oval(500, y, s))
    for y in ys[:8]:
        parts.append(arrow(130, 690, 345, y))
    for y in ys[8:]:
        parts.append(arrow(870, 690, 655, y))
    parts.append("</svg>")
    with open(SVG_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))


if __name__ == "__main__":
    main()
