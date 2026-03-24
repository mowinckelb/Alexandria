"""Render Logic.md to Logic.pdf.

Objective function: make the investor feel the argument is airtight.
Form: formal proof — rigor, not pitch. White, not cream. EB Garamond, not Playfair.
Blue for assumptions. Grey for annotations. Bold for conclusions. Text breathes.
"""

import re
import shutil
from pathlib import Path
from fpdf import FPDF

FONT_DIR = Path(__file__).parent / ".font_cache"

# Colours
BLUE = (41, 98, 255)       # assumptions — the only things worth discussing
NEAR_BLACK = (26, 26, 26)  # body text, headers
GREY = (120, 115, 108)     # annotations — parenthetical, quiet
BLACK = (0, 0, 0)          # reset


class LogicPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("Garamond", "", str(FONT_DIR / "EBGaramond-Regular.ttf"))
        self.add_font("Garamond", "I", str(FONT_DIR / "EBGaramond-Italic.ttf"))
        self.add_font("Garamond", "B", str(FONT_DIR / "EBGaramond-Bold.ttf"))
        self.add_font("Garamond", "BI", str(FONT_DIR / "EBGaramond-BoldItalic.ttf"))

    def header(self):
        if self.page_no() == 1:
            self.ln(55)
            self.set_font("Garamond", "", 36)
            self.set_text_color(*NEAR_BLACK)
            self.cell(0, 14, "Logic", new_x="LMARGIN", new_y="NEXT", align="C")
            self.ln(2)
            self.set_font("Garamond", "", 16)
            self.set_text_color(*GREY)
            self.cell(0, 10, "Alexandria", new_x="LMARGIN", new_y="NEXT", align="C")
            self.ln(12)
            self.set_text_color(*NEAR_BLACK)

    def footer(self):
        self.set_y(-18)
        self.set_font("Garamond", "", 8.5)
        self.set_text_color(*GREY)
        self.cell(0, 10, str(self.page_no()), align="C")
        self.set_text_color(*NEAR_BLACK)


