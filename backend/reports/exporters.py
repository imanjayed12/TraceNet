import csv
import io
import json
import re
from html import escape
from pathlib import Path

import reportlab
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from django.utils.text import slugify
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import (
    ParagraphStyle,
    getSampleStyleSheet,
)
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.platypus import (
    LongTable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import Report


BRAND_NAVY = colors.HexColor("#0B3A53")
BRAND_BLUE = colors.HexColor("#155E75")
BRAND_TEAL = colors.HexColor("#0F8A83")
PALE_BLUE = colors.HexColor("#F3F7FA")
TEXT_DARK = colors.HexColor("#172033")
TEXT_MUTED = colors.HexColor("#60738F")
BORDER = colors.HexColor("#D7E1EA")

FONT_REGULAR = "TraceNetSans"
FONT_BOLD = "TraceNetSans-Bold"


def _register_pdf_fonts():
    registered_fonts = (
        pdfmetrics.getRegisteredFontNames()
    )

    if (
        FONT_REGULAR in registered_fonts
        and FONT_BOLD in registered_fonts
    ):
        return

    font_directory = (
        Path(reportlab.__file__).resolve().parent
        / "fonts"
    )

    regular_font_path = (
        font_directory / "Vera.ttf"
    )
    bold_font_path = (
        font_directory / "VeraBd.ttf"
    )

    if not regular_font_path.exists():
        raise FileNotFoundError(
            f"PDF font not found: {regular_font_path}"
        )

    if not bold_font_path.exists():
        raise FileNotFoundError(
            f"PDF font not found: {bold_font_path}"
        )

    pdfmetrics.registerFont(
        TTFont(
            FONT_REGULAR,
            str(regular_font_path),
        )
    )

    pdfmetrics.registerFont(
        TTFont(
            FONT_BOLD,
            str(bold_font_path),
        )
    )

    pdfmetrics.registerFontFamily(
        "TraceNetSansFamily",
        normal=FONT_REGULAR,
        bold=FONT_BOLD,
        italic=FONT_REGULAR,
        boldItalic=FONT_BOLD,
    )


def flatten_summary(value, prefix=""):
    rows = []

    if isinstance(value, dict):
        if not value:
            rows.append(
                (
                    prefix,
                    "No records",
                )
            )
            return rows

        for key, item in value.items():
            label = (
                f"{prefix}.{key}"
                if prefix
                else str(key)
            )

            rows.extend(
                flatten_summary(
                    item,
                    label,
                )
            )

        return rows

    if isinstance(value, list):
        if not value:
            rows.append(
                (
                    prefix,
                    "No records",
                )
            )
            return rows

        for index, item in enumerate(
            value,
            start=1,
        ):
            label = (
                f"{prefix}[{index}]"
            )

            rows.extend(
                flatten_summary(
                    item,
                    label,
                )
            )

        return rows

    if isinstance(value, bool):
        display_value = (
            "Yes" if value else "No"
        )
    elif value is None:
        display_value = "Not recorded"
    else:
        display_value = str(value)

    rows.append(
        (
            prefix,
            display_value,
        )
    )

    return rows


def humanize_label(value):
    if not value:
        return "Summary"

    text = str(value)

    text = text.replace(
        "__",
        " ",
    )

    text = re.sub(
        r"\[(\d+)\]",
        r" / Item \1",
        text,
    )

    text = text.replace(
        ".",
        " / ",
    )

    text = text.replace(
        "_",
        " ",
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    ).strip()

    return text.title()


def safe_filename(report, extension):
    base_name = (
        slugify(report.title)
        or f"report-{report.pk}"
    )

    return (
        f"{base_name}-{report.pk}."
        f"{extension}"
    )


def build_json_export(report):
    payload = {
        "id": report.pk,
        "title": report.title,
        "report_type": report.report_type,
        "status": report.status,
        "date_from": report.date_from,
        "date_to": report.date_to,
        "generated_by": (
            report.generated_by.email
            if report.generated_by
            else ""
        ),
        "generated_at": report.generated_at,
        "summary": report.summary,
    }

    content = json.dumps(
        payload,
        cls=DjangoJSONEncoder,
        ensure_ascii=False,
        indent=2,
    ).encode("utf-8")

    return (
        content,
        "application/json",
        safe_filename(
            report,
            "json",
        ),
    )


def build_csv_export(report):
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        (
            "TraceNet Report",
            report.title,
        )
    )

    writer.writerow(
        (
            "Report Type",
            report.get_report_type_display(),
        )
    )

    writer.writerow(
        (
            "Generated At",
            report.generated_at or "",
        )
    )

    writer.writerow(())

    writer.writerow(
        (
            "Metric",
            "Value",
        )
    )

    for metric, value in flatten_summary(
        report.summary,
    ):
        writer.writerow(
            (
                humanize_label(metric),
                value,
            )
        )

    content = output.getvalue().encode(
        "utf-8-sig",
    )

    return (
        content,
        "text/csv; charset=utf-8",
        safe_filename(
            report,
            "csv",
        ),
    )


