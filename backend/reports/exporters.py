import csv
import io
import json

from django.core.serializers.json import DjangoJSONEncoder
from django.utils.text import slugify
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import Report


def flatten_summary(value, prefix=""):
    rows = []

    if isinstance(value, dict):
        for key, item in value.items():
            label = (
                f"{prefix}.{key}"
                if prefix
                else str(key)
            )
            rows.extend(
                flatten_summary(item, label)
            )

        return rows

    if isinstance(value, list):
        if not value:
            rows.append((prefix, "[]"))
            return rows

        for index, item in enumerate(value, start=1):
            label = f"{prefix}[{index}]"
            rows.extend(
                flatten_summary(item, label)
            )

        return rows

    rows.append(
        (
            prefix,
            "" if value is None else str(value),
        )
    )
    return rows


def safe_filename(report, extension):
    base_name = slugify(report.title) or f"report-{report.pk}"
    return f"{base_name}-{report.pk}.{extension}"


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
        safe_filename(report, "json"),
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
                metric,
                value,
            )
        )

    content = output.getvalue().encode(
        "utf-8-sig",
    )

    return (
        content,
        "text/csv; charset=utf-8",
        safe_filename(report, "csv"),
    )


def build_pdf_export(report):
    output = io.BytesIO()
    styles = getSampleStyleSheet()

    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title=report.title,
        author="TraceNet",
    )

    story = [
        Paragraph(
            "TraceNet Analytics Report",
            styles["Title"],
        ),
        Spacer(1, 6),
        Paragraph(
            report.title,
            styles["Heading2"],
        ),
        Spacer(1, 8),
        Paragraph(
            (
                f"<b>Report type:</b> "
                f"{report.get_report_type_display()}"
            ),
            styles["BodyText"],
        ),
        Paragraph(
            (
                f"<b>Generated at:</b> "
                f"{report.generated_at or 'Not available'}"
            ),
            styles["BodyText"],
        ),
        Paragraph(
            (
                f"<b>Date range:</b> "
                f"{report.date_from or 'All'} to "
                f"{report.date_to or 'All'}"
            ),
            styles["BodyText"],
        ),
        Spacer(1, 12),
    ]

    table_data = [
        (
            Paragraph(
                "<b>Metric</b>",
                styles["BodyText"],
            ),
            Paragraph(
                "<b>Value</b>",
                styles["BodyText"],
            ),
        )
    ]

    for metric, value in flatten_summary(
        report.summary,
    ):
        table_data.append(
            (
                Paragraph(
                    str(metric),
                    styles["BodyText"],
                ),
                Paragraph(
                    str(value),
                    styles["BodyText"],
                ),
            )
        )

    table = Table(
        table_data,
        colWidths=(
            85 * mm,
            85 * mm,
        ),
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#1F4E78"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor("#B7C9D6"),
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
                        colors.HexColor("#F3F7FA"),
                    ),
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(table)
    document.build(story)

    return (
        output.getvalue(),
        "application/pdf",
        safe_filename(report, "pdf"),
    )


def build_report_export(report):
    if report.output_format == Report.OutputFormat.CSV:
        return build_csv_export(report)

    if report.output_format == Report.OutputFormat.PDF:
        return build_pdf_export(report)

    return build_json_export(report)