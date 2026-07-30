// ─── Booking Routes ─────────────────────────────────────────────────────────
import { Router } from 'express';
import bookingController from '../controllers/booking.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// Employee: own bookings
router.get('/my-bookings', bookingController.getMyBookings);
router.get('/slots', bookingController.getSlots);
router.post('/', bookingController.create);
router.patch('/:id/cancel', bookingController.cancel);

// Admin: all bookings & approval/rejection
router.get('/', authorize('Administrator', 'Asset Manager'), bookingController.getAll);
router.patch('/:id/approve', authorize('Administrator', 'Asset Manager', 'Department Head'), bookingController.approve);
router.patch('/:id/reject', authorize('Administrator', 'Asset Manager', 'Department Head'), bookingController.reject);

export default router;