def _format_generated_at(value):
    if not value:
        return "Not available"

    try:
        if timezone.is_aware(value):
            value = timezone.localtime(
                value
            )

        return value.strftime(
            "%d %b %Y, %I:%M %p"
        )
    except (
        AttributeError,
        ValueError,
    ):
        return str(value)


def _format_date_range(report):
    if (
        report.date_from
        and report.date_to
    ):
        return (
            f"{report.date_from.strftime('%d %b %Y')}"
            " - "
            f"{report.date_to.strftime('%d %b %Y')}"
        )

    if report.date_from:
        return (
            "From "
            f"{report.date_from.strftime('%d %b %Y')}"
        )

    if report.date_to:
        return (
            "Up to "
            f"{report.date_to.strftime('%d %b %Y')}"
        )

    return (
        "All available authorized data"
    )


def _build_pdf_styles():
    base = getSampleStyleSheet()

    return {
        "title": ParagraphStyle(
            "TraceNetTitle",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=22,
            leading=27,
            textColor=BRAND_NAVY,
            alignment=TA_LEFT,
            spaceAfter=5 * mm,
        ),
        "eyebrow": ParagraphStyle(
            "TraceNetEyebrow",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=10,
            textColor=BRAND_TEAL,
            spaceAfter=2 * mm,
        ),
        "meta_label": ParagraphStyle(
            "TraceNetMetaLabel",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=10,
            textColor=TEXT_MUTED,
        ),
        "meta_value": ParagraphStyle(
            "TraceNetMetaValue",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=9,
            leading=12,
            textColor=TEXT_DARK,
        ),
        "section": ParagraphStyle(
            "TraceNetSection",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=12,
            leading=15,
            textColor=BRAND_NAVY,
            spaceBefore=4 * mm,
            spaceAfter=2.5 * mm,
        ),
        "table_header": ParagraphStyle(
            "TraceNetTableHeader",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=10,
            textColor=colors.white,
        ),
        "metric": ParagraphStyle(
            "TraceNetMetric",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8.5,
            leading=11,
            textColor=TEXT_MUTED,
            wordWrap="LTR",
        ),
        "value": ParagraphStyle(
            "TraceNetValue",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8.5,
            leading=11,
            textColor=TEXT_DARK,
            wordWrap="LTR",
        ),
    }


def _draw_page_chrome(
    canvas,
    page_number,
):
    canvas.saveState()

    width, height = A4

    canvas.setFillColor(
        BRAND_NAVY
    )

    canvas.rect(
        0,
        height - 14 * mm,
        width,
        14 * mm,
        fill=1,
        stroke=0,
    )

    canvas.setFillColor(
        colors.white
    )

    canvas.setFont(
        FONT_BOLD,
        11,
    )

    canvas.drawString(
        15 * mm,
        height - 9 * mm,
        "TraceNet",
    )

    canvas.setFont(
        FONT_REGULAR,
        7.5,
    )

    canvas.drawRightString(
        width - 15 * mm,
        height - 9 * mm,
        "INTELLIGENCE & RESPONSE",
    )

    canvas.setStrokeColor(
        BORDER
    )

    canvas.setLineWidth(
        0.5
    )

    canvas.line(
        15 * mm,
        13 * mm,
        width - 15 * mm,
        13 * mm,
    )

    canvas.setFillColor(
        TEXT_MUTED
    )

    canvas.setFont(
        FONT_REGULAR,
        7.5,
    )

    canvas.drawString(
        15 * mm,
        8 * mm,
        (
            "Confidential - Authorized "
            "TraceNet use only"
        ),
    )

    canvas.drawRightString(
        width - 15 * mm,
        8 * mm,
        f"Page {page_number}",
    )

    canvas.restoreState()


class TraceNetPdfCanvas(
    pdf_canvas.Canvas,
):
    """
    Draw the TraceNet header and footer
    reliably on every generated PDF page.
    """

    def __init__(
        self,
        *args,
        **kwargs,
    ):
        super().__init__(
            *args,
            **kwargs,
        )

        self._tracenet_page_states = []

    def _capture_page_state(self):
        return {
            key: value
            for key, value
            in self.__dict__.items()
            if key
            != "_tracenet_page_states"
        }

    def showPage(self):
        page_state = (
            self._capture_page_state()
        )

        self._tracenet_page_states.append(
            page_state
        )

        self._startPage()

    def save(self):
        for page_state in (
            self._tracenet_page_states
        ):
            self.__dict__.update(
                page_state
            )

            _draw_page_chrome(
                self,
                self._pageNumber,
            )

            pdf_canvas.Canvas.showPage(
                self
            )

        pdf_canvas.Canvas.save(
            self
        )


