import { findBookingByPublicIdDoc } from '../repositories/bookingRepository.js';
import { getSettingsCollection } from '../config/firestoreCollections.js';
import { prepareVerifiedTicketData } from '../utils/ticketDataPreparer.js';
import { generateTicketPdfBuffer } from '../services/ticketPdfService.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * Controller to download a server-verified Ticket PDF.
 * Endpoint: GET /api/bookings/:bookingId/ticket.pdf
 *
 * Security Invariants:
 * 1. Resolves bookings ONLY by public human-readable bookingId (e.g. BK-YYYYMMDD-XXXX).
 *    Internal Firestore document IDs are NOT resolved through this route (returns 404).
 * 2. Authenticates requester identity via session / JWT token (401 if missing).
 * 3. Enforces customer ownership: customer can only download tickets for their own bookings (403 if mismatch).
 * 4. Fallback to session phone/email only occurs for legacy bookings lacking customerId.
 * 5. Authenticated admin is authorized to download any booking ticket.
 * 6. Stream/buffer generated in memory with zero local disk writes (Vercel Serverless ready).
 * 7. Zero database mutation.
 */
export const downloadBookingTicketPdf = async (req, res, next) => {
  try {
    const rawBookingId = req.params.bookingId || req.params.id;
    if (!rawBookingId || typeof rawBookingId !== 'string') {
      return sendError(res, 'Booking ID is required.', null, 400);
    }

    const cleanBookingId = rawBookingId.trim().toUpperCase();

    // 1. Authentication Check
    if (!req.customer && !req.admin) {
      return sendError(res, 'Authentication required to download ticket pass.', null, 401);
    }

    // 2. Resolve booking ONLY by public bookingId
    const booking = await findBookingByPublicIdDoc(cleanBookingId);
    if (!booking) {
      return sendError(res, `Booking not found with booking ID "${cleanBookingId}".`, null, 404);
    }

    // 3. Customer Ownership Authorization Check
    if (req.customer) {
      const authCustomerId = req.customer.id || req.customer._id || req.customer.customerId;
      const authPhone = req.customer.phone;
      const authEmail = req.customer.email;

      const bookingCustomerId = booking.customerId || (booking.customer && (booking.customer.id || booking.customer._id));
      const bookingPhone = booking.customerPhone || (booking.customer && booking.customer.phone) || booking.mobileNumber;
      const bookingEmail = booking.customerEmail || (booking.customer && booking.customer.email);

      let isOwner = false;

      if (bookingCustomerId) {
        // Canonical customerId ownership check
        isOwner = (String(bookingCustomerId) === String(authCustomerId));
      } else {
        // Legacy booking fallback: verify against authenticated customer session phone or email
        isOwner = Boolean(
          (authPhone && bookingPhone && String(bookingPhone) === String(authPhone)) ||
          (authEmail && bookingEmail && String(bookingEmail).toLowerCase() === String(authEmail).toLowerCase())
        );
      }

      if (!isOwner) {
        logger.warn(`[TicketPdfController] Unauthorized ticket download attempt for ${cleanBookingId} by customer ${authCustomerId}`);
        return sendError(res, 'Access denied. You can only download tickets for your own bookings.', null, 403);
      }
    }

    // 4. Fetch Venue / Business Settings (No fake defaults injected)
    let settings = {};
    try {
      const settingsSnap = await getSettingsCollection().doc('general').get();
      if (settingsSnap.exists) {
        settings = settingsSnap.data() || {};
      }
    } catch (e) {
      logger.warn('[TicketPdfController] Failed to load general settings, using default minimal configuration.');
    }

    // 5. Prepare verified, server-sanitized ticket data
    const ticketData = prepareVerifiedTicketData(booking, settings);

    // 6. Generate in-memory PDF binary buffer
    const pdfBuffer = await generateTicketPdfBuffer(ticketData);

    // 7. Sanitize filename and set HTTP response headers
    const safeFilename = `Elite-Pitch-Ticket-${ticketData.bookingId.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Length', pdfBuffer.length);

    logger.info(`[TicketPdfController] Streamed Ticket PDF for ${ticketData.bookingId} (${pdfBuffer.length} bytes) to ${req.admin ? 'admin' : 'customer'}`);

    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
