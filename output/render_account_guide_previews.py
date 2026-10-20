from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


OUT = Path(__file__).parent
W, H = 1600, 900
BG_PATH = OUT / "analysis-sidebar-final.jpg"
FONT_REG = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"

INK = "#203e4a"
MUTED = "#718991"
TEAL = "#397f8b"
PALE = "#eff5f6"
LINE = "#d9e6e8"


def font(size, bold=False, mono=False):
    return ImageFont.truetype(FONT_MONO if mono else FONT_BOLD if bold else FONT_REG, size)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadow_card(image, box, radius, fill="#f8fbfb", outline="#d8e5e7", shadow="#00152264"):
    x1, y1, x2, y2 = box
    shadow_layer = Image.new("RGBA", image.size)
    ImageDraw.Draw(shadow_layer).rounded_rectangle(
        (x1 + 1, y1 + 12, x2 + 1, y2 + 14), radius, fill=shadow
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(17))
    image.paste(shadow_layer, (0, 0), shadow_layer)
    d = ImageDraw.Draw(image)
    rounded(d, box, radius, fill, outline, 1)
    d.line((x1 + radius, y1 + 1, x2 - radius, y1 + 1), fill="#ffffffc9", width=1)


def background(dark=False, blur=0):
    image = Image.open(BG_PATH).convert("RGB")
    image = ImageOps.fit(image, (W, H), method=Image.Resampling.LANCZOS).convert("RGBA")
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    if dark:
        veil = Image.new("RGBA", image.size, (4, 19, 31, 166))
        image.alpha_composite(veil)
    return image.convert("RGB")


def text(d, xy, value, size, fill=INK, bold=False, mono=False, anchor="lt"):
    d.text(xy, value, font=font(size, bold, mono), fill=fill, anchor=anchor)


def book_icon(d, cx, cy, size=23, color="#b6e9eb"):
    s = size / 24
    p = lambda x, y: (cx + x * s, cy + y * s)
    d.line([p(3, 4), p(10, 4), p(12, 6), p(12, 20), p(10, 18), p(3, 18), p(3, 4)], fill=color, width=2)
    d.line([p(21, 4), p(14, 4), p(12, 6), p(12, 20), p(14, 18), p(21, 18), p(21, 4)], fill=color, width=2)
    d.line([p(6, 8), p(9, 8)], fill=color, width=1)
    d.line([p(15, 8), p(18, 8)], fill=color, width=1)
    d.ellipse((p(17, 1)[0], p(17, 1)[1], p(23, 7)[0], p(23, 7)[1]), fill="#2e6173", outline="#b6e9eb", width=1)
    d.line([p(18.5, 4), p(20, 5.5), p(22, 2.5)], fill="#d8f2ec", width=1)


def user_mark(d, cx, cy, radius, dark=True):
    fill = "#3d7785" if dark else "#2b6275"
    d.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=fill, outline="#9ed5dc", width=2)
    text(d, (cx - 1, cy - 1), "i", int(radius * 1.28), "#effafa", mono=False, anchor="mm")
    badge = max(3, int(radius * .14))
    bx, by = cx + radius * .72, cy + radius * .72
    d.ellipse((bx - badge, by - badge, bx + badge, by + badge), fill="#a9d8bc", outline="#1a4255", width=2)