def _build_metadata_table(
    report,
    styles,
):
    generated_by = (
        report.generated_by.full_name
        if report.generated_by
        else "TraceNet system"
    )

    metadata = [
        (
            "REPORT TYPE",
            report.get_report_type_display(),
            "OUTPUT FORMAT",
            report.get_output_format_display(),
        ),
        (
            "GENERATED BY",
            generated_by,
            "GENERATED AT",
            _format_generated_at(
                report.generated_at
            ),
        ),
        (
            "REPORTING PERIOD",
            _format_date_range(report),
            "STATUS",
            report.get_status_display(),
        ),
    ]

    rows = []

    for (
        left_label,
        left_value,
        right_label,
        right_value,
    ) in metadata:
        rows.append(
            (
                Paragraph(
                    left_label,
                    styles["meta_label"],
                ),
                Paragraph(
                    escape(
                        str(left_value)
                    ),
                    styles["meta_value"],
                ),
                Paragraph(
                    right_label,
                    styles["meta_label"],
                ),
                Paragraph(
                    escape(
                        str(right_value)
                    ),
                    styles["meta_value"],
                ),
            )
        )

    table = Table(
        rows,
        colWidths=(
            30 * mm,
            55 * mm,
            30 * mm,
            55 * mm,
        ),
        hAlign="LEFT",
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, -1),
                    PALE_BLUE,
                ),
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.6,
                    BORDER,
                ),
                (
                    "INNERGRID",
                    (0, 0),
                    (-1, -1),
                    0.35,
                    BORDER,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
            ]
        )
    )

    return table


def _build_section_table(
    section_value,
    styles,
):
    table_data = [
        (
            Paragraph(
                "METRIC",
                styles["table_header"],
            ),
            Paragraph(
                "VALUE",
                styles["table_header"],
            ),
        )
    ]

    for metric, value in flatten_summary(
        section_value,
    ):
        table_data.append(
            (
                Paragraph(
                    escape(
                        humanize_label(
                            metric
                        )
                    ),
                    styles["metric"],
                ),
                Paragraph(
                    escape(
                        str(value)
                    ),
                    styles["value"],
                ),
            )
        )

    table = LongTable(
        table_data,
        colWidths=(
            112 * mm,
            58 * mm,
        ),
        repeatRows=1,
        splitByRow=1,
        splitInRow=0,
        hAlign="LEFT",
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    BRAND_BLUE,
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.6,
                    BORDER,
                ),
                (
                    "INNERGRID",
                    (0, 0),
                    (-1, -1),
                    0.35,
                    BORDER,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    (
                        colors.white,
                        PALE_BLUE,
                    ),
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, 0),
                    5,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, 0),
                    5,
                ),
                (
                    "TOPPADDING",
                    (0, 1),
                    (-1, -1),
                    4,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 1),
                    (-1, -1),
                    4,
                ),
            ]
        )
    )

    return table


def build_pdf_export(report):
    output = io.BytesIO()

    _register_pdf_fonts()

    styles = _build_pdf_styles()

    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=25 * mm,
        bottomMargin=18 * mm,
        title=report.title,
        author="TraceNet",
        subject=(
            report.get_report_type_display()
        ),
    )

    story = [
        Paragraph(
            "SECURE ANALYTICS REPORT",
            styles["eyebrow"],
        ),
        Paragraph(
            escape(
                report.title
            ),
            styles["title"],
        ),
        _build_metadata_table(
            report,
            styles,
        ),
        Spacer(
            1,
            4 * mm,
        ),
    ]

    summary = (
        report.summary or {}
    )

    if (
        isinstance(summary, dict)
        and summary
    ):
        summary_sections = list(
            summary.items()
        )

        for index, (
            section_name,
            section_value,
        ) in enumerate(
            summary_sections
        ):
            story.append(
                Paragraph(
                    escape(
                        humanize_label(
                            section_name
                        )
                    ),
                    styles["section"],
                )
            )

            story.append(
                _build_section_table(
                    section_value,
                    styles,
                )
            )

            if index < (
                len(summary_sections) - 1
            ):
                story.append(
                    Spacer(
                        1,
                        2 * mm,
                    )
                )
    else:
        story.append(
            Paragraph(
                (
                    "No analytical summary data "
                    "is available for this report."
                ),
                styles["meta_value"],
            )
        )

    document.build(
        story,
        canvasmaker=TraceNetPdfCanvas,
    )

    return (
        output.getvalue(),
        "application/pdf",
        safe_filename(
            report,
            "pdf",
        ),
    )


def build_report_export(report):
    if (
        report.output_format
        == Report.OutputFormat.CSV
    ):
        return build_csv_export(
            report
        )

    if (
        report.output_format
        == Report.OutputFormat.PDF
    ):
        return build_pdf_export(
            report
        )

    return build_json_export(
        report
    )