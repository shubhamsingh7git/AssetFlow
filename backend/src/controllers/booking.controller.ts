// ─── Booking Controller ─────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import bookingService from '../services/booking.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { createBookingSchema } from '../validators/common.validator';
import { parsePagination } from '../utils/pagination';
import { getParam } from '../utils/params';

class BookingController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const { data, total } = await bookingService.getAll(req.query);
      sendPaginated(res, data, total, page, limit);
    } catch (error) { next(error); }
  }

  async getSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceName, date } = req.query;
      if (!resourceName || !date) {
        res.status(400).json({ success: false, message: 'resourceName and date are required' });
        return;
      }
      const slots = await bookingService.getSlots(resourceName as string, date as string);
      sendSuccess(res, slots);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createBookingSchema.parse(req.body);
      const booking = await bookingService.create(data, req.user!.id);
      sendSuccess(res, booking, 'Booking confirmed', 201);
    } catch (error) { next(error); }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.approveBooking(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, booking, 'Booking approved');
    } catch (error) { next(error); }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.rejectBooking(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, booking, 'Booking rejected');
    } catch (error) { next(error); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.cancel(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, booking, 'Booking cancelled');
    } catch (error) { next(error); }
  }

  async getMyBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await bookingService.getMyBookings(req.user!.id);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }
}

export default new BookingController();
