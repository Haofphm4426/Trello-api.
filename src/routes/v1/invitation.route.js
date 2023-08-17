import express from 'express';
import { InvitationController } from '*/controllers/invitation.controller';
import { InvitationValidation } from '*/validations/invitation.validation';
import { AuthMiddleware } from '*/middlewares/auth.middleware';

const router = express.Router();

router
    .route('/board')
    .post(
        AuthMiddleware.isAuthorized,
        InvitationValidation.createNewBoardInvitation,
        InvitationController.createNewBoardInvitation
    );
router.route('/').get(AuthMiddleware.isAuthorized, InvitationController.getInvitation);
router.route('/:invitationId').put(AuthMiddleware.isAuthorized, InvitationController.updateBoardInvitation);

export const invitationRoutes = router;
