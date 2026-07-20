from html import escape


OUT = "/Users/nguyenlehuy/Downloads/unilish/report-assets/unilish-usecase-overview.svg"
W, H = 1300, 1700


def wrap(text, width=18):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = word if not line else f"{line} {word}"
        if len(candidate) <= width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def text(x, y, value, size=26, weight="400", anchor="middle", italic=False):
    style = "font-style:italic;" if italic else ""
    return (
        f'<text x="{x}" y="{y}" text-anchor="{anchor}" '
        f'font-family="Arial, sans-serif" font-size="{size}" '
        f'font-weight="{weight}" fill="#222" style="{style}">{escape(value)}</text>'
    )


def multiline_text(x, y, value, size=22, width=18):
    lines = wrap(value, width)
    tspans = []
    start = y - (len(lines) - 1) * size * 0.55
    for i, line in enumerate(lines):
        dy = start + i * size * 1.05
        tspans.append(f'<tspan x="{x}" y="{dy}">{escape(line)}</tspan>')
    return (
        f'<text text-anchor="middle" font-family="Arial, sans-serif" '
        f'font-size="{size}" fill="#222">' + "".join(tspans) + "</text>"
    )


def ellipse(x, y, label, rx=175, ry=44):
    return (
        f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#f7f7f7" '
        f'stroke="#777" stroke-width="2"/>'
        + multiline_text(x, y + 8, label, 22, 19)
    )


def actor(x, y, label):
    return (
        f'<circle cx="{x}" cy="{y - 72}" r="24" fill="none" stroke="#555" stroke-width="2"/>'
        f'<line x1="{x}" y1="{y - 48}" x2="{x}" y2="{y + 28}" stroke="#555" stroke-width="2"/>'
        f'<line x1="{x - 42}" y1="{y - 16}" x2="{x + 42}" y2="{y - 16}" stroke="#555" stroke-width="2"/>'
        f'<line x1="{x}" y1="{y + 28}" x2="{x - 42}" y2="{y + 92}" stroke="#555" stroke-width="2"/>'
        f'<line x1="{x}" y1="{y + 28}" x2="{x + 42}" y2="{y + 92}" stroke="#555" stroke-width="2"/>'
        + text(x, y + 138, label, 28)
    )


def arrow(x1, y1, x2, y2, dashed=False, label=None, curve=0):
    dash = ' stroke-dasharray="8 7"' if dashed else ""
    if curve:
        mx = (x1 + x2) / 2
        my = (y1 + y2) / 2 - curve
        path = f'M {x1} {y1} Q {mx} {my} {x2} {y2}'
    else:
        path = f'M {x1} {y1} L {x2} {y2}'
    label_svg = ""
    if label:
        label_svg = text((x1 + x2) / 2, (y1 + y2) / 2 - 10, label, 18)
    return (
        f'<path d="{path}" fill="none" stroke="#444" stroke-width="2.2" '
        f'marker-end="url(#arrow)"{dash}/>' + label_svg
    )


def main():
    learner = [
        ("Đăng ký / Đăng nhập", 475, 305),
        ("Thiết lập hồ sơ học tập", 475, 430),
        ("Làm bài kiểm tra đầu vào", 475, 555),
        ("Nhận đề xuất khóa học", 475, 680),
        ("Học khóa học và bài học", 475, 805),
        ("Làm bài luyện tập", 475, 930),
        ("Luyện giao tiếp AI", 475, 1055),
        ("Luyện Shadowing, Dictation, IELTS", 475, 1180),
        ("Theo dõi tiến độ học tập", 475, 1305),
    ]
    admin = [
        ("Xem dashboard quản trị", 825, 305),
        ("Quản lý người dùng", 825, 430),
        ("Quản lý ngôn ngữ và mục tiêu", 825, 555),
        ("Quản lý khóa học, unit, lesson", 825, 680),
        ("Quản lý nội dung và câu hỏi", 825, 805),
        ("Sinh nội dung bằng AI", 825, 930),
        ("Quản lý Placement và IELTS", 825, 1055),
        ("Duyệt và xuất bản nội dung", 825, 1180),
        ("Quản lý media luyện tập", 825, 1305),
    ]

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        '<defs><marker id="arrow" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 12 5 L 0 10 z" fill="#444"/></marker></defs>',
        '<rect width="100%" height="100%" fill="#fff"/>',
        text(650, 85, "Use Case - Unilish", 34, "700"),
        '<rect x="275" y="150" width="750" height="1290" rx="5" fill="none" stroke="#333" stroke-width="3"/>',
        text(650, 205, "Unilish", 30, "700"),
        actor(145, 785, "Learner"),
        actor(1155, 785, "Admin"),
    ]

    for label, x, y in learner + admin:
        parts.append(ellipse(x, y, label))

    for _, x, y in learner[:-1]:
        parts.append(arrow(190, 785, x - 172, y, curve=(y - 785) * 0.09))
    parts.append(arrow(190, 785, 475 - 172, 1305, curve=80))

    for _, x, y in admin[:-1]:
        parts.append(arrow(1110, 785, x + 172, y, curve=(785 - y) * 0.09))
    parts.append(arrow(1110, 785, 825 + 172, 1305, curve=80))

    relations = [
        ((475, 305), (475, 430), "include"),
        ((475, 555), (475, 680), "include"),
        ((475, 805), (475, 930), "include"),
        ((475, 930), (475, 1305), "include"),
        ((475, 1180), (475, 1305), "include"),
        ((825, 680), (825, 805), "include"),
        ((825, 805), (825, 930), "extend"),
        ((825, 1055), (825, 1180), "include"),
        ((825, 1305), (475, 1180), "cung cấp dữ liệu"),
    ]
    for (x1, y1), (x2, y2), label in relations:
        parts.append(arrow(x1, y1 + 44, x2, y2 - 44, dashed=True, label=label))

    parts.append(text(650, 1535, "Hình 2.1. Use Case Diagram tổng quát hệ thống Unilish", 25, italic=True))
    parts.append("</svg>")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))


if __name__ == "__main__":
    main()
