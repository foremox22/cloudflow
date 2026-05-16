import nodemailer from "nodemailer";

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface RosterInviteEmailData {
  staffName: string;
  staffEmail: string;
  weekStart: Date;
  confirmUrl: string;
  shifts: { date: Date; startTime: string; endTime: string; position?: string }[];
}

export async function sendRosterInviteEmail(data: RosterInviteEmailData): Promise<void> {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your-email@gmail.com") return;

  const weekLabel = data.weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const shiftRows = data.shifts
    .map((s) => {
      const day = new Date(s.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#f9fafb">${escHtml(day)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#f9fafb">${escHtml(s.startTime)} – ${escHtml(s.endTime)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af">${escHtml(s.position ?? "")}</td>
      </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:sans-serif;background:#111827;color:#f9fafb;padding:32px;border-radius:12px;max-width:600px">
      <h2 style="color:#f97316;margin-top:0">Your Schedule — Week of ${escHtml(weekLabel)}</h2>
      <p>Hi ${escHtml(data.staffName)},</p>
      <p>Your roster for the week of <strong>${escHtml(weekLabel)}</strong> is ready. Please confirm your shifts below.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#1f2937">
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-weight:500">Day</th>
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-weight:500">Time</th>
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-weight:500">Position</th>
          </tr>
        </thead>
        <tbody>${shiftRows}</tbody>
      </table>
      <div style="margin-top:24px;text-align:center">
        <a href="${escHtml(data.confirmUrl)}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
          Confirm My Schedule
        </a>
      </div>
      <p style="margin-top:24px;color:#6b7280;font-size:12px">If you can't work a shift, click the button above and select "Can't work" for that day.</p>
      <p style="color:#6b7280;font-size:14px;margin-top:16px">Cloudflow Restaurant Management</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: data.staffEmail,
    subject: `Your Schedule — Week of ${weekLabel}`,
    html,
  });
}

export interface PoEmailData {
  supplierName: string;
  supplierEmail: string;
  poId: string;
  lineItems: { ingredientName: string; quantity: number; unit: string; unitPrice: number }[];
  notes?: string | null;
  expectedAt?: Date | null;
}

export async function sendPoApprovalEmail(data: PoEmailData): Promise<void> {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your-email@gmail.com") return;

  const rows = data.lineItems
    .map(
      (l) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #374151">${escHtml(l.ingredientName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #374151;text-align:right">${l.quantity} ${escHtml(l.unit)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #374151;text-align:right">£${l.unitPrice.toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #374151;text-align:right">£${(l.quantity * l.unitPrice).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const total = data.lineItems.reduce((s: number, l) => s + l.quantity * l.unitPrice, 0);

  const html = `
    <div style="font-family:sans-serif;background:#111827;color:#f9fafb;padding:32px;border-radius:12px;max-width:600px">
      <h2 style="color:#f97316;margin-top:0">Purchase Order</h2>
      <p>Dear ${escHtml(data.supplierName)},</p>
      <p>Please find below our purchase order <strong>#${escHtml(data.poId.slice(-8).toUpperCase())}</strong>.</p>
      ${data.expectedAt ? `<p>Expected delivery: <strong>${new Date(data.expectedAt).toLocaleDateString()}</strong></p>` : ""}
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#1f2937">
            <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-weight:500">Item</th>
            <th style="padding:10px 12px;text-align:right;color:#9ca3af;font-weight:500">Qty</th>
            <th style="padding:10px 12px;text-align:right;color:#9ca3af;font-weight:500">Unit Price</th>
            <th style="padding:10px 12px;text-align:right;color:#9ca3af;font-weight:500">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:10px 12px;text-align:right;font-weight:600">Order Total</td>
            <td style="padding:10px 12px;text-align:right;color:#f97316;font-weight:700">£${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      ${data.notes ? `<p style="margin-top:16px;color:#9ca3af">Notes: ${escHtml(data.notes)}</p>` : ""}
      <p style="margin-top:24px;color:#6b7280;font-size:14px">Cloudflow</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: data.supplierEmail,
    subject: `Purchase Order #${data.poId.slice(-8).toUpperCase()} — ${data.supplierName.replace(/[<>"]/g, "")}`,
    html,
  });
}
