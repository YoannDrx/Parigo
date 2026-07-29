#!/usr/bin/env python3
"""Generate the issue-focused Harvest integration audit PDF from versioned sources."""

from __future__ import annotations

import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = ROOT / "docs/harvest/audit-integration-2026-07-29.md"
OUTPUT_PATH = ROOT / "output/pdf/audit-integration-harvest-2026-07-29.pdf"

PAGE_SIZE = landscape(A4)
PAGE_WIDTH, PAGE_HEIGHT = PAGE_SIZE
MARGIN_X = 18 * mm
MARGIN_TOP = 17 * mm
MARGIN_BOTTOM = 18 * mm
CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X

INK = colors.HexColor("#11151C")
MUTED = colors.HexColor("#5D6673")
PAPER = colors.HexColor("#F5F4EE")
WHITE = colors.white
LIME = colors.HexColor("#C9F23A")
GREEN = colors.HexColor("#236B4E")
PALE_GREEN = colors.HexColor("#E8F2E8")
PALE_YELLOW = colors.HexColor("#FFF5CF")
PALE_RED = colors.HexColor("#FCE8E5")
LINE = colors.HexColor("#D7D8D1")


def register_fonts() -> tuple[str, str, str]:
    regular = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    bold = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
    italic = Path("/System/Library/Fonts/Supplemental/Arial Italic.ttf")
    if regular.exists() and bold.exists() and italic.exists():
        pdfmetrics.registerFont(TTFont("ParigoSans", str(regular)))
        pdfmetrics.registerFont(TTFont("ParigoSans-Bold", str(bold)))
        pdfmetrics.registerFont(TTFont("ParigoSans-Italic", str(italic)))
        return "ParigoSans", "ParigoSans-Bold", "ParigoSans-Italic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


FONT, FONT_BOLD, FONT_ITALIC = register_fonts()