def render(source="files/confidential/Logic.md"):
    pdf = LogicPDF()
    pdf.set_auto_page_break(auto=True, margin=22)
    pdf.set_margins(32, 25, 32)
    pdf.add_page()

    with open(source, "r", encoding="utf-8") as f:
        lines = [l.rstrip("\n") for l in f.readlines()]

    i = 0

    # Skip to preamble
    while i < len(lines) and not lines[i].startswith("This document has two parts"):
        i += 1

    # Preamble paragraphs
    para = []
    while i < len(lines):
        line = lines[i].strip()
        if line == "---":
            i += 1
            break
        if line == "":
            if para:
                pdf.set_font("Garamond", "", 10.5)
                pdf.set_text_color(*NEAR_BLACK)
                pdf.multi_cell(0, 5.5, " ".join(para))
                pdf.ln(3)
                para = []
        else:
            para.append(line)
        i += 1
    if para:
        pdf.set_font("Garamond", "", 10.5)
        pdf.multi_cell(0, 5.5, " ".join(para))
        pdf.ln(3)
        para = []

    pdf.ln(4)

    # Process body
    while i < len(lines):
        line = lines[i].strip()
        i += 1

        if not line:
            continue

        if line == "---":
            pdf.ln(4)
            continue

        # Part titles — large, clear break
        if line.startswith("## Part 1") or line.startswith("## Part 2"):
            pdf.ln(8)
            pdf.set_font("Garamond", "", 18)
            pdf.set_text_color(*NEAR_BLACK)
            pdf.multi_cell(0, 8, line.replace("## ", ""))
            pdf.ln(4)
            continue

        # The Bet / The Defense
        if line.startswith("## The Bet") or line.startswith("## The Defense"):
            pdf.ln(8)
            pdf.set_font("Garamond", "", 16)
            pdf.set_text_color(*NEAR_BLACK)
            pdf.multi_cell(0, 8, line.replace("## ", ""))
            pdf.ln(4)
            continue

        # Section titles
        if line.startswith("### "):
            pdf.ln(6)
            pdf.set_font("Garamond", "B", 12)
            pdf.set_text_color(*NEAR_BLACK)
            pdf.multi_cell(0, 6.5, line.replace("### ", ""))
            pdf.ln(3)
            continue

        # Conclusion lines — bold, the theorems
        if re.match(r"^C\d+:", line):
            clean = line.replace("**", "")
            pdf.set_font("Garamond", "B", 10.5)
            pdf.set_text_color(*NEAR_BLACK)
            pdf.multi_cell(0, 5.5, clean)
            pdf.ln(2)
            continue

        # Annotation lines — quiet, parenthetical
        if line.startswith("(") and ("Settled" in line or "Assumption" in line or "Valid" in line):
            pdf.set_font("Garamond", "I", 9)
            pdf.set_text_color(*GREY)
            pdf.multi_cell(0, 4.8, line)
            pdf.set_text_color(*NEAR_BLACK)
            pdf.ln(3)
            continue

        # Premise lines — blue if assumption
        if re.match(r"^P\d+\.", line):
            j = i
            while j < len(lines) and not lines[j].strip():
                j += 1
            is_assumption = j < len(lines) and "Assumption" in lines[j]
            if is_assumption:
                pdf.set_text_color(*BLUE)
            else:
                pdf.set_text_color(*NEAR_BLACK)
            pdf.set_font("Garamond", "", 10.5)
            pdf.multi_cell(0, 5.5, line)
            pdf.set_text_color(*NEAR_BLACK)
            pdf.ln(1)
            continue

        # Defense headers — blue, the assumption being examined
        if line.startswith("**P") and line.endswith("**"):
            pdf.ln(5)
            pdf.set_font("Garamond", "B", 11)
            pdf.set_text_color(*BLUE)
            pdf.multi_cell(0, 6, line.replace("**", ""))
            pdf.set_text_color(*NEAR_BLACK)
            pdf.ln(2)
            continue

        # For/Against/Assessment
        if line.startswith("For:") or line.startswith("Against:") or line.startswith("Assessment:"):
            label, rest = line.split(":", 1)
            label += ":"
            rest = rest.strip()
            pdf.set_x(pdf.l_margin)
            if label == "Assessment:":
                pdf.set_font("Garamond", "I", 10.5)
                pdf.set_text_color(*GREY)
                pdf.multi_cell(0, 5.5, label + " " + rest)
                pdf.set_text_color(*NEAR_BLACK)
            else:
                pdf.set_font("Garamond", "", 10.5)
                pdf.set_text_color(*NEAR_BLACK)
                pdf.multi_cell(0, 5.5, label + " " + rest)
            pdf.ln(1.5)
            continue

        # Bullet points — blue assumption list
        if line.startswith("- "):
            pdf.set_font("Garamond", "", 10.5)
            pdf.set_text_color(*BLUE)
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin, 5.5, "  " + line)
            pdf.set_text_color(*NEAR_BLACK)
            continue

        # Contact line
        if "benjamin@mowinckel.com" in line:
            pdf.ln(12)
            pdf.set_font("Garamond", "", 10.5)
            pdf.set_text_color(*GREY)
            pdf.cell(0, 5, line, align="C")
            pdf.set_text_color(*NEAR_BLACK)
            continue

        # Default text
        pdf.set_font("Garamond", "", 10.5)
        pdf.set_text_color(*NEAR_BLACK)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5.5, line)
        pdf.ln(1)

    pdf.output("files/confidential/Logic.pdf")
    print("Logic.pdf written to files/confidential/")
    shutil.copy("files/confidential/Logic.pdf", "public/partners/Logic.pdf")
    print("Logic.pdf copied to public/partners/")


if __name__ == "__main__":
    import sys
    src = sys.argv[1] if len(sys.argv) > 1 else "files/confidential/Logic.md"
    render(src)
