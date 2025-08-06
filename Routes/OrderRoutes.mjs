import express from 'express';
import * as orderController from '../Controllers/OrderController.mjs';

const router = express.Router();

router.post('/create', orderController.createOrder);
router.get('/user/:userId', orderController.getUserOrders);
router.get('/all', orderController.getAllOrders);
router.get('/client/:clientId', orderController.getClientOrders);
router.get('/details/:orderId', orderController.getOrderDetails);
router.put('/update/:orderId', orderController.updateOrderStatus);
router.post('/test-email', orderController.testEmail);
router.get('/client/:clientId/count', orderController.getClientOrderCount);
router.get('/user/:userId/count', orderController.getUserOrderCount);
router.get('/status/:orderId', orderController.getOrderStatus);

export default router;