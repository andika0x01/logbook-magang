import { toWIB } from "./date-utils";

interface TargetUser {
  id: string;
  name: string;
  email: string;
}

interface LogEntry {
  date: string;
  content: string | null;
  media_url: string | null;
  editor_name: string;
}

export async function exportToPDF(
  targetUser: TargetUser,
  logs: LogEntry[],
  holidays: Record<string, string>
) {
  if (typeof window === "undefined") return;

  // Dynamically import jsPDF to avoid SSR issues on Cloudflare Workers
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let y = 20;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = 20;
      writeHeaderSmall();
    }
  }

  function writeHeaderSmall() {
    doc.setFont("Courier", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `PILOT TELEMETRY DUMP: ${targetUser.name.toUpperCase()} | PAGE ${doc.getCurrentPageInfo().pageNumber}`,
      margin,
      10
    );
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 12, pageWidth - margin, 12);
  }

  // Set initial font
  doc.setFont("Courier", "normal");
  doc.setTextColor(0, 0, 0);

  // Document Title
  doc.setFont("Courier", "bold");
  doc.setFontSize(14);
  doc.text("PT MICRODATA INDONESIA", margin, y);
  y += 5;
  doc.setFontSize(11);
  doc.text("MISSION TIMELINE TELEMETRY REPORT", margin, y);
  y += 10;

  // AI Parsing Protocol Header
  doc.setFont("Courier", "bold");
  doc.setFontSize(9);
  doc.text("==================================================", margin, y);
  y += 4.5;
  doc.text("DOCUMENT CONFIGURATION (AI PARSING PROTOCOL)", margin, y);
  y += 4.5;
  doc.text("- SCHEMA_VERSION: 1.0.0", margin, y);
  y += 4.5;
  doc.text("- KEY_VALUE_DELIMITER: \":\"", margin, y);
  y += 4.5;
  doc.text("- DAY_BLOCK_SELECTOR: \"[CYCLE XX]\"", margin, y);
  y += 4.5;
  doc.text("- FIELD_TAGS: DATE, STATUS, REPORTER, CONTENT, ATTACHMENTS", margin, y);
  y += 4.5;
  doc.text("==================================================", margin, y);
  y += 8;

  // General Metadata Block
  doc.setFont("Courier", "bold");
  doc.text("--- SYSTEM METADATA BLOCK ---", margin, y);
  y += 4.5;
  doc.setFont("Courier", "normal");

  const metadataLines = [
    `REPORT_TYPE: LOGBOOK_EXPORT`,
    `TARGET_PILOT_NAME: ${targetUser.name}`,
    `TARGET_PILOT_EMAIL: ${targetUser.email}`,
    `ORGANIZATION: PT Microdata Indonesia`,
    `EXPORT_TIMESTAMP: ${new Date().toISOString()}`,
    `LOGBOOK_PERIOD: 2026-06-15 TO 2026-07-24`,
    `RECORD_COUNT: ${logs.length}`,
  ];

  metadataLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4.5;
  });

  doc.setFont("Courier", "bold");
  doc.text("--- END SYSTEM METADATA BLOCK ---", margin, y);
  y += 10;

  // Separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Generate timeline dates from 2026-06-15 to 2026-07-24
  const kpDates: string[] = [];
  let current = toWIB("2026-06-15");
  const end = toWIB("2026-07-24");

  while (current.isBefore(end) || current.isSame(end, "day")) {
    kpDates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }

  // Iterate over each date
  kpDates.forEach((dateStr, idx) => {
    const log = logs.find((l) => l.date === dateStr);
    const d = toWIB(dateStr);
    const dayName = d.format("dddd").toUpperCase();
    const holidayName = holidays[dateStr];
    const isHoliday = !!holidayName;
    const isWeekend = d.day() === 0 || d.day() === 6;
    const isOffDuty = isWeekend || isHoliday;

    let statusStr = "ACTIVE";
    if (isHoliday) statusStr = `HOLIDAY (${holidayName.toUpperCase()})`;
    else if (isWeekend) statusStr = "REST DAY";

    // Ensure space for entry header
    checkPageBreak(25);

    doc.setFont("Courier", "bold");
    doc.setFontSize(10);
    doc.text(`[CYCLE ${String(idx + 1).padStart(2, "0")}] DATE: ${dateStr} (${dayName})`, margin, y);
    y += 5;

    doc.setFont("Courier", "normal");
    doc.setFontSize(9);
    doc.text(`STATUS: ${statusStr}`, margin, y);
    y += 4.5;
    doc.text(`REPORTER: ${log ? log.editor_name : "N/A"}`, margin, y);
    y += 6;

    // Log content
    if (log && log.content) {
      doc.setFont("Courier", "bold");
      doc.text("CONTENT:", margin, y);
      y += 4.5;

      doc.setFont("Courier", "normal");
      const wrappedText = doc.splitTextToSize(log.content, contentWidth);
      wrappedText.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 2;
    } else {
      doc.setFont("Courier", "italic");
      doc.text(isOffDuty ? "<< NO DUTY RECORDED >>" : "<< NO DATA SUBMITTED >>", margin, y);
      y += 5;
    }

    // Attachments
    if (log && log.media_url) {
      let attachments: any[] = [];
      try {
        attachments = JSON.parse(log.media_url);
      } catch (e) {}

      if (attachments && attachments.length > 0) {
        checkPageBreak(5 + attachments.length * 4.5);
        doc.setFont("Courier", "bold");
        doc.text("ATTACHMENTS:", margin, y);
        y += 4.5;

        doc.setFont("Courier", "normal");
        attachments.forEach((att: any) => {
          const name = att.name || "Packet";
          const mime = att.mimeType || "media";
          const link = att.webViewLink || att.url || "";
          const attText = `- ${name} [${mime}] -> ${link}`;
          const wrappedAtt = doc.splitTextToSize(attText, contentWidth);
          wrappedAtt.forEach((attLine: string) => {
            checkPageBreak(5);
            doc.text(attLine, margin, y);
            y += 4.5;
          });
        });
        y += 2;
      }
    }

    // Small separator line between cycles
    checkPageBreak(10);
    doc.setLineWidth(0.2);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  });

  // Save the document
  const fileName = `logbook-${targetUser.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
  doc.save(fileName);
}
