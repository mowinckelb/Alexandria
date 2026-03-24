"""Render Logic.md to Logic.pdf with styled formatting.
Blue text for assumption premises. Bold for conclusions. Italic for annotations."""

import re
import shutil
from fpdf import FPDF


class LogicPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            self.set_font("Helvetica", "B", 28)
            self.cell(0, 15, "Logic", new_x="LMARGIN", new_y="NEXT", align="C")
            self.set_font("Helvetica", "", 18)
            self.cell(0, 10, "Alexandria", new_x="LMARGIN", new_y="NEXT", align="C")
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, str(self.page_no()), align="C")
        self.set_text_color(0, 0, 0)


def sanitize(text):
    """Replace Unicode chars that latin-1 can't handle."""
    replacements = {
        "\u2014": "--",   # em dash
        "\u2013": "-",    # en dash
        "\u2018": "'",    # left single quote
        "\u2019": "'",    # right single quote
        "\u201c": '"',    # left double quote
        "\u201d": '"',    # right double quote
        "\u2022": "-",    # bullet
        "\u2026": "...",  # ellipsis
        "\u20ac": "EUR",  # euro sign
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text


def render():
    pdf = LogicPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(25, 20, 25)
    pdf.add_page()

    with open("files/confidential/Logic.md", "r", encoding="utf-8") as f:
        lines = f.readlines()
    lines = [sanitize(l) for l in lines]

    lines = [l.rstrip("\n") for l in lines]
    i = 0

    # Skip to preamble
    while i < len(lines) and not lines[i].startswith("This document has two parts"):
        i += 1

    # Collect and render preamble paragraphs
    para = []
    while i < len(lines):
        line = lines[i].strip()
        if line == "---":
            i += 1
            break
        if line == "":
            if para:
                pdf.set_font("Helvetica", "", 10)
                pdf.multi_cell(0, 5, " ".join(para))
                pdf.ln(3)
                para = []
        else:
            para.append(line)
        i += 1
    if para:
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, " ".join(para))
        pdf.ln(3)
        para = []

    pdf.ln(3)

    # Process body
    while i < len(lines):
        line = lines[i].strip()
        i += 1

        if not line:
            continue

        if line == "---":
            pdf.ln(3)
            continue

        # Part titles
        if line.startswith("## Part 1") or line.startswith("## Part 2"):
            pdf.ln(5)
            pdf.set_font("Helvetica", "B", 16)
            pdf.multi_cell(0, 7, line.replace("## ", ""))
            pdf.ln(3)
            continue

        # The Bet / The Defense
        if line.startswith("## The Bet") or line.startswith("## The Defense"):
            pdf.ln(5)
            pdf.set_font("Helvetica", "B", 14)
            pdf.multi_cell(0, 7, line.replace("## ", ""))
            pdf.ln(3)
            continue

        # Section titles
        if line.startswith("### "):
            pdf.ln(4)
            pdf.set_font("Helvetica", "B", 12)
            pdf.multi_cell(0, 6, line.replace("### ", ""))
            pdf.ln(2)
            continue

        # Conclusion lines (contain ** bold **)
        if re.match(r"^C\d+:", line):
            clean = line.replace("**", "")
            pdf.set_font("Helvetica", "B", 10)
            pdf.multi_cell(0, 5, clean)
            pdf.ln(2)
            continue

        # Annotation lines
        if line.startswith("(") and ("Settled" in line or "Assumption" in line or "Valid" in line):
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(100, 100, 100)
            pdf.multi_cell(0, 4.5, line)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)
            continue

        # Premise lines
        if re.match(r"^P\d+\.", line):
            # Look ahead for assumption annotation
            j = i
            while j < len(lines) and not lines[j].strip():
                j += 1
            is_assumption = j < len(lines) and "Assumption" in lines[j]
            if is_assumption:
                pdf.set_text_color(41, 98, 255)
            pdf.set_font("Helvetica", "", 10)
            pdf.multi_cell(0, 5, line)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(1)
            continue

        # Defense headers
        if line.startswith("**P") and line.endswith("**"):
            pdf.ln(3)
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(41, 98, 255)
            pdf.multi_cell(0, 6, line.replace("**", ""))
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)
            continue

        # For/Against/Assessment
        if line.startswith("For:") or line.startswith("Against:") or line.startswith("Assessment:"):
            label, rest = line.split(":", 1)
            label += ":"
            rest = rest.strip()
            pdf.set_x(pdf.l_margin)
            if label == "Assessment:":
                pdf.set_font("Helvetica", "I", 10)
                pdf.multi_cell(0, 5, label + " " + rest)
            else:
                pdf.set_font("Helvetica", "", 10)
                pdf.multi_cell(0, 5, label + " " + rest)
            pdf.ln(1)
            continue

        # Bullet points (assumption list in The Bet)
        if line.startswith("- "):
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(41, 98, 255)
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin, 5, "  " + line)
            pdf.set_text_color(0, 0, 0)
            continue

        # Contact line
        if "benjamin@mowinckel.com" in line:
            pdf.ln(10)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 5, line, align="C")
            continue

        # Default text
        pdf.set_font("Helvetica", "", 10)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5, line)
        pdf.ln(1)

    pdf.output("files/confidential/Logic.pdf")
    print("Logic.pdf written to files/confidential/")
    shutil.copy("files/confidential/Logic.pdf", "public/partners/Logic.pdf")
    print("Logic.pdf copied to public/partners/")


if __name__ == "__main__":
    render()