def button(d, box, label, primary=False, size=14):
    fill = "#2b7180" if primary else "#f7fbfb"
    edge = "#2a6a79" if primary else "#cbdadd"
    color = "#f5fbfc" if primary else "#5f7a83"
    rounded(d, box, 7, fill, edge)
    x1, y1, x2, y2 = box
    text(d, ((x1 + x2) // 2, (y1 + y2) // 2), label, size, color, bold=True, anchor="mm")


def draw_entry():
    # Close-up presentation of the two controls, rather than a full-page crop.
    image = background().crop((850, 0, 1600, 250)).resize((1200, 400), Image.Resampling.LANCZOS)
    image = image.filter(ImageFilter.GaussianBlur(5))
    veil = Image.new("RGBA", image.size, (6, 26, 40, 120))
    image.paste(veil, (0, 0), veil)
    d = ImageDraw.Draw(image, "RGBA")
    shadow_card(image, (186, 124, 1014, 276), 23, "#15384a", "#668b992b")
    d = ImageDraw.Draw(image, "RGBA")
    buttons = [(210, 146, 560, 254), (580, 146, 990, 254)]
    for box in buttons:
        x1, y1, x2, y2 = box
        rounded(d, box, 15, "#31556a", "#a5d2dc65")
        d.line((x1 + 19, y1 + 1, x2 - 19, y1 + 1), fill="#c6f5f84f", width=1)
        d.line((x1 + 19, y2 - 1, x2 - 19, y2 - 1), fill="#001c2c60", width=1)
    rounded(d, (233, 169, 295, 231), 13, "#163c5055", "#d2f3f31f")
    book_icon(d, 245, 181, 38)
    text(d, (318, 200), "新手指南", 28, "#e5f4f6", bold=True, anchor="lm")
    user_mark(d, 634, 200, 32)
    text(d, (690, 186), "iridescent", 25, "#f1f8fa", bold=True, anchor="lm")
    text(d, (690, 221), "本机账号", 16, "#a8c7d1", anchor="lm")
    d.line((947, 195, 954, 202, 961, 195), fill="#b9d5dc", width=2)
    image.convert("RGB").save(OUT / "account-guide-entry.png", quality=96)


def draw_wind_turbine(d, ox, oy):
    # A clean engineering line drawing that remains legible at the exported size.
    horizon = oy + 200
    d.line((ox + 4, horizon, ox + 386, horizon), fill="#bfd5d7", width=2)
    for j in range(2):
        yy = horizon + 8 + j * 7
        d.arc((ox + 8, yy - 7, ox + 380, yy + 15), 5, 175, fill="#d1e0e2", width=1)
    hub = (ox + 168, oy + 67)
    d.line((hub[0], hub[1] + 3, ox + 171, oy + 142), fill="#6996a0", width=9)
    d.line((ox + 168, oy + 62, ox + 154, oy + 10), fill="#cadbdd", width=7)
    d.line((ox + 169, oy + 63, ox + 223, oy + 87), fill="#dce9ea", width=7)
    d.line((ox + 165, oy + 65, ox + 126, oy + 104), fill="#dce9ea", width=7)
    d.ellipse((hub[0] - 7, hub[1] - 7, hub[0] + 7, hub[1] + 7), fill="#f7fbfb", outline="#65939e", width=2)
    d.polygon([(ox + 100, oy + 143), (ox + 235, oy + 143), (ox + 213, oy + 165), (ox + 121, oy + 165)], fill="#e3eeee", outline="#769da5")
    # Three pontoons and their braces establish the semi-submersible silhouette.
    for x in (ox + 102, ox + 224):
        rounded(d, (x - 15, oy + 141, x + 15, oy + 198), 7, "#d5e4e5", "#719aa3", 2)
        d.line((x - 9, oy + 153, ox + 137 if x < ox + 150 else ox + 202, oy + 164), fill="#85aab1", width=3)
    rounded(d, (ox + 157, oy + 137, ox + 185, oy + 199), 6, "#d5e4e5", "#719aa3", 2)
    d.line((ox + 111, oy + 188, ox + 57, oy + 220), fill="#b18a58", width=2)
    d.line((ox + 236, oy + 188, ox + 290, oy + 220), fill="#b18a58", width=2)
    d.line((ox + 170, oy + 197, ox + 170, oy + 222), fill="#b18a58", width=2)
    for endx in (ox + 52, ox + 295, ox + 170):
        d.ellipse((endx - 3, oy + 218, endx + 3, oy + 224), fill="#b18a58")
    # Labels and leader lines.
    for start, end, label in [((ox + 206, oy + 57), (ox + 272, oy + 39), "风轮"), ((ox + 180, oy + 112), (ox + 272, oy + 112), "塔架"), ((ox + 234, oy + 159), (ox + 272, oy + 175), "浮式平台")]:
        d.line((start, end), fill="#8caeb5", width=1)
        d.ellipse((start[0] - 2, start[1] - 2, start[0] + 2, start[1] + 2), fill=TEAL)
        text(d, (end[0] + 7, end[1]), label, 12, "#64828b", anchor="lm")


def draw_guide():
    image = background(dark=True, blur=2)
    shadow_card(image, (140, 54, 1460, 846), 18, "#f9fbfb", "#c9dfe0")
    d = ImageDraw.Draw(image, "RGBA")
    # Header and compact progress marker.
    rounded(d, (184, 91, 218, 125), 9, "#e8f2f3", "#cbdfe1")
    book_icon(d, 190, 98, 22, "#3d8791")
    text(d, (231, 95), "新手指南", 20, "#365a66", bold=True)
    text(d, (231, 120), "GETTING STARTED", 10, "#75929a", mono=True)
    rounded(d, (1408, 91, 1444, 127), 18, "#eef4f5", "#d7e4e5")
    text(d, (1426, 108), "×", 23, "#718b94", anchor="mm")
    labels = ["01  认识模型", "02  配置工况", "03  运行仿真", "04  解读结果"]
    start, gap, width = 184, 14, 300
    for i, label in enumerate(labels):
        x = start + i * (width + gap)
        rounded(d, (x, 153, x + width, 158), 3, "#438b95" if i == 0 else "#dfe9ea")
        text(d, (x, 168), label, 11, "#397f8b" if i == 0 else "#92a6ad", bold=i == 0)

    # Main copy and steps.
    text(d, (184, 224), "01 / 04     ·     REFERENCE MODEL", 11, "#638f98", mono=True)
    text(d, (184, 254), "先认识固定参考模型", 34, "#203e4a", bold=True)
    text(d, (184, 309), "本项目围绕 NREL 5 MW / OC4 半潜式风机展开。", 18, "#66818a")
    text(d, (184, 339), "先理解风轮、平台与系泊之间的工程关系。", 18, "#66818a")

    rows = [
        (378, "01", "模型部件", "选择风轮、塔架或平台标记，查看对应结构说明。"),
        (465, "02", "工程机理", "在工程原理页查看耦合模块的输入与响应。"),
        (552, "03", "参数依据", "结构图用于理解组成，计算参数以官方输入为准。"),
    ]
    for y, number, title, desc in rows:
        rounded(d, (184, y, 905, y + 72), 9, "#ffffff", "#e0e9ea")
        rounded(d, (202, y + 19, 238, y + 55), 8, "#edf5f5")
        text(d, (220, y + 37), number, 12, "#4b8791", mono=True, bold=True, anchor="mm")
        text(d, (254, y + 13), title, 17, "#365760", bold=True)
        text(d, (254, y + 42), desc, 15, "#6c858e")
        text(d, (880, y + 36), "↗", 16, "#91b0b7", anchor="mm")
    text(d, (184, 655), "打开模型结构   ↗", 13, "#337986", bold=True)

    # Model reference panel with the line drawing as the visual focus.
    rounded(d, (942, 213, 1416, 702), 13, "#edf4f5", "#d9e6e7")
    text(d, (970, 237), "工程参考模型", 14, "#426670", bold=True)
    rounded(d, (1272, 232, 1389, 260), 14, "#f8fbfb", "#dbe7e8")
    text(d, (1330, 246), "OC4  /  SEMI-SUB", 9, "#698991", mono=True, anchor="mm")
    rounded(d, (970, 276, 1388, 526), 10, "#f7fbfb", "#dce8e9")
    draw_wind_turbine(d, 985, 278)
    text(d, (970, 547), "浮式海上风机", 18, "#2e515c", bold=True)
    text(d, (970, 578), "半潜式基础   ·   结构示意", 12, "#7b9299")
    rounded(d, (970, 618, 1166, 679), 8, "#fbfdfd", "#dae6e7")
    rounded(d, (1177, 618, 1388, 679), 8, "#fbfdfd", "#dae6e7")
    text(d, (985, 632), "REFERENCE TURBINE", 9, "#91a4a9", mono=True)
    text(d, (985, 656), "NREL 5 MW", 14, "#375e68", bold=True)
    text(d, (1192, 632), "FLOATING PLATFORM", 9, "#91a4a9", mono=True)
    text(d, (1192, 656), "OC4 半潜式", 14, "#375e68", bold=True)

    d.line((184, 741, 1416, 741), fill="#dce7e8", width=1)
    rounded(d, (187, 766, 203, 782), 3, "#428895", "#428895")
    d.line((190, 774, 194, 778, 200, 769), fill="#ffffff", width=2)
    text(d, (213, 774), "首次登录时显示指南", 14, "#7c9299", anchor="lm")
    button(d, (1152, 760, 1278, 807), "上一步", False, 13)
    button(d, (1292, 760, 1416, 807), "下一步  →", True, 13)
    image.convert("RGB").save(OUT / "account-guide-guide.png", quality=96)


def field(d, x, y, width, label, value, hint=False, height=45, readonly=False):
    text(d, (x, y), label, 14, "#5b7982", bold=True)
    fill = "#eef4f5" if readonly else "#fcfdfd"
    rounded(d, (x, y + 22, x + width, y + 22 + height), 7, fill, "#d2e0e2")
    text(d, (x + 13, y + 22 + height // 2), value, 16, "#7e979e" if hint or readonly else "#31535e", anchor="lm")


def draw_account():
    image = background(dark=True, blur=2)
    shadow_card(image, (224, 66, 1376, 834), 18, "#f9fbfb", "#c9dfe0")
    d = ImageDraw.Draw(image, "RGBA")
    rounded(d, (267, 103, 301, 137), 9, "#e8f2f3", "#cbdfe1")
    user_mark(d, 284, 120, 11, dark=False)
    text(d, (314, 103), "个人账号", 20, "#365a66", bold=True)
    text(d, (314, 128), "PERSONAL PROFILE", 10, "#75929a", mono=True)
    rounded(d, (1325, 101, 1360, 136), 18, "#eef4f5", "#d7e4e5")
    text(d, (1342, 118), "×", 23, "#718b94", anchor="mm")

    # Identity panel.
    rounded(d, (267, 171, 540, 780), 13, "#15394c", "#315c6b")
    d.line((287, 172, 520, 172), fill="#b9edf333", width=1)
    user_mark(d, 323, 244, 43)
    text(d, (287, 315), "iridescent", 22, "#eff8f9", bold=True)
    d.ellipse((288, 351, 295, 358), fill="#a8d7b9")
    text(d, (306, 354), "本机账号 · 已登录", 12, "#a4c7ce", anchor="lm")
    d.line((287, 391, 520, 391), fill="#75a5b344", width=1)
    text(d, (287, 415), "TIDEFLOW", 12, "#86aeb8", mono=True)
    text(d, (287, 446), "潮汐工作空间", 16, "#d9ebee", bold=True)
    text(d, (287, 493), "资料保存在本机工作空间中。", 14, "#a4c4cb")
    text(d, (287, 522), "头像与个人信息用于界面识别。", 14, "#a4c4cb")
    rounded(d, (287, 724, 393, 760), 7, "#ffffff0a", "#a2cad04d")
    text(d, (340, 742), "更换头像", 13, "#d3e7e9", anchor="mm")
    rounded(d, (402, 724, 496, 760), 7, "#ffffff0a", "#a2cad04d")
    text(d, (449, 742), "移除", 13, "#d3e7e9", anchor="mm")

    # Profile fields.
    x1, x2 = 585, 964
    text(d, (585, 175), "个人资料", 27, "#203e4a", bold=True)
    text(d, (585, 216), "更新你在潮汐工作空间中的身份信息。", 15, "#7a9299")
    field(d, x1, 260, 350, "昵称", "iridescent")
    field(d, x2, 260, 350, "账号 ID", "iridescent  ·  不可编辑", readonly=True)
    field(d, x1, 351, 350, "学校 / 单位", "填写学校或所在单位", hint=True)
    field(d, x2, 351, 350, "专业 / 研究方向", "填写专业或研究方向", hint=True)
    field(d, x1, 442, 729, "联系邮箱   ·  选填", "name@example.com", hint=True)
    text(d, (x1, 533), "个人简介", 14, "#5b7982", bold=True)
    rounded(d, (x1, 555, 1314, 642), 7, "#fcfdfd", "#d2e0e2")
    text(d, (x1 + 13, 573), "例如：关注海上风电与浮式平台动力学。", 16, "#9aadb2")
    # Calm privacy note.
    rounded(d, (x1, 663, 1314, 704), 5, "#eef5f5")
    d.rectangle((x1, 663, x1 + 3, 704), fill="#74aeb5")
    d.ellipse((x1 + 14, 678, x1 + 27, 691), outline="#65939e", width=1)
    text(d, (x1 + 20, 685), "i", 10, "#65939e", mono=True, anchor="mm")
    text(d, (x1 + 39, 684), "账号信息保存在本机；账号标识不可编辑。", 13, "#708991", anchor="lm")
    d.line((585, 729, 1314, 729), fill="#dce7e8", width=1)
    text(d, (585, 760), "退出登录", 12, "#a5786d", anchor="lm")
    button(d, (1177, 743, 1314, 790), "保存资料", True, 15)
    image.convert("RGB").save(OUT / "account-guide-profile.png", quality=96)


from PIL import ImageOps

draw_entry()
draw_guide()
draw_account()
print("Created: account-guide-entry.png, account-guide-guide.png, account-guide-profile.png")