class AuditCanvas(canvas.Canvas):
    """Canvas with a restrained header/footer and total page count."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict] = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_chrome(page_count)
            super().showPage()
        super().save()

    def _draw_chrome(self, page_count: int):
        page_number = self._pageNumber
        if page_number == 1:
            return
        self.saveState()
        self.setStrokeColor(LINE)
        self.setLineWidth(0.4)
        self.line(MARGIN_X, 12 * mm, PAGE_WIDTH - MARGIN_X, 12 * mm)
        self.setFont(FONT, 7.2)
        self.setFillColor(MUTED)
        self.drawString(MARGIN_X, 7.2 * mm, "PARIGO MUSIC · AUDIT HARVEST · 29 JUILLET 2026")
        self.drawRightString(
            PAGE_WIDTH - MARGIN_X,
            7.2 * mm,
            f"{page_number} / {page_count}",
        )
        self.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="AuditBody",
    parent=styles["BodyText"],
    fontName=FONT,
    fontSize=8.5,
    leading=11.5,
    textColor=INK,
    spaceAfter=4.5,
))
styles.add(ParagraphStyle(
    name="AuditH1",
    parent=styles["Heading1"],
    fontName=FONT_BOLD,
    fontSize=20,
    leading=23,
    textColor=INK,
    spaceBefore=9,
    spaceAfter=8,
    keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="AuditH2",
    parent=styles["Heading2"],
    fontName=FONT_BOLD,
    fontSize=14,
    leading=17,
    textColor=GREEN,
    spaceBefore=10,
    spaceAfter=5,
    keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="AuditH3",
    parent=styles["Heading3"],
    fontName=FONT_BOLD,
    fontSize=10.5,
    leading=13,
    textColor=INK,
    spaceBefore=7,
    spaceAfter=4,
    keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="AuditBullet",
    parent=styles["AuditBody"],
    leftIndent=10,
    firstLineIndent=-6,
    bulletIndent=2,
    spaceAfter=2.5,
))
styles.add(ParagraphStyle(
    name="AuditQuote",
    parent=styles["AuditBody"],
    leftIndent=10,
    rightIndent=8,
    borderColor=GREEN,
    borderWidth=1.2,
    borderPadding=(5, 8, 5, 10),
    backColor=PALE_GREEN,
    spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="AuditSmall",
    parent=styles["AuditBody"],
    fontSize=7.2,
    leading=9.2,
))
styles.add(ParagraphStyle(
    name="MatrixTitle",
    parent=styles["AuditH3"],
    fontSize=9,
    leading=11,
    textColor=GREEN,
    spaceBefore=4,
    spaceAfter=3,
))


def inline_markup(text: str) -> str:
    text = escape(text.strip())
    text = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        r"<link href='\2' color='#236B4E'><u>\1</u></link>",
        text,
    )
    text = re.sub(r"`([^`]+)`", r"<font name='ParigoSans-Bold'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", text)
    return text.replace(" → ", " &#8594; ")


def paragraph(text: str, style: str = "AuditBody") -> Paragraph:
    return Paragraph(inline_markup(text), styles[style])


def parse_markdown_table(lines: list[str]) -> Table:
    rows: list[list[str]] = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", cell or "") for cell in cells):
            continue
        rows.append(cells)
    columns = max(len(row) for row in rows)
    rows = [row + [""] * (columns - len(row)) for row in rows]
    total_chars = [
        max(8, min(36, max(len(row[index]) for row in rows)))
        for index in range(columns)
    ]
    char_sum = sum(total_chars)
    widths = [CONTENT_WIDTH * count / char_sum for count in total_chars]
    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["AuditSmall"],
        fontSize=6.7 if columns > 5 else 7.4,
        leading=8.4 if columns > 5 else 9.2,
    )
    header_style = ParagraphStyle(
        "TableHeader",
        parent=cell_style,
        fontName=FONT_BOLD,
        textColor=WHITE,
    )
    table_data = [
        [Paragraph(inline_markup(cell), header_style if row_index == 0 else cell_style) for cell in row]
        for row_index, row in enumerate(rows)
    ]
    table = Table(table_data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 1), (-1, -1), WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PAPER]),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def markdown_to_flowables(markdown: str):
    lines = markdown.splitlines()
    story = []
    index = 0
    in_code = False
    code_lines: list[str] = []
    quote_lines: list[str] = []

    while index < len(lines):
        raw = lines[index]
        stripped = raw.strip()

        if stripped.startswith("```"):
            if in_code:
                code_style = ParagraphStyle(
                    "Code",
                    fontName="Courier",
                    fontSize=6.8,
                    leading=8.5,
                    leftIndent=7,
                    rightIndent=7,
                    borderColor=LINE,
                    borderWidth=0.5,
                    borderPadding=6,
                    backColor=PAPER,
                    textColor=INK,
                )
                story.append(Preformatted("\n".join(code_lines), code_style))
                story.append(Spacer(1, 4))
                code_lines = []
                in_code = False
            else:
                in_code = True
            index += 1
            continue
        if stripped == "<!-- PAGEBREAK -->":
            story.append(PageBreak())
            index += 1
            continue
        if in_code:
            code_lines.append(raw)
            index += 1
            continue

        if stripped.startswith("|"):
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            if len(table_lines) >= 2:
                story.append(parse_markdown_table(table_lines))
                story.append(Spacer(1, 6))
            continue

        if stripped.startswith(">"):
            quote_lines.append(stripped[1:].strip())
            next_is_quote = index + 1 < len(lines) and lines[index + 1].strip().startswith(">")
            if not next_is_quote:
                story.append(Paragraph("<br/>".join(inline_markup(line) for line in quote_lines), styles["AuditQuote"]))
                quote_lines = []
            index += 1
            continue

        if stripped.startswith("# "):
            # The title is represented by the dedicated cover.
            index += 1
            continue
        if stripped.startswith("## "):
            story.append(Paragraph(inline_markup(stripped[3:]), styles["AuditH1"]))
        elif stripped.startswith("### "):
            story.append(Paragraph(inline_markup(stripped[4:]), styles["AuditH2"]))
        elif stripped.startswith("#### "):
            story.append(Paragraph(inline_markup(stripped[5:]), styles["AuditH3"]))
        elif re.match(r"^[-*] ", stripped):
            story.append(Paragraph(inline_markup(stripped[2:]), styles["AuditBullet"], bulletText="•"))
        elif re.match(r"^\d+\. ", stripped):
            number, text = stripped.split(". ", 1)
            story.append(Paragraph(inline_markup(text), styles["AuditBullet"], bulletText=f"{number}."))
        elif stripped == "---":
            story.append(HRFlowable(width="100%", thickness=0.5, color=LINE, spaceBefore=4, spaceAfter=7))
        elif stripped:
            story.append(paragraph(stripped))
        index += 1
    return story


def cover_flowables():
    title_style = ParagraphStyle(
        "CoverTitle",
        fontName=FONT_BOLD,
        fontSize=31,
        leading=34,
        textColor=WHITE,
        alignment=TA_LEFT,
        spaceAfter=10,
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        fontName=FONT,
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#D8E0E7"),
        alignment=TA_LEFT,
    )
    kicker_style = ParagraphStyle(
        "CoverKicker",
        fontName=FONT_BOLD,
        fontSize=9,
        leading=11,
        textColor=LIME,
        spaceAfter=9,
    )
    metric_style = ParagraphStyle(
        "Metric",
        fontName=FONT_BOLD,
        fontSize=12,
        leading=14,
        textColor=INK,
        alignment=TA_CENTER,
    )
    return [
        Spacer(1, 18 * mm),
        Paragraph("PARIGO MUSIC · RAPPORT TECHNIQUE", kicker_style),
        Paragraph("Audit ciblé de<br/>l’intégration Harvest", title_style),
        Paragraph(
            "Incohérences reproductibles, contrats à clarifier, corrections Parigo "
            "et capacités produit à confirmer.",
            subtitle_style,
        ),
        Spacer(1, 16 * mm),
        Table(
            [[
                Paragraph("255<br/><font size='7'>endpoints classés</font>", metric_style),
                Paragraph("75<br/><font size='7'>handlers BFF audités</font>", metric_style),
                Paragraph("5<br/><font size='7'>écarts ciblés restants</font>", metric_style),
                Paragraph("0<br/><font size='7'>ressource de test restante</font>", metric_style),
            ]],
            colWidths=[CONTENT_WIDTH / 4] * 4,
            rowHeights=[23 * mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), LIME),
                ("BOX", (0, 0), (-1, -1), 0.8, LIME),
                ("INNERGRID", (0, 0), (-1, -1), 0.8, INK),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]),
        ),
        Spacer(1, 14 * mm),
        Paragraph(
            "<b>Conclusion principale</b><br/>Les credentials actuels ne sont pas globalement "
            "en lecture seule. Playlists, tags, favoris, recherches, cue sheets et téléchargements "
            "fonctionnent. Les défauts Parigo identifiés — dont la date erronée des téléchargements — "
            "ont été corrigés et ne sont pas remontés à Harvest. Les questions restantes sont limitées "
            "à cinq écarts reproductibles et à des capacités produit ciblées.",
            ParagraphStyle(
                "CoverConclusion",
                parent=styles["AuditBody"],
                fontSize=10,
                leading=14,
                textColor=WHITE,
                borderColor=LIME,
                borderWidth=1,
                borderPadding=9,
                backColor=colors.HexColor("#1B232D"),
            ),
        ),
        Spacer(1, 9 * mm),
        Paragraph("29 juillet 2026 · Compte Anthlogan · Données sensibles expurgées", subtitle_style),
        PageBreak(),
    ]


def first_page(canvas_obj: canvas.Canvas, _doc):
    canvas_obj.saveState()
    canvas_obj.setFillColor(INK)
    canvas_obj.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
    canvas_obj.setFillColor(LIME)
    canvas_obj.rect(0, PAGE_HEIGHT - 7 * mm, PAGE_WIDTH, 7 * mm, stroke=0, fill=1)
    canvas_obj.restoreState()


def later_pages(canvas_obj: canvas.Canvas, _doc):
    canvas_obj.saveState()
    canvas_obj.setFillColor(colors.HexColor("#FBFAF6"))
    canvas_obj.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
    canvas_obj.restoreState()


def main():
    markdown = REPORT_PATH.read_text(encoding="utf-8")
    story = cover_flowables()
    story.extend(markdown_to_flowables(markdown))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=PAGE_SIZE,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="Audit ciblé de l’intégration Harvest",
        author="Parigo Music",
        subject="Incohérences reproductibles, contrats à clarifier et capacités produit",
        creator="Codex pour Parigo Music",
    )
    doc.build(
        story,
        canvasmaker=AuditCanvas,
        onFirstPage=first_page,
        onLaterPages=later_pages,
    )
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
