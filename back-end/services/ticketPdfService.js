import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger.js';

/**
 * Generates an in-memory PDF Buffer for an authenticated booking pass.
 * Pure in-memory streaming with ZERO local filesystem dependency (100% Vercel Serverless compatible).
 * Excludes sensitive secrets, internal database IDs, and all QR-related elements.
 * Strictly GST-free.
 *
 * @param {object} ticketData - Verified ticket data from prepareVerifiedTicketData
 * @returns {Promise<Buffer>} Generated PDF binary buffer
 */
export const generateTicketPdfBuffer = async (ticketData) => {
  return new Promise((resolve, reject) => {
    try {
      if (!ticketData || !ticketData.bookingId) {
        throw new Error('Invalid ticket data provided for PDF generation.');
      }

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Elite Pitch Ticket - ${ticketData.bookingId}`,
          Author: ticketData.venue?.businessName || 'Elite Pitch',
          Subject: 'Official Arena Booking Confirmation Pass'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => {
        logger.error(`[TicketPdfService] PDF stream error: ${err.message}`);
        reject(err);
      });

      const primaryColor = '#059669'; // Emerald 600
      const secondaryColor = '#0f172a'; // Slate 900
      const mutedColor = '#64748b'; // Slate 500
      const darkColor = '#1e293b'; // Slate 800
      const errorColor = '#dc2626'; // Red 600
      const lightBg = '#f8fafc'; // Slate 50

      const pageWidth = 595.28 - 80; // A4 width minus margins = ~515.28
      let y = 40;

      // =========================================================================
      // 1. HEADER SECTION
      // =========================================================================
      // Top header bar background
      doc.rect(40, y, pageWidth, 68)
        .fill(secondaryColor);

      // Business Name & Title
      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(ticketData.venue?.businessName || 'ELITE PITCH SPORTS ARENA', 55, y + 14);

      doc.fillColor('#34d399') // Emerald 400
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('OFFICIAL BOOKING CONFIRMATION & ARENA PASS', 55, y + 38);

      // Right-side Ticket Number & Issued Date
      doc.fillColor('#94a3b8')
        .font('Helvetica')
        .fontSize(8)
        .text('BOOKING REF / PASS ID', 360, y + 14, { width: 175, align: 'right' });

      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(ticketData.bookingId, 360, y + 26, { width: 175, align: 'right' });

      const issueDateStr = ticketData.metadata?.createdAt
        ? new Date(ticketData.metadata.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : new Date().toISOString().split('T')[0];

      doc.fillColor('#94a3b8')
        .font('Helvetica')
        .fontSize(8)
        .text(`Issued: ${issueDateStr}`, 360, y + 42, { width: 175, align: 'right' });

      y += 80;

      // =========================================================================
      // 2. CANCELLATION BANNER (IF CANCELLED)
      // =========================================================================
      if (ticketData.isCancelled) {
        doc.rect(40, y, pageWidth, 54)
          .fillAndStroke('#fef2f2', '#fecaca');

        doc.fillColor(errorColor)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('BOOKING CANCELLED BY ADMIN', 55, y + 10);

        const reasonText = ticketData.cancellation?.reason || 'This booking has been cancelled by arena management.';
        doc.fillColor('#991b1b')
          .font('Helvetica')
          .fontSize(9)
          .text(`Reason: ${reasonText}`, 55, y + 26, { width: pageWidth - 30 });

        y += 66;
      }

      // =========================================================================
      // 3. BOOKING SUMMARY & STATUS BADGE
      // =========================================================================
      const statusBg = ticketData.isCancelled
        ? '#fee2e2'
        : (ticketData.isConfirmed ? '#dcfce7' : '#fef9c3');
      const statusText = ticketData.isCancelled
        ? '#991b1b'
        : (ticketData.isConfirmed ? '#166534' : '#854d0e');

      doc.rect(40, y, pageWidth, 32)
        .fill(lightBg);

      doc.fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('RESERVATION STATUS', 55, y + 10);

      const statusLabel = ticketData.isCancelled
        ? 'CANCELLED'
        : (ticketData.isConfirmed ? 'CONFIRMED' : (ticketData.bookingStatus || 'PENDING').toUpperCase());

      // Status pill
      doc.rect(pageWidth - 75, y + 6, 95, 20)
        .fill(statusBg);

      doc.fillColor(statusText)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(statusLabel, pageWidth - 75, y + 11, { width: 95, align: 'center' });

      y += 42;

      // =========================================================================
      // 4. TWO-COLUMN GRID: CUSTOMER & MATCH RESERVATION DETAILS
      // =========================================================================
      const colWidth = (pageWidth - 16) / 2;

      // Left Column: Customer & Venue
      doc.rect(40, y, colWidth, 140)
        .fillAndStroke(lightBg, '#e2e8f0');

      doc.fillColor(secondaryColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('CUSTOMER & VENUE', 52, y + 12);

      let leftY = y + 30;

      // Customer Name
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('PLAYER NAME', 52, leftY);
      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9).text(ticketData.customer?.name || 'Valued Customer', 52, leftY + 10);
      leftY += 26;

      // Customer Phone / Email
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('CONTACT PHONE / EMAIL', 52, leftY);
      const contactInfo = [ticketData.customer?.phone, ticketData.customer?.email].filter(Boolean).join(' • ') || 'N/A';
      doc.fillColor(darkColor).font('Helvetica').fontSize(8.5).text(contactInfo, 52, leftY + 10, { width: colWidth - 24 });
      leftY += 26;

      // Venue Address & Arena Contacts (if configured in settings)
      if (ticketData.venue?.address || ticketData.venue?.phone) {
        doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('ARENA LOCATION', 52, leftY);
        const venueInfo = [ticketData.venue.address, ticketData.venue.phone].filter(Boolean).join(' • ');
        doc.fillColor(darkColor).font('Helvetica').fontSize(8).text(venueInfo, 52, leftY + 10, { width: colWidth - 24 });
      }

      // Right Column: Match & Timing Details
      const rightX = 40 + colWidth + 16;
      doc.rect(rightX, y, colWidth, 140)
        .fillAndStroke(lightBg, '#e2e8f0');

      doc.fillColor(secondaryColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('MATCH & SLOT DETAILS', rightX + 12, y + 12);

      let rightY = y + 30;

      // Sport / Arena
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('SPORT / TURF', rightX + 12, rightY);
      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9).text(ticketData.sport?.type || 'Football (FIFA-Grade Turf)', rightX + 12, rightY + 10);
      rightY += 26;

      // Date & Duration
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('SCHEDULED DATE & DURATION', rightX + 12, rightY);
      const slotCountStr = ticketData.schedule?.slotCount ? ` (${ticketData.schedule.slotCount} Hr${ticketData.schedule.slotCount > 1 ? 's' : ''})` : '';
      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9).text(`${ticketData.schedule?.date || 'N/A'}${slotCountStr}`, rightX + 12, rightY + 10);
      rightY += 26;

      // Time Slots
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('RESERVED TIME SLOTS', rightX + 12, rightY);
      const slotsStr = Array.isArray(ticketData.schedule?.timeSlots) && ticketData.schedule.timeSlots.length > 0
        ? ticketData.schedule.timeSlots.join(', ')
        : 'N/A';
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text(slotsStr, rightX + 12, rightY + 10, { width: colWidth - 24 });

      y += 152;

      // =========================================================================
      // 5. FINANCIAL BREAKDOWN & PAYMENT RECEIPT (STRICTLY GST-FREE)
      // =========================================================================
      doc.rect(40, y, pageWidth, 126)
        .fillAndStroke(lightBg, '#cbd5e1');

      doc.fillColor(secondaryColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('PAYMENT & FINANCIAL SUMMARY (GST-FREE)', 52, y + 12);

      const finY = y + 32;

      // Subtotal / Total
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('TOTAL AMOUNT', 52, finY);
      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(12).text(`₹${ticketData.pricing?.totalAmount || 0}`, 52, finY + 12);

      // Amount Paid
      const verifiedPaid = ticketData.payment?.isFullyPaid
        ? (ticketData.pricing?.totalAmount || 0)
        : (ticketData.pricing?.advancePaid || 0);

      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('AMOUNT PAID', 170, finY);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text(`₹${verifiedPaid}`, 170, finY + 12);

      // Balance Due
      const balDue = ticketData.isCancelled ? 0 : (ticketData.pricing?.balanceDue ?? 0);
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('BALANCE DUE', 290, finY);
      doc.fillColor(balDue > 0 ? '#b45309' : '#166534').font('Helvetica-Bold').fontSize(12).text(`₹${balDue}`, 290, finY + 12);

      // Payment Status
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('PAYMENT STATUS', 410, finY);
      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(10).text(ticketData.payment?.status || 'Pending', 410, finY + 12);

      // Divider line
      doc.moveTo(52, y + 72).lineTo(pageWidth + 28, y + 72).stroke('#e2e8f0');

      // Payment details sub-row
      const subFinY = y + 80;
      doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('Payment Method:', 52, subFinY);
      doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(8).text(ticketData.payment?.method || 'N/A', 125, subFinY);

      if (ticketData.payment?.paidAt) {
        doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text('Paid At:', 220, subFinY);
        const paidAtDate = new Date(ticketData.payment.paidAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        doc.fillColor(darkColor).font('Helvetica').fontSize(8).text(paidAtDate, 260, subFinY);
      }

      if (balDue > 0) {
        doc.fillColor('#b45309').font('Helvetica-Bold').fontSize(8).text('★ Balance payable at turf reception prior to kickoff', 52, subFinY + 18);
      } else {
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8).text('✓ Full payment verified and cleared', 52, subFinY + 18);
      }

      y += 138;

      // =========================================================================
      // 6. ARENA RULES & INSTRUCTIONS
      // =========================================================================
      const instructions = Array.isArray(ticketData.instructions) && ticketData.instructions.length > 0
        ? ticketData.instructions
        : [
            'Please report at the arena 15 minutes prior to your scheduled kickoff.',
            'Only flat rubber studs or appropriate turf shoes are permitted on the pitch.',
            'Cancellations are subject to the standard advance notice policy.',
            'If balance is due, please settle it at the arena reception prior to match entry.'
          ];

      doc.fillColor(secondaryColor)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('ARENA GUIDELINES & INSTRUCTIONS', 40, y);
      y += 16;

      instructions.slice(0, 5).forEach((inst, index) => {
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8).text(`${index + 1}.`, 40, y);
        doc.fillColor(mutedColor).font('Helvetica').fontSize(8).text(inst, 54, y, { width: pageWidth - 20 });
        y += 14;
      });

      // =========================================================================
      // 7. FOOTER
      // =========================================================================
      const footerY = 595.28 * 1.414 - 55; // Bottom of A4 page
      doc.rect(40, footerY - 10, pageWidth, 1).fill('#e2e8f0');

      doc.fillColor('#94a3b8')
        .font('Helvetica')
        .fontSize(7.5)
        .text('This is an authentic, server-verified digital booking pass. Generated securely by Elite Pitch.', 40, footerY, {
          width: pageWidth,
          align: 'center'
        });

      doc.end();
    } catch (err) {
      logger.error(`[TicketPdfService] PDF generation failed: ${err.message}`);
      reject(err);
    }
  });
};
